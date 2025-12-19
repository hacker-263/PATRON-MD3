# PATRON-MD3 - Detailed Code Structure & Architecture

## Quick Reference

### File Tree
```
PATRON-MD3/
├── index.js                 # Process forking & auto-restart
├── main.js                  # Bot initialization
├── handler.js              # Message handler & command router
├── config.js               # Configuration
├── package.json
├── all/
│   ├── color.js           # Chalk color utilities
│   ├── converter.js       # Media conversion
│   ├── function.js        # Utility functions
│   ├── myfunc.js          # Custom helper functions
│   ├── lol.js             # TikTok downloader
│   ├── getversion.js      # Version fetcher
│   ├── connect/
│   │   ├── antidelete.js     # Anti-delete message
│   │   ├── antistatus.js     # Anti-status screenshot
│   │   ├── call.js           # Incoming call handler
│   │   ├── connection.js     # Connection events
│   │   ├── creds.js          # Credentials handler
│   │   ├── group.js          # Group events
│   │   ├── messages.js       # Message events
│   │   ├── statusForward.js  # Status forwarding
│   │   └── statuslike.js     # Status auto-like
│   └── database/
│       ├── contacts.vcf
│       └── database.json
├── lib/
│   ├── arrfunction.js      # Array utilities
│   ├── database.js         # Database manager
│   ├── memory.js           # Cache management
│   ├── message.js          # Message serializer
│   ├── module.js           # Module loader
│   ├── myfunc.js           # Function utilities
│   ├── update.js           # Update checker
│   └── upload.js           # Upload handler
├── plugins/
│   └── patron/             # Main plugins (60+)
│       ├── ai-chat.js
│       ├── ai-helper.js
│       ├── anti-mention.js
│       ├── auto-status.js
│       ├── downloader-*.js
│       ├── group-*.js
│       ├── owner-*.js
│       ├── tool-*.js
│       └── ... (50+ more)
└── tmp/
    ├── session/            # WhatsApp session data
    └── data.js             # Temporary data
```

---

## Message Flow Diagram

```
User sends message to WhatsApp
    ↓
Socket.ev.on('messages.upsert')
    ↓
smsg() - Message serialization
    ↓
ednut() - Main handler
    ├── Extract message text
    ├── Check if command (starts with prefix)
    ├── Parse command & arguments
    ├── Check sender permissions
    ├── Load plugins
    ├── Match command
    ├── Check plugin requirements (owner/admin/group)
    ├── Execute plugin
    └── Handle errors
    ↓
Response sent to user
```

---

## Key Objects & Data Structures

### Message Object (messageData)
```javascript
{
  key: {
    remoteJid: '120363xxx@g.us',     // Group/User JID
    id: 'xxxxx',                      // Message ID
    fromMe: false,                    // Is from bot
    participant: '2348xxx@s.whatsapp.net'  // Sender in group
  },
  
  message: {                          // Message content object
    conversation: 'Hello World',      // Plain text
    imageMessage: { ... },            // Image with caption
    videoMessage: { ... },            // Video with caption
    extendedTextMessage: { ... },     // Text with formatting
    stickerMessage: { ... },          // Sticker
    audioMessage: { ... },            // Audio/voice message
    documentMessage: { ... }          // File/document
  },
  
  messageTimestamp: 1234567890,       // Unix timestamp
  pushName: 'John Doe',               // Sender display name
  
  from: '2348025532222@s.whatsapp.net',  // Sender JID
  sender: '2348025532222@s.whatsapp.net', // Sender JID
  chat: '2348025532222@s.whatsapp.net',   // Chat JID
  
  isGroup: false,                     // Is group chat
  isBot: false,                       // Message from bot
  
  // Custom fields added by smsg()
  mtype: 'conversation',              // Message type
  body: 'Hello World',                // Message text
  text: 'Hello World',                // Message text
  quoted: { ... },                    // Replied message
  
  // Helper methods
  reply(text),                        // Reply to message
  react(emoji)                        // React with emoji
}
```

