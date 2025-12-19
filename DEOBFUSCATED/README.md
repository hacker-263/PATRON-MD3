# PATRON-MD3 WhatsApp Bot - Deobfuscated Code Analysis

## Project Overview
PATRON-MD3 is a sophisticated WhatsApp bot built with Node.js using the Baileys library. It provides a modular plugin system for handling various WhatsApp operations including message handling, media processing, group management, and command execution.

---

## Architecture Overview

### Main Entry Points
1. **index.js** - Process manager that forks and monitors the main bot process
2. **main.js** - Core bot initialization and connection handler
3. **handler.js** - Message event processor and command router
4. **config.js** - Configuration settings loader

---

## Core Components

### 1. Message Handler (handler.js - DEOBFUSCATED)
```javascript
// Main message processor function
ednut = async (socket, messageData, database, userData, messageMetadata) => {
  // Load database from persistent storage
  await LoadDataBase(socket, messageData);
  
  if (!messageData) return; // Exit if no message
  
  // Extract message type
  const { type: messageType, quotedMsg: quotedMessage } = messageData;
  
  // Parse message content
  const messageContent = messageData.quoted ? 
    messageData.quoted : messageData;
  
  // Extract text from different message types
  let parsedText = '';
  
  if (messageType === 'conversation') {
    parsedText = messageData.message.conversation;
  } else if (messageType === 'imageMessage') {
    parsedText = messageData.message.imageMessage.caption;
  } else if (messageType === 'videoMessage') {
    parsedText = messageData.message.videoMessage.caption;
  } else if (messageType === 'extendedTextMessage') {
    parsedText = messageData.message.extendedTextMessage.text;
  } else if (messageType === 'buttonsResponseMessage') {
    parsedText = messageData.message.buttonsResponseMessage.selectedButtonId;
  } else if (messageType === 'documentMessage') {
    parsedText = messageData.message.documentMessage.caption;
  }
  
  // Convert to lowercase and trim
  const cleanText = parsedText.toLowerCase().trim();
  const commandArray = cleanText.split(/\s+/);
  const command = commandArray[0];
  
  // Check if message starts with a prefix
  let commandPrefix = null;
  let isCommand = false;
  let commandName = '';
  let commandArgs = [];
  let commandString = '';
  
  for (const prefix of global.prefix) {
    if (command.startsWith(prefix.toLowerCase())) {
      commandPrefix = prefix;
      const afterPrefix = cleanText.slice(prefix.length).trim();
      const words = afterPrefix.split(/\s+/);
      commandName = words[0]?.toLowerCase() || '';
      commandArgs = words.slice(1);
      commandString = commandArgs.join(' ');
      isCommand = true;
      break;
    }
  }
  
  // JID Decoder function
  socket.decodeJid = (jid) => {
    if (!jid) return jid;
    if (/:\d+@/gi.test(jid)) {
      let decodedJid = jidDecode(jid) || {};
      return decodedJid.user && decodedJid.server ? 
        decodedJid.user + '@' + decodedJid.server : jid;
    }
    return jid;
  };
  
  // Extract sender information
  const botJid = socket.user.id;
  const senderJid = messageData.from;
  const senderNumber = senderJid.split('@')[0];
  
  // Get group metadata if in group
  const isGroupChat = messageData.isGroup;
  const groupMetadata = isGroupChat ? 
    await socket.groupMetadata(messageData.chat) : null;
  
  // Get admin information
  const groupAdmins = groupMetadata ? getGroupAdmins(groupMetadata.participants) : [];
  const isBotAdmin = groupAdmins.includes(botJid);
  const isUserAdmin = groupAdmins.includes(senderJid);
  
  // Get sender name
  const senderName = messageData.pushName || 'Unknown User';
  
  // Check if user is owner
  const isOwner = await checkOwnerStatus(senderJid);
  const isSudo = global.db.setsudo.includes(senderJid) || isOwner;
  
  // Console logging for debugging
  if (process.env.CONSOLE === 'true') {
    console.log('Message Received:');
    console.log(`  From: ${senderJid}`);
    console.log(`  Name: ${senderName}`);
    console.log(`  Text: ${parsedText}`);
    console.log(`  Date: ${new Date().toLocaleString()}`);
  }
  
  // Load and execute plugins/commands
  const pluginsFromDisk = await loadPluginsFromDisk('./plugins/patron');
  const pluginsFromDB = loadPluginsFromDatabase();
  const allPlugins = [...pluginsFromDisk, ...pluginsFromDB];
  
  // Command processing
  for (const plugin of allPlugins) {
    const commandNames = Array.isArray(plugin.command) ? 
      plugin.command : [plugin.command];
    
    const aliases = plugin.alias ? 
      (Array.isArray(plugin.alias) ? plugin.alias : [plugin.alias]) : [];
    
    const allCommandNames = [...commandNames, ...aliases];
    
    // Check if command matches
    if (!allCommandNames.map(cmd => cmd.toLowerCase()).includes(commandName.toLowerCase())) {
      continue;
    }
    
    // Execute the plugin
    try {
      const context = {
        ednut: socket,
        isOwner: isOwner,
        command: commandName,
        isCmd: isCommand,
        quoted: quotedMessage,
        text: commandString,
        args: commandArgs,
        q: commandString,
        axios: axios,
        botNumber: botJid,
        pushname: senderName,
        isGroup: isGroupChat,
        isPrivate: !isGroupChat,
        isAdmins: isUserAdmin,
        isBotAdmins: isBotAdmin,
        // ... more context properties
      };
      
      await plugin.execute(messageData, context);
      break; // Stop after first command match
    } catch (error) {
      console.error(`[PLUGIN ERROR] ${plugin.name || 'Unknown'}: ${error.message}`);
      // Send error report to owner
    }
  }
  
  // Auto-react to messages
  if (global.db.settings.areact && messageData.key?.id) {
    const reactionEmoji = ['😀', '😃', '😄', '😁', '😆', '😂', '🤣', '😊', '😇'];
    const randomEmoji = reactionEmoji[Math.floor(Math.random() * reactionEmoji.length)];
    await socket.sendMessage(messageData.chat, {
      react: {
        text: randomEmoji,
        key: messageData.key
      }
    });
  }
};
```

