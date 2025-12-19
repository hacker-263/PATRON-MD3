/**
 * MAIN.JS - Deobfuscated
 * Bot initialization, socket management, and connection handler
 * 
 * This file sets up the WhatsApp connection using Baileys library
 * and manages all connection events
 */

require('events').EventEmitter.defaultMaxListeners = 600;

const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Serve basic HTTP endpoint
app.get('/', (request, response) => {
  response.send('Bot is running!');
});

app.listen(port);

// Handle uncaught exceptions
process.once('uncaughtException', function(error) {
  const errorString = String(error || '');
  const ignoreErrors = [
    'ECONNRESET',
    'ENOTFOUND',
    'ETIMEDOUT',
    'EHOSTUNREACH',
    'ECONNREFUSED',
    'Value not found',
    'BAD_REQUEST',
    'Connection Closed',
    'Socket connection timeout',
    'Unexpected handshake error',
    'Error: read ECONNRESET'
  ];

  // Ignore common network errors
  if (!ignoreErrors.some(err => errorString.toUpperCase().includes(err.toUpperCase()))) {
    log('ERROR', '[Uncaught Exception] ' + (error?.message || errorString));
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  if (!String(reason).toUpperCase().includes('ECONNRESET')) {
    log('ERROR', '[Unhandled Rejection] ' + reason);
  }
});

// Suppress console noise
const originalLog = console.log;
const originalError = console.error;
const originalDebug = console.debug;
const originalStdout = process.stdout.write;
const originalStderr = process.stderr.write;

function isNoisyError(message) {
  if (typeof message !== 'string') return false;

  const noisyPatterns = [
    'Connection Closed',
    'Timed Out',
    'Socket connection timeout',
    'ENOTFOUND',
    'ETIMEDOUT',
    'MessageCounterError',
    'SessionCipher',
    'Bad MAC',
    'MessageCounterError: Key used already or never filled',
    'SessionCipher.doDecryptWhisperMessage',
    'unexpected handshake'
  ];

  return noisyPatterns.some(pattern =>
    message.toUpperCase().includes(pattern.toUpperCase())
  );
}

console.log = (...args) => {
  if (isNoisyError(args[0])) return;
  originalLog.apply(console, args);
};

console.error = (...args) => {
  if (isNoisyError(args[0])) return;
  originalError.apply(console, args);
};

console.debug = (...args) => {
  if (isNoisyError(args[0])) return;
  originalDebug.apply(console, args);
};

process.stdout.write = (chunk, encoding, callback) => {
  if (isNoisyError(chunk)) return true;
  return originalStdout.call(process.stdout, chunk, encoding, callback);
};

process.stderr.write = (chunk, encoding, callback) => {
  if (isNoisyError(chunk)) return true;
  return originalStderr.call(process.stderr, chunk, encoding, callback);
};

// Load update checker
require('./lib/update')();
require('./handler.js');

const chalk = require('chalk');

/**
 * Global logging utility
 */
global.log = function(type, message) {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = (now.getDate() + 1).toString().padStart(2, '0');
  const seconds = now.getFullYear().toString().slice(-2);
  const time = now.toLocaleTimeString('en-GB') + (' ' + hours + '-' + minutes + '-' + seconds);

  const typeColor = type.toUpperCase() === 'INFO' ? chalk.cyan(type) :
    type.toUpperCase() === 'ERROR' ? chalk.red(type) :
    type.toUpperCase() === 'WARN' ? chalk.yellow(type) :
    chalk.blue(type);

  console.log(typeColor + ' [' + time + ']:', chalk.white(message));
};

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  makeInMemoryStore,
  jidDecode,
  downloadContentFromMessage,
  delay,
  Browsers
} = require('@whiskeysockets/baileys');

const pino = require('pino');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { Boom } = require('@hapi/boom');
const yargs = require('yargs/yargs');
const NodeCache = require('node-cache');
const moment = require('moment-timezone');
const FileType = require('file-type');
const axios = require('axios');
const _ = require('lodash');
const PhoneNumber = require('awesome-phonenumber');
const DataBase = require('./lib/database');
const { delArrSave } = require('./lib/arrfunction.js');
const {
  smsg,
  imageToWebp,
  videoToWebp,
  writeExif,
  writeExifImg,
  writeExifVid,
  toAudio,
  toPTT,
  toVideo,
  getBuffer,
  getSizeMedia
} = require('./all/function.js');