### Global Database (global.db)
```javascript
{
  reconnect: 0,                       // Reconnection counter
  
  loadedPlugins: false,               // Plugins loaded status
  
  groups: {                           // Group settings
    '120363xxx@g.us': {
      antilink: true,
      welcome: true,
      warnings: {
        '2348xxx@s.whatsapp.net': 2
      }
    }
  },
  
  settings: {                         // Global settings
    areact: true,                     // Auto-react enabled
    chatbot: false,
    prefix: ', ! ^ . ?'
  },
  
  sticker: {                          // Cached stickers
    'hash123': {
      text: 'sticker text',
      mentionedJid: ['jid1']
    }
  },
  
  warns: {                            // Warnings
    '2348xxx@s.whatsapp.net': 2
  },
  
  setsudo: [                          // Sudo users
    '2348025532222@s.whatsapp.net'
  ],
  
  disabled: [                         // Disabled commands
    'eval',
    'restart'
  ],
  
  ban: [                              // Banned users
    '2348xxx@s.whatsapp.net'
  ],
  
  gcban: [                            // Banned groups
    '120363xxx@g.us'
  ],
  
  plugins: {                          // Dynamic plugins
    'plugin_name': 'function code'
  },
  
  pfilters: {                         // Personal filters
    'hello': 'Hello there!'
  },
  
  gfilters: {                         // Group filters
    'spam': 'Stop spamming'
  }
}
```

### Plugin Structure
```javascript
module.exports = {
  // Basic info
  name: 'Plugin Name',
  command: 'cmd' || ['cmd1', 'cmd2'],      // Command name(s)
  alias: 'alias' || ['a', 'al'],           // Aliases
  category: 'misc',                        // Category
  description: 'Does something',           // Short description
  use: 'cmd <arg1> <arg2>',               // Usage example
  
  // Permissions
  owner: false,                            // Owner only
  group: false,                            // Group only
  admin: false,                            // Admin required
  botadmin: false,                         // Bot admin required
  
  // Error messages
  msg: {
    owner: 'Owner only',
    group: 'Group only',
    admin: 'Admin required',
    botadmin: 'Bot admin required'
  },
  
  // Main execution
  async execute(message, context) {
    const { reply, text, args, isOwner, isGroup } = context;
    
    // Plugin logic
    await reply('Response');
  }
}
```

### Context Object (passed to plugins)
```javascript
{
  // Socket & Utilities
  ednut: socket,                      // WhatsApp socket
  axios: axios,                       // HTTP client
  fetch: fetch,                       // Fetch API
  fs: fs,                             // File system
  
  // Message Info
  command: 'cmd',                     // Command name
  text: 'args',                       // Arguments as string
  args: ['arg1', 'arg2'],            // Arguments as array
  q: 'arg1 arg2',                    // Query (alias for args)
  quoted: message,                    // Quoted/replied message
  isCmd: true,                        // Is command
  
  // Permission Checks
  isOwner: true,                      // User is owner
  isGroup: false,                     // Is group chat
  isPrivate: true,                    // Is private chat
  isAdmin: false,                     // User is group admin
  isAdmins: false,                    // User is group admin
  isBotAdmins: false,                 // Bot is group admin
  
  // User Info
  botNumber: '2348025532222@s.whatsapp.net',
  pushname: 'John Doe',               // User display name
  from: '2348025532222@s.whatsapp.net', // User JID
  
  // Helpers
  reply: async (text) => {},          // Send text reply
  reply2: async (text, msg) => {},    // Send with mention
  react: async (emoji) => {},         // React to message
  pickRandom: (array) => {},          // Random from array
  example: (cmd) => {},               // Format usage text
  
  // APIs
  pinterest: async (query) => {},     // Search Pinterest
  tiktokDl: async (url) => {},       // Download TikTok
  igdl: async (url) => {},           // Download Instagram
  openai: async (prompt) => {},      // ChatGPT API
  
  // Data
  uploads: {                          // Uploaded files
    uploadImage: async (url) => {}
  },
  
  // Misc
  runtime: () => {},                  // Bot uptime
  prefix: [',', '!'],                 // Command prefixes
  getQuote: async () => {},           // Get quote of day
  commands: []                        // All available commands
}
```

---

## Socket Methods

### Connection Methods
```javascript
socket.sendMessage(jid, message, options)
  // Send message to JID
  // jid: '2348025532222@s.whatsapp.net' or '120363xxx@g.us'
  // message: { text: '...' } or { image: buffer } etc
  // options: { quoted: messageObj }

socket.groupMetadata(groupJid)
  // Get group info (name, members, admins, etc)

socket.profilePictureUrl(jid)
  // Get profile picture URL

socket.groupParticipantsUpdate(groupJid, jids, action)
  // Add/remove/promote/demote members
  // action: 'add' | 'remove' | 'promote' | 'demote'

socket.updateProfileName(name)
  // Set bot profile name

socket.updateProfileStatus(status)
  // Set bot profile status

socket.updateProfilePicture(groupJid, buffer)
  // Set bot profile picture

socket.sendPresenceUpdate(state, jid)
  // Send presence (typing, recording, paused)
  // state: 'composing' | 'recording' | 'paused'
```

