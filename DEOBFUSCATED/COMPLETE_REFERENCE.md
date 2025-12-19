# PATRON-MD3 - Complete Reference Manual

## Overview

**PATRON-MD3** is a sophisticated WhatsApp bot built with **Node.js** and **Baileys** (WhatsApp Web API). It provides:

- 🤖 AI chat integration (ChatGPT)
- ⬇️ Media downloaders (YouTube, TikTok, Instagram, etc)
- 📝 Text/image generation tools
- 👥 Group management automation
- 🎮 Games and fun commands
- 🛠️ Owner admin tools
- 🔌 Plugin system (extendable)

---

## Installation & Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Get Session ID
- Open WhatsApp Web
- Generate session key
- Format: `PATRON-MD~[base64-key]`

### 3. Setup Database
- Get MongoDB URI from MongoDB Atlas
- Or use PostgreSQL URL
- Format: `mongodb+srv://user:pass@cluster.mongodb.net/db`

### 4. Configure Environment
```bash
# .env file
SESSION_ID=PATRON-MD~...
DATABASE_URL=mongodb+srv://...
BOT_NAME=Patron
PREFIX=", ! ^ . ?"
TIME_ZONE=Africa/Lagos
MODE=public
```

### 5. Start Bot
```bash
npm start
# or
node main.js
```

---

## Core Concepts

### 1. JID (Jabber ID)
Every WhatsApp user/group has a unique JID:
- **User**: `2348025532222@s.whatsapp.net`
- **Group**: `120363xxx@g.us`
- **Broadcast**: `status@broadcast`

### 2. Message Types
```
conversation      - Plain text
imageMessage      - Image with caption
videoMessage      - Video with caption
audioMessage      - Voice message
documentMessage   - File/PDF
stickerMessage    - Sticker
locationMessage   - Location
contactMessage    - Contact card
listResponseMessage    - List selection
buttonsResponseMessage - Button click
```

### 3. Permissions
- **Owner**: Can use all commands
- **Admin**: Can moderate group
- **Bot Admin**: Bot has group admin rights
- **Sudo**: Added users with owner rights
- **Group/Private**: Command location restriction

---

## Command Structure

### Basic Command
```
Prefix: , ! ^ . ?
Format: [prefix][command] [arguments]

Examples:
, help
, ping
, download https://...
, kick @user
```

### Command Parsing
```javascript
// User sends: ", ping hello world"

prefix     = ','
command    = 'ping'
text       = 'hello world'       // Full args
args       = ['hello', 'world']  // Array of args
q          = 'hello world'       // Alias for text
```

---

## Plugin System

### Plugin Locations
1. **Disk Plugins**: `./plugins/patron/*.js`
2. **Database Plugins**: `global.db.plugins`

### Plugin File Structure
```javascript
module.exports = {
  // Metadata
  name: 'Plugin Name',
  command: 'cmd' || ['cmd1', 'cmd2'],
  alias: ['c', 'command'],
  category: 'category_name',
  description: 'What it does',
  use: 'cmd <arg1> [arg2]',
  
  // Permissions
  owner: false,      // Owner only
  group: false,      // Group only
  admin: false,      // Admin required
  botadmin: false,   // Bot admin required
  
  // Execute
  async execute(message, context) {
    // Plugin code
  }
};
```

### Plugin Categories
- `ai` - AI integrations
- `downloader` - Media downloaders
- `group` - Group management
- `owner` - Owner tools
- `fun` - Games and fun
- `tool` - Utility tools
- `info` - Information commands
- `convert` - Media conversion
- `search` - Search tools
- `misc` - Miscellaneous

---

## Built-in Commands Examples

### Help & Info
```
, help              - Show all commands
, menu              - Show menu
, info              - Bot information
, ping              - Check bot status
, owner             - Bot owner info
```

### Media Downloaders
```
, ytmp3 <url>      - Download YouTube audio
, ytmp4 <url>      - Download YouTube video
, tiktok <url>     - Download TikTok video
, instagram <url>  - Download Instagram post
, facebook <url>   - Download Facebook video
```

### Group Management
```
, welcome on/off   - Set welcome message
, antilink on/off  - Enable anti-link
, add <number>     - Add user to group
, kick @user       - Remove user
, promote @user    - Make admin
, demote @user     - Remove admin
```

### Tools
```
, sticker          - Convert to sticker
, tohd             - Enhance image quality
, toimg            - Convert to image
, toaudio          - Convert to audio
, ssweb <url>      - Screenshot website
```