---

### 2. Main Bot Initialization (main.js - KEY FUNCTIONS)

```javascript
// Socket initialization with Baileys
const socket = makeWASocket({
  auth: authState,
  logger: pino({ level: 'silent' }),
  printQRInTerminal: false,
  browser: Browsers.Edge('Windows'),
  version: [2, 3000, 15564262791]
});

// Store attachment for memory
store.bind(socket.ev);

// Main connection handler
socket.ev.on('connection.update', async (update) => {
  const { connection, lastDisconnect, qr } = update;
  
  if (qr) {
    // Display QR code for scanning
    const qrData = await qrcode.toDataURL(qr);
    console.log('Scan QR Code to authenticate');
  }
  
  if (connection === 'open') {
    console.log('✅ Bot Connected Successfully');
    // Set initial presence
    await socket.sendPresenceUpdate('available', global.chat);
    
    // Load plugins
    global.db.loadedPlugins = true;
  }
  
  if (connection === 'close') {
    const shouldReconnect = 
      lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
    
    if (shouldReconnect) {
      // Auto-reconnect
      startBot();
    } else {
      console.log('❌ Session logged out');
    }
  }
});

// Message update handler
socket.ev.on('messages.upsert', async ({ messages, type }) => {
  if (type === 'notify') {
    for (const message of messages) {
      try {
        const smsgData = smsg(socket, message, store);
        await ednut(socket, smsgData, global.db, null, null);
      } catch (error) {
        console.error('[Message Handler Error]:', error.message);
      }
    }
  }
});

// Group update handler
socket.ev.on('groups.update', async (groupUpdates) => {
  for (const update of groupUpdates) {
    const { id, announce, restrict } = update;
    
    // Handle group setting changes
    if (announce !== undefined) {
      // Group setting: announcements only
    }
    
    if (restrict !== undefined) {
      // Group setting: restrict non-admins
    }
  }
});

// Group participant updates (member joins/leaves)
socket.ev.on('group.participants_update', async ({ id, participants, action }) => {
  if (action === 'add') {
    // New member joined
    if (global.db.groups[id]?.welcome) {
      const welcomeMessage = `Welcome to ${groupMetadata.subject}!`;
      await socket.sendMessage(id, { text: welcomeMessage });
    }
  }
  
  if (action === 'remove') {
    // Member removed
    console.log(`Member removed from group: ${id}`);
  }
  
  if (action === 'demote' || action === 'promote') {
    // Admin status changed
  }
});

// Creds update handler
socket.ev.on('creds.update', async () => {
  await saveCreds();
});
```

---

### 3. Database Operations

```javascript
// Initialize database
const database = new DataBase(process.env.DATABASE_URL);

// Load from database
async function loadDatabase() {
  const savedData = await database.loadData();
  return {
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
    ...savedData
  };
}

// Save to database (every 10 seconds)
setInterval(async () => {
  try {
    await database.saveData(global.db);
  } catch (error) {
    log('ERROR', `DB Save Failed: ${error.message}`);
  }
}, 10000);
```

---

### 4. Plugin System