### Media Methods
```javascript
socket.sendImageAsSticker(jid, image, quoted, options)
  // Convert image to sticker

socket.sendVideoAsSticker(jid, video, quoted, options)
  // Convert video to sticker

socket.downloadMediaMessage(message)
  // Download media from message

socket.sendFile(jid, path, filename, caption, quoted)
  // Send any file type

socket.getFile(path, save)
  // Download file from URL/path
```

### Helper Methods
```javascript
socket.decodeJid(jid)
  // Decode JID format

socket.getName(jid)
  // Get contact/group name

socket.sendContact(jid, contacts, quoted, title)
  // Send contact card

socket.reply(jid, text, quoted, options)
  // Quick reply method
```

---

## Event Handlers

### Connection Events
```javascript
socket.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
  // connection: 'open' | 'close' | null
  // lastDisconnect: error info if disconnected
  // qr: QR code string
})

socket.ev.on('creds.update', () => {
  // Credentials updated (save to file)
})

socket.ev.on('auth-failure', (message) => {
  // Authentication failed
})
```

### Message Events
```javascript
socket.ev.on('messages.upsert', ({ messages, type }) => {
  // type: 'notify' (new messages) | 'append' (history)
  // messages: array of new messages
})

socket.ev.on('messages.update', (updates) => {
  // Message status updates (read, delivered)
})

socket.ev.on('message-status.update', (status) => {
  // Message delivery status
})
```

### Group Events
```javascript
socket.ev.on('groups.update', (groupUpdates) => {
  // Group settings changed (announce, restrict, etc)
})

socket.ev.on('group.participants_update', ({ id, participants, action }) => {
  // action: 'add' | 'remove' | 'promote' | 'demote'
})

socket.ev.on('group-invite', (update) => {
  // Group invite received
})
```

### Status Events
```javascript
socket.ev.on('status.update', (status) => {
  // User status updated
})

socket.ev.on('presence.update', (updates) => {
  // User presence (online/offline/typing)
})
```

---

## Security Features Implementation

### 1. Anti-Link System
```javascript
// In handler.js
if (global.db.groups[messageData.chat]?.antilink && 
    typeof parsedText === 'string' &&
    (parsedText.includes('http://') || parsedText.includes('https://'))) {
  
  // Check immunity
  if (isOwner || isUserAdmin || fromBot) return;
  
  // Check bot admin
  if (!isBotAdmin) return;
  
  // Delete message
  await socket.sendMessage(chat, {
    delete: { remoteJid: chat, fromMe: false, id: key.id }
  });
}
```

### 2. Warn System
```javascript
// Track warnings
const warns = global.db.warns[sender] || 0;
const maxWarns = 3;

if (warns >= maxWarns) {
  // Remove from group
  await socket.groupParticipantsUpdate(chat, [sender], 'remove');
}
```

### 3. Ban System
```javascript
// Check banned users
if (global.db.ban.includes(sender)) {
  return; // Ignore all messages
}

// Check banned groups
if (global.db.gcban.includes(chat)) {
  return; // Don't respond in group
}
```

### 4. Sudo System
```javascript
// Grant temporary elevated access
global.db.setsudo = [
  '2348025532222@s.whatsapp.net',
  '2348133729715@s.whatsapp.net'
];

// Check if user is owner/sudo
const isOwner = ownerNumbers.includes(sender);
```

---

## Database Operations

### Saving Data
```javascript
// Auto-save every 10 seconds
setInterval(async () => {
  try {
    await database.saveData(global.db);
  } catch (error) {
    log('ERROR', `DB Save: ${error.message}`);
  }
}, 10000);
```

### Loading Data
```javascript
async function loadDatabase() {
  const database = new DataBase(process.env.DATABASE_URL);
  const savedData = await database.loadData();
  
  return {
    reconnect: 0,
    loadedPlugins: false,
    groups: {},
    settings: {},
    ...savedData
  };
}
```

### MongoDB Connection
```javascript
// Use DATABASE_URL environment variable
// Format: mongodb+srv://user:pass@cluster.mongodb.net/db

const database = new DataBase(process.env.DATABASE_URL);
```

---

## Plugin Development Guide

