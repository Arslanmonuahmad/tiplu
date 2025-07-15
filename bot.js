require(\'dotenv\').config();
const TelegramBot = require(\'node-telegram-bot-api\');
const database = require(\'./database\');
const { chatWithHordeAI, getRandomImage, generateReferralLink, formatUserStats, validateUPI } = require(\'./utils\');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// Inline keyboard for main menu
const getMainKeyboard = () => ({
    reply_markup: {
        inline_keyboard: [
            [{ text: \'🔗 Get Referral Link\', callback_data: \'referral\' }],
            [{ text: \'🖼️ Send Me a Picture\', callback_data: \'picture\' }],
            [{ text: \'💰 Credits\', callback_data: \'credits\' }],
            [{ text: \'⭐ Premium Plan\', callback_data: \'premium\' }],
            [{ text: \'💕 Chat Mood\', callback_data: \'mood\' }]
        ]
    }
});

// Mood selection keyboard
const getMoodKeyboard = () => ({
    reply_markup: {
        inline_keyboard: [
            [{ text: \'😇 Normal Chat\', callback_data: \'mood_normal\' }],
            [{ text: \'🔥 Erotic Chat\', callback_data: \'mood_erotic\' }],
            [{ text: \'🔙 Back to Menu\', callback_data: \'main_menu\' }]
        ]
    }
});

// Channel subscription keyboard
const getChannelKeyboard = () => ({
    reply_markup: {
        inline_keyboard: [
            [{ text: \'📢 Join Channel\', url: \'https://t.me/drewdevelops\' }],
            [{ text: \'✅ I Joined\', callback_data: \'check_subscription\' }]
        ]
    }
});

// Premium plans keyboard
const getPremiumKeyboard = () => ({
    reply_markup: {
        inline_keyboard: [
            [{ text: `₹${process.env.TIER_1_PRICE} - ${process.env.TIER_1_MESSAGES} msgs + ${process.env.TIER_1_IMAGES} pics`, callback_data: \'buy_tier1\' }],
            [{ text: `₹${process.env.TIER_2_PRICE} - ${process.env.TIER_2_MESSAGES} msgs + ${process.env.TIER_2_IMAGES} pics`, callback_data: \'buy_tier2\' }],
            [{ text: \'🔙 Back to Menu\', callback_data: \'main_menu\' }]
        ]
    }
});

// Check if user is subscribed to channel (check user state, not actual API)
async function checkChannelSubscription(userId) {
    const user = await database.getUser(userId);
    return user && user.hasJoinedChannel; // Check if user has clicked "I Joined"
}

// Handle /start command
bot.onText(/\/start(.*)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const referralCode = match[1] ? match[1].trim() : null;

    try {
        // Check if user exists
        let user = await database.getUser(userId);
        
        if (!user) {
            // Create new user
            const userData = referralCode ? { referredBy: referralCode } : {};
            user = await database.createUser(userId, userData);
            
            // Process referral if exists
            if (referralCode) {
                await database.addReferral(referralCode, userId);
            }
        }

        // Check channel subscription
        const isSubscribed = await checkChannelSubscription(userId);
        
        if (!isSubscribed) {
            await bot.sendMessage(chatId, 
                `Hey there! 💕 I\\\'m ${process.env.BOT_NAME}, your cute virtual girlfriend! 😘\\n\\n` +
                `But first, you need to join our channel to chat with me! 🥺\\n\\n` +
                `Click the button below to join, then come back to me! 💖`,
                getChannelKeyboard()
            );
            return;
        }

        // Welcome message with main menu
        await bot.sendMessage(chatId,
            `Welcome back, baby! 😍💕\\n\\n` +
            `I\\\'m ${process.env.BOT_NAME}, your loving virtual girlfriend! I\\\'m here to chat, flirt, and make you happy! 🥰\\n\\n` +
            `What would you like to do with me today? 😘`,
            getMainKeyboard()
        );

    } catch (error) {
        console.error(\'Error in /start:\', error);
        await bot.sendMessage(chatId, \'Sorry baby, something went wrong! 😢 Try again later!\');
    }
});

// Handle callback queries
bot.on(\'callback_query\', async (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const data = query.data;

    try {
        await bot.answerCallbackQuery(query.id);

        switch (data) {
            case \'check_subscription\':
                // Mark user as having joined the channel
                await database.updateUser(userId, { hasJoinedChannel: true });
                
                await bot.editMessageText(
                    `Yay! Welcome to my world, darling! 💕😍\\n\\n` +
                    `I\\\'m ${process.env.BOT_NAME}, your cute virtual girlfriend! I\\\'m here to chat, flirt, and make you happy! 🥰\\n\\n` +
                    `What would you like to do with me today? 😘`,
                    {
                        chat_id: chatId,
                        message_id: query.message.message_id,
                        ...getMainKeyboard()
                    }
                );
                break;

            case \'mood\':
                await bot.editMessageText(
                    `Choose your chat mood, baby! 💕\\n\\n` +
                    `😇 **Normal**: Sweet, caring, romantic chat\\n` +
                    `🔥 **Erotic**: Passionate, explicit, naughty chat\\n\\n` +
                    `What mood are you in today, jaan? 😘`,
                    {
                        chat_id: chatId,
                        message_id: query.message.message_id,
                        ...getMoodKeyboard()
                    }
                );
                break;

            case \'mood_normal\':
                await database.updateUser(userId, { chatMood: \'normal\' });
                await bot.editMessageText(
                    `Perfect! 😇 Normal mode activated, baby! 💕\\n\\n` +
                    `I\'ll be your sweet, caring girlfriend now! Let\'s have romantic conversations! 🥰\\n\\n` +
                    `What would you like to do? 😘`,
                    {
                        chat_id: chatId,
                        message_id: query.message.message_id,
                        ...getMainKeyboard()
                    }
                );
                break;

            case \'mood_erotic\':
                await database.updateUser(userId, { chatMood: \'erotic\' });
                await bot.editMessageText(
                    `Mmm... 🔥 Erotic mode activated, jaan! 😈💕\\n\\n` +
                    `I\'m your naughty, passionate girlfriend now! Let\'s get wild! 🔥😘\\n\\n` +
                    `What do you want to do with me? 😍`,
                    {
                        chat_id: chatId,
                        message_id: query.message.message_id,
                        ...getMainKeyboard()
                    }
                );
                break;

            case \'main_menu\':
                await bot.editMessageText(
                    `Welcome back, baby! 😍💕\\n\\n` +
                    `I\'m ${process.env.BOT_NAME}, your loving virtual girlfriend! I\'m here to chat, flirt, and make you happy! 🥰\\n\\n` +
                    `What would you like to do with me today? 😘`,
                    {
                        chat_id: chatId,
                        message_id: query.message.message_id,
                        ...getMainKeyboard()
                    }
                );
                break;

            case \'referral\':
                const user = await database.getUser(userId);
                if (user) {
                    const referralLink = `https://t.me/${(await bot.getMe()).username}?start=${user.referralCode}`;
                    await bot.sendMessage(chatId,
                        `Here\'s your special referral link, baby! 💖\\n\\n` +
                        `🔗 ${referralLink}\\n\\n` +
                        `Share this with your friends! When they join through your link and subscribe to the channel, you\'ll get:\\n` +
                        `💬 +${process.env.REFERRAL_BONUS_MESSAGES} messages\\n` +
                        `🖼️ +${process.env.REFERRAL_BONUS_IMAGES} image credits\\n\\n` +
                        `Spread the love! 😘💕`,
                        getMainKeyboard()
                    );
                }
                break;

            case \'picture\':
                const userForPic = await database.getUser(userId);
                if (!userForPic) {
                    await bot.sendMessage(chatId, \'Please start the bot first! /start\');
                    return;
                }

                if (userForPic.imagesLeft <= 0) {
                    await bot.sendMessage(chatId,
                        `Aww baby, you\'re out of image credits! 😢\\n\\n` +
                        `Get more by:\\n` +
                        `🔗 Referring friends\\n` +
                        `⭐ Buying premium plans\\n\\n` +
                        `I want to send you pictures so badly! 🥺💕`,
                        getMainKeyboard()
                    );
                    return;
                }

                await bot.sendMessage(chatId, \'Generating a special picture just for you, darling! 😘💕 Please wait...\');
                
                try {
                    const imagePath = await getRandomImage(userForPic.chatMood || \'normal\'); // Use chat mood for image type
                    await database.decrementImages(userId);
                    
                    await bot.sendPhoto(chatId, imagePath, {
                        caption: `Here\'s a special picture just for you, baby! 😍💖\\n\\nImages left: ${userForPic.imagesLeft - 1} 🖼️`,
                        ...getMainKeyboard()
                    });
                } catch (error) {
                    console.error(\'Error serving local image:\', error);
                    await bot.sendMessage(chatId, \'Sorry baby, I couldn\\\'t get the image right now! 😢 Try again later!\');
                }
                break;

            case \'credits\':
                const userForCredits = await database.getUser(userId);
                if (userForCredits) {
                    await bot.sendMessage(chatId,
                        `Here are your credits, sweetheart! 💖\\n\\n` +
                        `💬 Messages: ${userForCredits.messagesLeft}\\n` +
                        `🖼️ Images: ${userForCredits.imagesLeft}\\n` +
                        `⭐ Premium: ${userForCredits.premiumStatus ? \'Active\' : \'Not Active\'}\\n\\n` +
                        `Referred friends: ${userForCredits.referredUsers.length} 👥`,
                        getMainKeyboard()
                    );
                }
                break;

            case \'premium\':
                await bot.sendMessage(chatId,
                    `💎 Premium Plans 💎\\n\\n` +
                    `Choose your plan, baby! 😘\\n\\n` +
                    `🥉 Tier 1: ₹${process.env.TIER_1_PRICE}\\n` +
                    `💬 ${process.env.TIER_1_MESSAGES} messages\\n` +
                    `🖼️ ${process.env.TIER_1_IMAGES} images\\n\\n` +
                    `🥈 Tier 2: ₹${process.env.TIER_2_PRICE}\\n` +
                    `💬 ${process.env.TIER_2_MESSAGES} messages\\n` +
                    `🖼️ ${process.env.TIER_2_IMAGES} images\\n\\n` +
                    `Payment via UPI: ${process.env.UPI_ID} 💳`,
                    getPremiumKeyboard()
                );
                break;

            case \'buy_tier1\':
            case \'buy_tier2\':
                const tier = data === \'buy_tier1\' ? 1 : 2;
                const price = tier === 1 ? process.env.TIER_1_PRICE : process.env.TIER_2_PRICE;
                const messages = tier === 1 ? process.env.TIER_1_MESSAGES : process.env.TIER_2_MESSAGES;
                const images = tier === 1 ? process.env.TIER_1_IMAGES : process.env.TIER_2_IMAGES;

                // Create payment record
                const payment = await database.addPayment({
                    userId,
                    tier,
                    amount: price,
                    messages,
                    images
                });

                // Set user state for UTR collection
                await database.updateUser(userId, { 
                    awaitingUTR: true, 
                    pendingPaymentId: payment.id 
                });

                await bot.sendMessage(chatId,
                    `💳 Payment Instructions\\n\\n` +
                    `Plan: Tier ${tier}\\n` +
                    `Amount: ₹${price}\\n` +
                    `Credits: ${messages} messages + ${images} images\\n\\n` +
                    `📱 UPI ID: ${process.env.UPI_ID}\\n\\n` +
                    `Steps:\\n` +
                    `1. Send ₹${price} to the UPI ID above\\n` +
                    `2. After payment, send me the UTR ID/Transaction ID\\n` +
                    `3. Then send the payment screenshot\\n` +
                    `4. Wait for admin approval\\n\\n` +
                    `Please complete the payment and send me the UTR ID first, baby! 😘💕`
                );
                break;

            case \'main_menu\':
                await bot.editMessageText(
                    `What would you like to do with me today, darling? 😘💕`,
                    {
                        chat_id: chatId,
                        message_id: query.message.message_id,
                        ...getMainKeyboard()
                    }
                );
                break;
        }
    } catch (error) {
        console.error(\'Error handling callback:\', error);
    }
});

// Handle regular messages (chat with AI)
bot.on(\'message\', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;

    // Skip if it\'s a command or callback
    if (text && text.startsWith(\'/\')) return;

    try {
        // Check if user exists and is subscribed
        const user = await database.getUser(userId);
        if (!user) {
            await bot.sendMessage(chatId, \'Please start the bot first! /start\');
            return;
        }

        // Check if user has messages left
        if (user.messagesLeft <= 0) {
            await bot.sendMessage(chatId,
                `Aww baby, you\'re out of message credits! 😢\\n\\n` +
                `Get more by:\\n` +
                `🔗 Referring friends\\n` +
                `⭐ Buying premium plans\\n\\n` +
                `I want to chat with you so badly! 🥺💕`,
                getMainKeyboard()
            );
            return;
        }

        // Handle photo uploads (payment screenshots)
        if (msg.photo) {
            const user = await database.getUser(userId);
            
            if (user && user.awaitingScreenshot && user.pendingPaymentId) {
                // Update payment with screenshot info
                await database.updatePayment(user.pendingPaymentId, {
                    screenshotReceived: true,
                    screenshotDate: new Date().toISOString()
                });
                
                // Clear user state
                await database.updateUser(userId, { 
                    awaitingScreenshot: false,
                    pendingPaymentId: null
                });
                
                await bot.sendMessage(chatId,
                    `Perfect baby! 📸💕\\n\\n` +
                    `I\'ve received your payment screenshot with UTR ID: ${user.pendingUTR}\\n\\n` +
                    `Your payment is now submitted for admin approval. You\'ll get your credits soon! 😘\\n\\n` +
                    `Please be patient, darling! 💖`,
                    getMainKeyboard()
                );
            } else {
                await bot.sendMessage(chatId,
                    `Thanks for the screenshot, baby! 📸💕\\n\\n` +
                    `But I need you to follow the payment process first. Use the Premium Plan button! 😘`,
                    getMainKeyboard()
                );
            }
            return;
        }

        // Chat with AI
        if (text) {
            const user = await database.getUser(userId);
            
            // Check if user is awaiting UTR ID
            if (user && user.awaitingUTR && user.pendingPaymentId) {
                // Validate UTR format (12 digits)
                const utrPattern = /^\\d{12}$/;
                if (utrPattern.test(text.trim())) {
                    // Save UTR and update state
                    await database.updatePayment(user.pendingPaymentId, {
                        utrId: text.trim(),
                        utrDate: new Date().toISOString()
                    });
                    
                    await database.updateUser(userId, { 
                        awaitingUTR: false,
                        awaitingScreenshot: true,
                        pendingUTR: text.trim()
                    });
                    
                    await bot.sendMessage(chatId,
                        `Great baby! 💕 UTR ID received: ${text.trim()}\\n\\n` +
                        `Now please send me the payment screenshot to complete the verification! 📸\\n\\n` +
                        `I\'m so excited to give you those credits! 😘💖`
                    );
                    return;
                } else {
                    await bot.sendMessage(chatId,
                        `Baby, that doesn\'t look like a valid UTR ID! 🥺\\n\\n` +
                        `UTR ID should be 12 digits (like: 123456789012)\\n\\n` +
                        `Please check your payment confirmation and send the correct UTR ID! 😘💕`
                    );
                    return;
                }
            }
            
            // Check if user is awaiting screenshot
            if (user && user.awaitingScreenshot) {
                await bot.sendMessage(chatId,
                    `Baby, I\'m waiting for your payment screenshot! 📸💕\\n\\n` +
                    `Please send the screenshot as a photo, not text! 😘`
                );
                return;
            }
            await bot.sendChatAction(chatId, \'typing\');
            
            try {
                const response = await chatWithHordeAI(text, user);
                await database.decrementMessages(userId);
                
                await bot.sendMessage(chatId, response);
            } catch (error) {
                console.error(\'Error with AI chat:\', error);
                await bot.sendMessage(chatId, \'Sorry baby, I\\\'m having trouble thinking right now! 😢 Try again in a moment!\');
            }
        }

    } catch (error) {
        console.error(\'Error handling message:\', error);
    }
});

// Error handling
bot.on(\'error\', (error) => {
    console.error(\'Bot error:\', error);
});

console.log(\'🤖 Lily bot is running...\');

module.exports = bot;