### Owner Commands
```
, restart          - Restart bot
, eval <code>      - Execute JavaScript
, setprefix <new>  - Change prefix
, mode public/pvt  - Change mode
, block @user      - Block user
, unblock @user    - Unblock user
```

---

## Database Schema

### Groups Collection
```javascript
{
  "_id": "120363xxx@g.us",
  
  // Settings
  antilink: false,
  welcome: false,
  welcomeMsg: "Welcome to group!",
  
  // Features
  antistatus: false,
  autoreplies: [],
  filters: {},
  
  // Moderation
  warnings: {
    "2348xxx@s.whatsapp.net": 2
  },
  muted: []
}
```

### Settings Collection
```javascript
{
  "_id": "global_settings",
  
  areact: true,           // Auto-react to messages
  chatbot: false,         // AI chat enabled
  prefix: ", ! ^ . ?",
  owner: "2348025532222@s.whatsapp.net",
  botname: "Patron",
  
  disabled: [             // Disabled commands
    "eval",
    "restart"
  ],
  
  setsudo: [              // Sudo users
    "2348133729715@s.whatsapp.net"
  ]
}
```

### Filters Collection
```javascript
{
  "type": "pfilters",     // Personal filters
  "patterns": {
    "hello": "Hello there!",
    "bye": "Goodbye!",
    "hey": "Hi buddy!"
  }
}
```

---

## Advanced Features

### 1. Auto-React
Automatically react with random emojis to all messages.
```javascript
// Enable in settings
global.db.settings.areact = true;

// Emoji pool
const emojis = ['😀', '😃', '😄', '😁', '😆', '😂', '🤣'];
```

### 2. Anti-Link
Automatically delete and warn when links are shared.
```javascript
// Enable per group
global.db.groups[groupId].antilink = true;

// Deletes links with 3 warnings = kick
```

### 3. Message Filters
Auto-reply when specific words are mentioned.
```javascript
// Personal filters (DM only)
global.db.pfilters = {
  "hello": "Hi there!",
  "help": "I'm here to help!"
};

// Group filters
global.db.gfilters = {
  "spam": "Stop spamming!",
  "bad": "Language warning"
};
```

### 4. Sticker Cache
Recently used stickers are cached for quick access.
```javascript
global.db.sticker = {
  "sha256_hash": {
    text: "Sticker caption",
    mentionedJid: ["jid1", "jid2"]
  }
};
```

### 5. Warning System
Track user violations.
```javascript
// Set warnings
global.db.warns[userJid] = 2;

// After 3 warnings = kick
if (warns >= 3) {
  await socket.groupParticipantsUpdate(groupJid, [userJid], 'remove');
}
```

### 6. Sudo System
Grant temporary elevated access to trusted users.
```javascript
global.db.setsudo = [
  "2348025532222@s.whatsapp.net",
  "2348133729715@s.whatsapp.net"
];
```

---

## API Integrations

### 1. ChatGPT (AI Chat)
```javascript
// Send message to AI-Chat API
const response = await axios.post('https://chateverywhere.app/api/chat/', {
  model: { id: 'ai', name: 'Ai' },
  messages: [{ role: 'user', content: userMessage }],
  prompt: systemPrompt,
  temperature: 0.5
});
```

### 2. YouTube Download
```javascript
const { yts } = require('youtube-yts');
const results = await yts('search query');
// Download using yt-dlp or similar
```

### 3. TikTok Download
```javascript
const { tiktokDl } = require('./all/lol.js');
const video = await tiktokDl(url);
// Returns: { title, mp4, mp3 }
```

### 4. Instagram Download
```javascript
const { igdl } = require('btch-downloader');
const media = await igdl(url);
// Returns array of images/videos
```

### 5. Pinterest Search
```javascript
const results = await pinterest(searchQuery);
// Returns array of images with sources
```

---

## Error Handling

### Try-Catch Pattern
```javascript
try {
  const result = await someAsyncFunction();
  await reply(result);
} catch (error) {
  console.error(error);
  await reply(`Error: ${error.message}`);
  
  // Report to owner
  await socket.sendMessage(ownerJid, {
    text: `[ERROR] ${error.message}`
  });
}
```

### Common Errors
```
ECONNRESET        - Connection lost
ENOTFOUND         - Network unreachable
ETIMEDOUT         - Request timeout
BAD_REQUEST       - Invalid WhatsApp request
Socket timeout    - No response from WhatsApp
Rate limit        - Too many requests
Invalid session   - Session expired/revoked
```

