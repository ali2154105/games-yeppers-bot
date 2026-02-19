# Discord `/send` Bot (discord.js v14)

This bot provides one slash command:

- `/send channel:<channel> user:<user> message:<text>`

When run, it sends:

```text
<@USER_ID> MESSAGE_CONTENT
```

in the selected channel.

## Features

- Uses `SlashCommandBuilder`.
- `channel` option is restricted to **Guild text channels**.
- Validates channel is text-based before sending.
- Checks bot permissions (`ViewChannel`, `SendMessages`).
- Handles permission failures with clear ephemeral error responses.
- Uses environment variables for token and optional guild-scoped command registration.

## Required environment variables

```env
DISCORD_TOKEN=your_bot_token
# Optional fallback name
TOKEN=your_bot_token
# Optional (recommended during development): guild command scope for instant updates
GUILD_ID=your_guild_id
```

## Required intents

- `Guilds`

## Setup and run

```bash
npm install
npm start
```

## Notes

- If `GUILD_ID` is provided, `/send` is registered in that guild only (faster updates).
- Without `GUILD_ID`, `/send` is registered globally (can take time to appear).