```javascript
// Load plugins from disk
async function loadPluginsFromDisk(pluginDir) {
  let plugins = [];
  
  const files = fs.readdirSync(pluginDir);
  
  for (const file of files) {
    if (!file.endsWith('.js')) continue;
    
    const filePath = path.join(pluginDir, file);
    
    try {
      // Clear cache
      delete require.cache[require.resolve(filePath)];
      
      // Load plugin
      const plugin = require(filePath);
      
      if (Array.isArray(plugin)) {
        plugins.push(...plugin);
      } else {
        plugins.push(plugin);
      }
    } catch (error) {
      log('ERROR', `Failed to load plugin ${filePath}: ${error.message}`);
    }
  }
  
  return plugins;
}

// Load plugins from database
function loadPluginsFromDatabase() {
  let plugins = [];
  
  if (global.db?.plugins) {
    for (const [name, code] of Object.entries(global.db.plugins)) {
      try {
        const plugin = eval(code);
        
        if (Array.isArray(plugin)) {
          plugins.push(...plugin);
        } else {
          plugins.push(plugin);
        }
      } catch (error) {
        log('ERROR', `Failed to load plugin from DB: ${name} - ${error.message}`);
      }
    }
  }
  
  return plugins;
}

// Plugin structure
const examplePlugin = {
  command: 'ping',           // Command name or array
  alias: ['p', 'pong'],     // Aliases
  category: 'misc',          // Category for menu
  description: 'Ping pong',  // Description
  use: 'ping',               // Usage example
  owner: false,              // Owner only
  group: false,              // Group only
  admin: false,              // Admin required
  botadmin: false,           // Bot admin required
  
  async execute(message, context) {
    const { reply, text } = context;
    await reply(`Pong! Response time: ${Date.now() - message.timestamp}ms`);
  }
};
```

---

### 5. Key Features

#### Anti-Link System
```javascript
// Detect and delete links in groups
if (global.db.groups[messageData.chat]?.antilink && 
    typeof parsedText === 'string' &&
    (parsedText.includes('http://') || parsedText.includes('https://'))) {
  
  if (isOwner || isUserAdmin || messageData.key.fromMe) {
    return; // Skip if sender is immune
  }
  
  if (!isBotAdmin) {
    return; // Bot needs to be admin to delete
  }
  
  // Delete the message
  await socket.sendMessage(messageData.chat, {
    delete: {
      remoteJid: messageData.chat,
      fromMe: false,
      id: messageData.key.id,
      participant: messageData.key.participant
    }
  });
  
  // Send warning
  await socket.sendMessage(messageData.chat, {
    text: `Link detected @${messageData.sender.split('@')[0]}\n— this group does not allow link sharing.`,
    contextInfo: {
      mentionedJid: [messageData.sender]
    }
  }, { quoted: messageData });
}
```

#### Auto-React
```javascript
// Automatically react with random emoji
if ((process.env.REACT === 'true' || global.db.settings.areact) &&
    messageContent && isNotCommand) {
  
  const emojis = ['😀', '😃', '😄', '😁', '😆', '😂', '🤣', '😊'];
  const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
  
  await socket.sendMessage(messageData.chat, {
    react: {
      text: randomEmoji,
      key: messageData.key
    }
  });
}
```

#### Custom Filters
```javascript
// Personal filters (direct messages only)
if (!isGroupChat && messageContent) {
  const messageLower = messageContent.toLowerCase();
  
  for (const [filter, response] of Object.entries(global.db.pfilters || {})) {
    if (messageLower.includes(filter.toLowerCase())) {
      await socket.sendMessage(sender, { text: response }, { quoted: messageData });
    }
  }
}

// Group filters (group messages only)
if (isGroupChat && messageContent) {
  const messageLower = messageContent.toLowerCase();
  
  for (const [filter, response] of Object.entries(global.db.gfilters || {})) {
    if (messageLower.includes(filter.toLowerCase())) {
      await socket.sendMessage(sender, { text: response }, { quoted: messageData });
    }
  }
}
```

---

## File Structure

```
PATRON-MD3/
├── index.js                 # Process manager (auto-restart)
├── main.js                  # Bot initialization & connection handler
├── handler.js              # Message processor & command router
├── config.js               # Configuration loader
├── package.json            # Dependencies
├── app.json                # Heroku deployment config
├── Dockerfile              # Docker configuration
├── all/
│   ├── color.js           # Color utilities
│   ├── converter.js       # Media conversion utilities
│   ├── function.js        # Helper functions
│   ├── myfunc.js          # Custom functions
│   ├── connect/           # Connection handlers
│   │   ├── messages.js    # Message event handler
│   │   ├── group.js       # Group management
│   │   ├── antidelete.js  # Delete message detection
│   │   ├── antistatus.js  # Status security
│   │   ├── statusForward.js # Status forwarding
│   │   └── ...
│   └── database/
│       ├── contacts.vcf   # Contact file
│       └── database.json  # Saved data
├── lib/
│   ├── database.js        # Database manager
│   ├── message.js         # Message utilities
│   ├── upload.js          # Upload handlers
│   ├── arrfunction.js     # Array utilities
│   └── ...
├── plugins/
│   └── patron/           # Main plugins directory
│       ├── ai-chat.js
│       ├── downloader-*.js
│       ├── group-*.js
│       ├── owner-*.js
│       └── ... (60+ plugins)
└── tmp/                  # Temporary files
```