---

## Performance Optimization

### 1. Caching
```javascript
// Cache expensive operations
const cache = new NodeCache({ stdTTL: 3600 });

const getData = async (key) => {
  if (cache.has(key)) {
    return cache.get(key);
  }
  
  const data = await fetchData(key);
  cache.set(key, data);
  return data;
};
```

### 2. Batch Operations
```javascript
// Process multiple messages
const messages = [];
for (const msg of incomingMessages) {
  messages.push(processMessage(msg));
}
await Promise.all(messages);
```

### 3. Lazy Loading
```javascript
// Load plugins only when needed
let pluginCache = {};

const loadPlugin = (name) => {
  if (!pluginCache[name]) {
    pluginCache[name] = require(`./plugins/${name}.js`);
  }
  return pluginCache[name];
};
```

### 4. Memory Management
```javascript
// Garbage collection
setInterval(() => {
  if (global.gc) global.gc();
}, 30000);

// Clear old temp files
fs.readdirSync('./tmp').forEach(file => {
  const filePath = path.join('./tmp', file);
  const age = Date.now() - fs.statSync(filePath).mtimeMs;
  if (age > 3600000) { // 1 hour
    fs.unlinkSync(filePath);
  }
});
```

---

## Deployment

### Heroku
1. Create `Procfile`:
```
worker: npm start
```

2. Create `app.json` with config

3. Deploy:
```bash
git push heroku main
```

### Docker
1. Use provided `Dockerfile`
2. Build: `docker build -t patron .`
3. Run: `docker run patron`

### VPS/Linux
1. Install Node.js 16+
2. Install MongoDB/PostgreSQL
3. Clone repository
4. Configure .env
5. Start: `npm start` or use PM2

---

## Troubleshooting Guide

### Bot Not Connecting
```
Solution:
1. Check SESSION_ID is valid (starts with PATRON-MD~)
2. Verify WhatsApp account not banned
3. Check internet connection
4. Restart bot
5. Rescan QR code if session invalid
```

### Commands Not Working
```
Solution:
1. Check command file has correct syntax
2. Ensure module.exports exists
3. Check command name matches
4. Verify permissions (owner/admin/etc)
5. Check console for errors
```

### Database Connection Failed
```
Solution:
1. Check DATABASE_URL is correct format
2. Verify database is running
3. Check network connectivity
4. Verify authentication credentials
5. Check database user has correct permissions
```

### Memory Leak
```
Solution:
1. Monitor with: node --inspect main.js
2. Clear temp files regularly
3. Implement garbage collection
4. Limit cache size
5. Restart bot daily
```

---

## Best Practices

### Code Style
```javascript
// Use descriptive names
const getUserFromJid = (jid) => { ... };

// Use async/await
async function processMessage(msg) { ... }

// Handle errors
try {
  // code
} catch (error) {
  // handle
}

// Use constants
const OWNER_JID = '2348025532222@s.whatsapp.net';
const TIMEOUT = 30000;
```

### Security
```javascript
// Never hardcode secrets
const secret = process.env.SECRET_KEY;

// Validate user input
if (!input || input.length > 1000) return;

// Check permissions before action
if (!isOwner) return reply('Owner only');

// Log sensitive operations
log('WARN', `Suspicious activity from ${sender}`);

// Rate limit
const rateLimiter = new Map();
```

### Performance
```javascript
// Don't block event loop
setImmediate(() => heavyComputation());

// Use pagination for large data
const results = data.slice(0, 10);

// Cache results
const cached = cache.get(key) || computeValue();

// Batch database operations
await db.insertMany(documents);
```

---

## Resources

- **Baileys**: https://github.com/whiskeysockets/Baileys
- **Node.js**: https://nodejs.org
- **MongoDB**: https://mongodb.com
- **Express**: https://expressjs.com
- **Axios**: https://axios-http.com

---

## License & Credits

**PATRON-MD3** - Created by **Itzpatron**

Built with ❤️ using Baileys, Express, and many open-source libraries.

Not affiliated with WhatsApp or Meta Platforms, Inc.

---

## Support

For issues, questions, or feature requests:
1. Check documentation first
2. Search closed issues
3. Create detailed bug report
4. Join community Discord/Telegram

---

## Updates

Bot automatically checks for updates. To manually check:
```bash
npm update
npm audit
npm audit fix
```

---

**Last Updated**: 2025-01-01
**Version**: 3.x.x
**Status**: Active Development