### Basic Plugin Template
```javascript
module.exports = {
  name: 'My Plugin',
  command: 'mycommand',
  alias: ['mc', 'myplugin'],
  category: 'misc',
  description: 'My awesome plugin',
  use: 'mycommand [argument]',
  
  owner: false,
  group: false,
  admin: false,
  botadmin: false,
  
  async execute(message, context) {
    const { 
      reply,      // Send reply
      text,       // Arguments
      args,       // Arguments array
      isOwner,    // Permission check
      isGroup,    // Chat type
      axios,      // HTTP client
      ednut       // Socket
    } = context;
    
    // Your plugin code here
    const result = 'Hello World';
    
    // Send reply
    await reply(result);
  }
};
```

### Multi-Command Plugin
```javascript
module.exports = [
  {
    command: 'ping',
    execute: async (m, { reply }) => {
      await reply('Pong!');
    }
  },
  {
    command: 'hello',
    execute: async (m, { reply, text }) => {
      await reply(`Hello ${text || 'there'}!`);
    }
  }
];
```

---

## Common Plugin Types

### 1. Downloader
```javascript
// Downloads content from social media
async execute(m, { reply, text, axios }) {
  const url = text; // User provides URL
  const data = await axios.get(url);
  // Process and send
  await reply('Downloaded!');
}
```

### 2. Generator
```javascript
// Generates images/logos/etc
async execute(m, { reply, text, axios }) {
  const image = await generateImage(text);
  await ednut.sendMessage(m.chat, { image });
}
```

### 3. Group Manager
```javascript
// Manages group settings
async execute(m, { reply, isGroup, isAdmin, ednut, text }) {
  if (!isGroup) return reply('Group only');
  if (!isAdmin) return reply('Admin required');
  
  // Manage group
  global.db.groups[m.chat] = { antilink: true };
}
```

### 4. Owner Tools
```javascript
// Restricted to bot owner
async execute(m, { reply, isOwner, ednut, text }) {
  if (!isOwner) return;
  
  // Owner commands
  if (text === 'restart') {
    process.exit();
  }
}
```

---

## Command Execution Flow

```
User Input: ", ping hello world"
    ↓
Parse: prefix="," command="ping" args=["hello", "world"]
    ↓
Load Plugins from ./plugins/patron
    ↓
Find plugin with command="ping"
    ↓
Check: owner? admin? group? botadmin?
    ↓
Build Context Object
    ↓
Execute plugin.execute(message, context)
    ↓
    ├─ Success: React with ✅
    ├─ Error: Send error report to owner, React with ❌
    └─ Auto-React: Use random emoji 😀-😂
    ↓
Response sent to user
```

---

## Environment Configuration

### Required Variables
```bash
SESSION_ID=PATRON-MD~[session-key]    # WhatsApp session
DATABASE_URL=mongodb+srv://...        # Database connection
```

### Optional Variables
```bash
PREFIX=", ! ^ . ?"                    # Command prefixes
BOT_NAME=Patron                       # Bot name
OWNER_NAME=Itzpatron                 # Owner name
TIME_ZONE=Africa/Lagos               # Timezone
MODE=public                          # public or private
REACT=true                           # Auto-react
CONSOLE=true                         # Show console logs
```

---

## Troubleshooting

### Bot Not Responding
1. Check SESSION_ID is valid
2. Check DATABASE_URL is correct
3. Check plugins are loading (see console)
4. Restart bot: `npm start`

### Database Not Saving
1. Check DATABASE_URL connection
2. Check network connectivity
3. Check database permissions
4. Check console for errors

### Plugins Not Loading
1. Check file is valid JavaScript
2. Check syntax errors
3. Check module.exports exists
4. Check permissions on plugin file

### Connection Drops
1. Check internet connection
2. Check WhatsApp account status
3. Check for rate limiting
4. Auto-reconnect will retry in 5 seconds

---

## Performance Tips

1. **Optimize Database Queries** - Cache frequently accessed data
2. **Batch Operations** - Process multiple messages together
3. **Use Memory Cache** - Store temporary data in RAM
4. **Lazy Load Plugins** - Load plugins on demand
5. **Cleanup Temp Files** - Remove files every 30 seconds
6. **Monitor Memory** - Use garbage collection

---

## Security Best Practices

1. **Keep SESSION_ID Secret** - Don't share or commit
2. **Use Strong DATABASE_URL** - With authentication
3. **Validate User Input** - Prevent injection attacks
4. **Use Owner Whitelist** - Restrict sensitive commands
5. **Log All Actions** - For audit trail
6. **Update Dependencies** - Keep packages current
7. **Use Environment Variables** - Don't hardcode secrets

---

This deobfuscated code documentation should help you understand every aspect of the PATRON-MD3 bot!
