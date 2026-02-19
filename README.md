# Games Yeppers Bot

A Discord bot (discord.js v14) with slash commands:

- `/firstmessage user:<User>`
- `/firstmessage_cancel`
- `/userinfo user:<User>`

## Features

### `/firstmessage`
Best-effort search for the oldest accessible message sent by a target user.

- Enumerates all accessible text channels where bot has `ViewChannel` + `ReadMessageHistory`.
- Includes threads (active + archived when accessible).
- Uses bounded search with snowflake timestamps (`dateToSnowflake`) and binary narrowing.
- Probes message windows with small batches (`limit: 100`) and page caps.
- Maintains a global oldest candidate across channels.
- Caches findings in SQLite by `(guild_id, user_id, channel_id)` with:
  - `earliest_found_message_id`
  - `last_scanned_at`
- Limits concurrency to 3 channels at a time.
- Applies basic rate-limit backoff.
- Sends ephemeral progress updates while scanning.
- Supports cancellation via `/firstmessage_cancel`.

### `/userinfo`
Returns an embed containing:

- user id
- account creation timestamp
- server join timestamp
- roles

## Project structure

```text
.
├── index.js        # Main bot implementation
├── package.json    # Scripts and dependencies
├── README.md       # Setup and usage
└── data.sqlite     # Auto-created cache database on first run
```

## Environment variables

Create a `.env` or set environment variables in your host:

```env
DISCORD_TOKEN=your_bot_token
# Optional fallback name supported by the bot
TOKEN=your_bot_token
# Optional: register guild-scoped commands for instant updates
GUILD_ID=your_guild_id
# Optional: sqlite path
SQLITE_PATH=./data.sqlite
# Optional: web port
PORT=3000
```

## Run

```bash
npm install
npm start
```

## Bot permissions / intents

### Required gateway intents
- Guilds
- GuildMembers
- GuildMessages
- MessageContent

### Required permissions in guild
- View Channels
- Read Message History
- Send Messages
- Embed Links

## Notes

- `/firstmessage` result is labeled as **oldest accessible message found** by design.
- Hidden/inaccessible channels and unavailable archived threads are skipped.
- This is intentionally best-effort and rate-limit conscious (bounded probing, capped pages, limited concurrency).