const {
  getTime,
  tanggal,
  toRupiah,
  telegraPh,
  pinterest,
  ucapan,
  generateProfilePicture
} = require('./all/myfunc');

const { color } = require('./all/color');

// Create memory store
const store = makeInMemoryStore({
  logger: pino().child({ level: 'silent', stream: 'store' })
});

// Parse command line arguments
global.opts = new Object(yargs(process.argv.slice(2)).exitProcess(false).argv);

// Create group cache
const groupCache = new NodeCache({ stdTTL: 3600 });
const pkg = require('./package.json');

/**
 * Delete folder and its contents recursively
 */
const deleteFolderRecursive = function(folderPath) {
  if (fs.existsSync(folderPath)) {
    fs.readdirSync(folderPath).forEach((file) => {
      const curPath = path.join(folderPath, file);
      
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });

    fs.rmdirSync(folderPath);
  }
};

/**
 * Prompt user for input
 */
const question = (prompt) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((answer) => rl.question(prompt, answer));
};

/**
 * Main bot initialization function
 */
async function startBotz() {
  // Initialize authentication state
  const { state: authState, saveCreds: saveCreds } = await useMultiFileAuthState('./tmp/session');

  // Initialize database
  const database = new DataBase(process.env.DATABASE_URL);
  const loadedDbData = await database.loadData();

  // Set up global database object
  global.db = {
    reconnect: 0,
    loadedPlugins: false,
    groups: {},
    settings: {},
    database: {},
    sticker: {},
    warns: {},
    setsudo: [],
    disabled: [],
    ban: [],
    gcban: [],
    plugins: {},
    ...loadedDbData
  };

  // Create socket connection
  const socket = makeWASocket({
    auth: authState,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: Browsers.Edge('Windows'),
    version: [2, 3000, 15564262791]
  });

  // Bind store to socket events
  global.session = socket;
  store.bind(socket.ev);

  // Load connection handlers
  require('./all/connect/connection')(socket, store);
  require('./all/connect/messages')(socket, startBotz);
  require('./all/connect/creds')(socket, store, saveCreds);
  require('./all/connect/group')(socket);
  require('./handler.js')(socket);
  require('./all/connect/statusForward')(socket, store);
  require('./all/connect/statuslike')(socket, store);
  require('./all/connect/call')(socket, store);
  require('./all/connect/antidelete')(socket);

  // Save database every 10 seconds
  setInterval(async () => {
    try {
      await database.saveData(global.db);
    } catch (error) {
      log('ERROR', 'DB Save: ' + error.message);
    }
  }, 10000);

  // Clean temporary files every 30 seconds
  setInterval(() => {
    try {
      const tmpDir = path.join(__dirname, './tmp');
      const sessionDir = path.join(tmpDir, 'session');

      if (fs.existsSync(sessionDir)) {
        const files = fs.readdirSync(sessionDir);
        const filesToKeep = ['session', 'creds.json', 'app-state-sync-version.json', 'pre-key-1.json', 'arch.jpg'];

        for (const file of files) {
          if (!filesToKeep.includes(file) && file.endsWith('.json')) {
            try {
              fs.unlinkSync(path.join(sessionDir, file));
            } catch (e) {
              // Silently handle
            }
          }
        }
      }

      // Clean files in tmp folder
      const allFiles = fs.readdirSync(tmpDir);

      for (const file of allFiles) {
        if (!['session', 'creds.json', 'data.js', 'arch.jpg', 'helper'].includes(file)) {
          const filePath = path.join(tmpDir, file);

          try {
            const stats = fs.statSync(filePath);
            if (stats.isDirectory()) {
              fs.rmSync(filePath, { recursive: true, force: true });
            } else {
              fs.unlinkSync(filePath);
            }
          } catch (e) {
            // Silently handle
          }
        }
      }

      // Trigger garbage collection
      if (global.gc) global.gc();
    } catch (error) {
      // Silently handle
    }
  }, 30000 * 2);

  /**
   * Decode JID
   */
  socket.decodeJid = (jid) => {
    if (!jid) return jid;
    if (/:\d+@/gi.test(jid)) {
      let decoded = jidDecode(jid) || {};
      return decoded.user && decoded.server &&
        decoded.user + '@' + decoded.server || jid;
    } else return jid;
  };

  /**
   * Get contact name
   */
  socket.getName = (jid, isSimple = false) => {
    id = socket.decodeJid(jid);
    if (isSimple) return id;

    let name;

    if (id.endsWith('@g.us')) {
      return new Promise(async (resolve) => {
        name = store.contacts[id] || {};
        if (!(name.name || name.subject)) {
          name = await socket.groupMetadata(id) || {};
        }
        resolve(
          name.name ||
          name.subject ||
          PhoneNumber(
            '+' + id.replace('@s.whatsapp.net', '')
          ).getNumber('international')
        );
      });
    } else {
      name = id === socket.decodeJid(socket.user.id) ?
        socket.user :
        store.contacts[id] || {};

      return (
        isSimple ? '' : name.name
      ) ||
      name.subject ||
      name.verifiedName ||
      PhoneNumber(
        '+' + jid.replace(/[^0-9]/g, '')
      ).getNumber('international');
    }
  };

  /**
   * Send contact vcard
   */
  socket.sendContact = async (jid, contacts, quoted = '', title = '', sendOptions = {}) => {
    let vcard = [];

    for (let contact of contacts) {
      vcard.push({
        displayName: botname,
        vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${botname}\nORG:null\nTEL;waid=${contact}:${contact}\nitem1.X-ABLabel:Ponsel\nTITLE:\nEND:VCARD`
      });
    }

    socket.sendMessage(
      jid,
      {
        contacts: {
          displayName: vcard.length + ' contacts',
          contacts: vcard
        },
        ...sendOptions
      },
      { quoted: quoted }
    );
  };

  /**
   * Download media message
   */
  socket.downloadMediaMessage = async (message) => {
    let messageType = (message.msg || message).mtype || '';
    let mediaType = message.mimetype ? message.mimetype.split('/')[0] : messageType.replace('Message', '');
    const stream = await downloadContentFromMessage(message, mediaType);
    let buffer = Buffer.alloc(0);

    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk]);
    }

    return global.gc?.(), buffer;
  };

  /**
   * Send sticker from image
   */
  socket.sendImageAsSticker = async (jid, image, quoted, options = {}) => {
    let buffer = Buffer.isBuffer(image)
      ? image
      : /^data:.*?\/.*?;base64,/i.test(image)
      ? Buffer.from(image.split(',')[1], 'base64')
      : /^https?:\/\//.test(image)
      ? await await getBuffer(image)
      : fs.existsSync(image)
      ? fs.readFileSync(image)
      : Buffer.alloc(0);
    
    let stickerData;

    if (options && (options.packname || options.author)) {
      stickerData = await writeExifImg(buffer, options);
    } else {
      stickerData = await imageToWebp(buffer);
    }

    await socket.sendMessage(jid, { sticker: { url: stickerData }, ...options }, { quoted: quoted });
    buffer = null;
    stickerData = null;
    global.gc?.();
    return stickerData;
  };

  /**
   * Send sticker from video
   */
  socket.sendVideoAsSticker = async (jid, video, quoted, options = {}) => {
    let buffer = Buffer.isBuffer(video)
      ? video
      : /^data:.*?\/.*?;base64,/i.test(video)
      ? Buffer.from(video.split(',')[1], 'base64')
      : /^https?:\/\//.test(video)
      ? await await getBuffer(video)
      : fs.existsSync(video)
      ? fs.readFileSync(video)
      : Buffer.alloc(0);
    
    let stickerData;

    if (options && (options.packname || options.author)) {
      stickerData = await writeExifVid(buffer, options);
    } else {
      stickerData = await videoToWebp(buffer);
    }

    await socket.sendMessage(jid, { sticker: { url: stickerData }, ...options }, { quoted: quoted });
    buffer = null;
    stickerData = null;
    global.gc?.();
    return stickerData;
  };

  /**
   * Reply to message
   */
  socket.reply = (jid, text = '', quoted, options) => {
    return Buffer.isBuffer(text)
      ? socket.sendFile(jid, text, 'file', '', quoted, false, options)
      : socket.sendMessage(
        jid,
        { ...options, text: text },
        { quoted: quoted }
      );
  };

  /**
   * Send file (auto-detect type)
   */
  socket.sendFile = async (jid, path, filename, caption, quoted, isViewOnce = false, options = {}) => {
    let { ext: fileExtension, mime: fileMime, data: fileData } = await socket.getFile(path, true);
    let type = fileMime.split('/')[0];
    let mediaType = type.replace('application', 'document') || type;

    const fileOptions = { filename: filename };
    if (quoted) fileOptions.quoted = quoted;
    if (!path) options.asDocument = true;

    let messageType = '';
    let fileBuffer = fileData;
    let fileOutput;

    if (/webp/.test(fileMime) || /image/.test(fileMime) && options.asSticker) {
      messageType = 'sticker';
    } else if (
      /image/.test(fileMime) ||
      /webp/.test(fileMime) && options.asImage
    ) {
      messageType = 'image';
    } else if (/video/.test(fileMime)) {
      messageType = 'video';
    } else if (/audio/.test(fileMime)) {
      messageType = 'audio';
      fileOutput = isViewOnce ? await toPTT(fileBuffer, fileMime) : await toAudio(fileBuffer, fileMime);
      fileMime = 'audio/ogg; codecs=opus';
      fileBuffer = fileOutput.data;
      filename = fileOutput.filename;
    } else {
      messageType = 'document';
    }

    if (options.asDocument) messageType = 'document';

    let messageObject = {
      ...options,
      caption: caption,
      ptt: isViewOnce,
      [messageType]: { url: filename },
      mimetype: fileMime
    };

    let sentMessage;

    try {
      sentMessage = await socket.sendMessage(jid, messageObject, {
        ...fileOptions,
        ...options
      });
    } catch (error) {
      console.error(error);
      sentMessage = null;
    } finally {
      fileData = null;

      if (fs.existsSync(filename)) {
        try {
          await fs.promises.unlink(filename);
        } catch (error) {
          console.error('Failed to delete temp file:', error);
        }
      }

      return sentMessage;
    }

    if (!sentMessage) {
      sentMessage = await socket.sendMessage(jid, {
        ...messageObject,
        [messageType]: fileBuffer
      }, {
        ...fileOptions,
        ...options
      });
    }

    global.gc?.();
    return sentMessage;
  };

  /**
   * Get file (universal download)
   */
  socket.getFile = async (path, save) => {
    let response;
    let buffer = Buffer.isBuffer(path)
      ? path
      : /^data:.*?\/.*?;base64,/i.test(path)
      ? Buffer.from(path.split(',')[1], 'base64')
      : /^https?:\/\//.test(path)
      ? await (response = await getBuffer(path))
      : fs.existsSync(path)
      ? fs.readFileSync(path)
      : Buffer.alloc(0);

    let type = await FileType.fromBuffer(buffer) || { mime: 'application/octet-stream', ext: '.bin' };
    let filename = path.join(
      __dirname,
      './tmp/' + new Date() * 1 + '.' + type.ext
    );

    if (save) {
      fs.promises.writeFile(filename, buffer);
    }

    return {
      res: response,
      filename: filename,
      size: await getSizeMedia(buffer),
      ...type,
      data: buffer
    };
  };

  return socket;
}

/**
 * Start the bot
 */
async function startBot() {
  const sessionId = global.session;

  if (!sessionId) {
    log('ERROR', 'Session ID not found. Please add one in config.js');
    return;
  }

  if (!/^PATRON-MD~/.test(sessionId)) {
    log('ERROR', 'Invalid session ID. Please scan a new session from ' + global.scan);
    return;
  }

  const sessionPath = path.join(__dirname, './tmp/session');
  const credsPath = path.join(sessionPath, 'creds.json');

  if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath, { recursive: true });
  }

  if (!fs.existsSync(credsPath)) {
    let extractedId = sessionId.replace(/^PATRON-MD~/, '');

    try {
      const fetchUrl = `https://gist.githubusercontent.com/Itzpatron/${extractedId}/raw/session.json`;
      const { data: sessionData } = await axios.get(fetchUrl);
      const jsonData = typeof sessionData === 'string' ? sessionData : JSON.stringify(sessionData);

      await fs.writeFileSync(credsPath, jsonData);
      log('INFO', '✅ Session downloaded and saved.');
    } catch (error) {
      log('ERROR', '❌ Failed to fetch or save session');
      return;
    }
  } else {
    log('INFO', '✅ Using existing session creds.json');
  }

  // Close old session if exists
  if (global.ednut?.ev) {
    global.ednut.ev.removeAllListeners();
    global.session = null;
  }

  // Start new session
  await startBotz();
}

startBot();
