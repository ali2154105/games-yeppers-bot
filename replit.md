# Discord Game Role Management Bot

## Overview
A Discord bot that manages game-related role assignments through an interactive select menu. Users can select their favorite games from a menu and automatically receive or remove corresponding Discord roles with toggle functionality.

**Bot Name:** Games Yappers bot  
**Created:** October 13, 2025  
**Language:** Node.js with discord.js v14  
**Status:** ✅ Running

## Features
- Interactive select menu with 8 popular games
- Automatic role assignment/removal based on selections
- Selection represents desired final state (roles are added/removed to match selection)
- Comprehensive error handling for Discord API failures
- Arabic language support for UI messages
- Ephemeral responses showing role changes
- Game-specific emojis for visual identification

## Supported Games
1. 🪖 COD (Call of Duty)
2. 👽 Among Us
3. 💣 PUBG
4. ⛏ Minecraft
5. 🛡 Overwatch
6. 🦸 Marvel Rivals
7. 🕵 Code Names
8. 🎴 UNO

## How to Use

### For Server Members:
1. Type `!setup-games` in any channel where the bot can read messages
2. A menu will appear with the game options
3. Select your favorite games (you can select 1-8 games)
4. The bot will automatically add or remove roles based on your selection
5. You'll receive a private message showing which roles were added or removed

### For Server Admins:
**Prerequisites:**
1. Create role names in your Discord server that match the game names exactly (case-insensitive):
   - COD, Among Us, PUBG, Minecraft, Overwatch, Marvel Rivals, Code Names, UNO
2. Ensure the bot's role is positioned **above** the game roles in the server hierarchy
3. Give the bot "Manage Roles" permission

## Project Structure
```
.
├── index.js           # Main bot code
├── package.json       # Node.js dependencies
├── .gitignore        # Git ignore rules
└── replit.md         # This documentation
```

## Setup Instructions

### Discord Developer Portal Configuration:
1. Create a bot at https://discord.com/developers/applications
2. In the "Bot" section:
   - Enable "SERVER MEMBERS INTENT"
   - Enable "MESSAGE CONTENT INTENT"
   - Copy the bot token
3. Add bot token to Replit Secrets as `TOKEN`
4. Invite bot using OAuth2 URL with "Manage Roles" permission

### Bot Permissions Required:
- Manage Roles (268435456)
- Read Messages/View Channels
- Send Messages

## Technical Details

### Dependencies:
- `discord.js`: ^14.x - Discord API wrapper
- `dotenv`: ^16.x - Environment variable management (optional)

### Gateway Intents:
- Guilds
- GuildMembers
- GuildMessages
- MessageContent

### Environment Variables:
- `TOKEN`: Discord bot token (stored in Replit Secrets)

## Recent Changes
- **October 13, 2025**: Initial project setup and bug fixes
  - Installed Node.js 20 and discord.js
  - Created bot with game role management functionality
  - Fixed critical bug: Changed role logic from toggle to desired-state (selection now represents final roles user wants)
  - Added comprehensive error handling for Discord API operations
  - Configured workflow to run bot automatically
  - Added Arabic language support for messages
  - Successfully deployed and tested bot connection

## Workflow Configuration
- **Name:** Discord Bot
- **Command:** `node index.js`
- **Status:** Running
- **Output:** Console logs showing bot status

## Troubleshooting

### Bot won't start:
- Verify TOKEN is set correctly in Replit Secrets
- Check that intents are enabled in Discord Developer Portal
- Ensure token is the actual bot token, not OAuth2 URL

### Roles not being assigned:
- Verify role names match exactly (case-insensitive)
- Ensure bot role is above game roles in server hierarchy
- Check bot has "Manage Roles" permission

### Menu not appearing:
- Verify "MESSAGE CONTENT INTENT" is enabled
- Check bot can read messages in the channel
- Ensure command is typed exactly as `!setup-games`

## Future Enhancements
- Persistent role storage across sessions
- Admin commands to customize games and emojis
- Auto-create roles if they don't exist
- Analytics dashboard for popular games
- Scheduled notifications for matching game players online