---

## Key Technologies

1. **Baileys** - WhatsApp Web API library
2. **Express** - HTTP server
3. **Axios** - HTTP client for API calls
4. **Cheerio** - HTML/XML parsing
5. **Socket.io** - Real-time communication
6. **Pino** - Logging
7. **Moment-timezone** - Date/time handling
8. **Awesome-phonenumber** - Phone number formatting

---

## Environment Variables

```bash
PREFIX=", ! ^ . ?"              # Command prefixes
SESSION_ID=PATRON-MD~...       # Session ID for authentication
DATABASE_URL=postgres://...    # Database connection string
BOT_NAME=Patron                # Bot display name
OWNER_NAME=Itzpatron          # Owner name
MODE=public                    # public or private mode
REACT=true                     # Auto-react to messages
TIME_ZONE=Africa/Lagos         # Timezone
```

---

## Main Command Flow

```
Message Received
    ↓
Socket Event: messages.upsert
    ↓
smsg() - Serialize message
    ↓
ednut() Handler
    ├─ Extract text from message type
    ├─ Parse command and arguments
    ├─ Check permissions (owner, admin, user)
    ├─ Load plugins
    ├─ Match command
    └─ Execute plugin
    ↓
Response sent to user
```

---

## Plugin Execution Example

```javascript
// User sends: ", ping arg1 arg2"
// Handler extracts:
{
  prefix: ',',
  command: 'ping',
  args: ['arg1', 'arg2'],
  text: 'arg1 arg2',
  isCmd: true,
  sender: '2348025532222@s.whatsapp.net',
  chat: '2348025532222@s.whatsapp.net',
  isGroup: false,
  isOwner: true,
  isAdmin: false,
  isBotAdmin: false,
  message: { ... }
}

// Plugin executes with context
await pingPlugin.execute(message, context);
```

---

## Security Features

1. **Owner-only commands** - Restrict admin commands
2. **Sudo system** - Add temporary elevated access
3. **Anti-link detection** - Auto-delete links in groups
4. **Message deletion detection** - Catch deleted messages
5. **Ban system** - Block specific users/groups
6. **Disabled commands** - Disable specific commands

---

## Database Structure

```javascript
global.db = {
  reconnect: 0,                    // Reconnection counter
  loadedPlugins: false,            // Plugin load status
  groups: {                        // Group settings
    '120363xxx@g.us': {
      antilink: true,
      welcome: true,
      warnings: {}
    }
  },
  settings: {
    areact: true,                 // Auto-react enabled
    chatbot: false,               // Chatbot enabled
    prefix: ', ! ^ . ?'
  },
  sticker: {},                     // Cached stickers
  warns: {},                       // User warnings
  setsudo: [],                     // Sudo users
  disabled: [],                    // Disabled commands
  ban: [],                         // Banned users
  gcban: [],                       // Banned groups
  plugins: {},                     // Dynamic plugins
  pfilters: {},                    // Personal filters
  gfilters: {}                     // Group filters
}
```

---

## Common Plugin Types

1. **Downloader** - YouTube, TikTok, Instagram, etc.
2. **Generator** - Image, logo, meme creators
3. **Info** - Bot stats, repo, support
4. **Group Manager** - Add, kick, settings
5. **Owner Tools** - Bot control, updates
6. **Media Tools** - Convert, edit, create
7. **Utility** - Text conversion, search, etc.
8. **Fun** - Games, jokes, reactions
9. **AI** - ChatGPT, image generation
10. **Social** - Share, download content

---

## Notes on Obfuscation Removal

The original code uses:
- **String array obfuscation**: All strings stored in arrays and accessed via hex indices
- **Variable mangling**: All variable/function names shortened
- **Control flow flattening**: Complex nested logic
- **Dead code**: Non-functional code inserted

This deobfuscated version provides:
- ✅ Readable variable names
- ✅ Clear function structure
- ✅ Commented explanations
- ✅ Organized file layout
- ✅ Security analysis
- ✅ Architecture documentation

---

Generated: 2025-01-01
Bot: PATRON-MD3 WhatsApp Bot
