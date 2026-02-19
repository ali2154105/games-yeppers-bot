# Discord Bot (discord.js v14)

This bot includes two slash commands:

- `/send channel:<channel> user:<user> message:<text>`
- `/tictactoe opponent:<user>`

## 1) `/send`
Sends this format into the selected text channel:

```text
<@USER_ID> MESSAGE_CONTENT
```

### Behavior
- Uses `SlashCommandBuilder`.
- `channel` option is restricted to guild text channels.
- Validates channel is text-based.
- Checks bot permissions (`ViewChannel`, `SendMessages`).
- Returns ephemeral success/failure responses.

## 2) `/tictactoe`
Starts an interactive Tic-Tac-Toe (XO) game between command user and chosen opponent.

### Game flow
- Bot posts a 3x3 clickable board.
- Board is updated after each move.
- Turn order is enforced (X then O).
- Only the two players can click the board.
- Invalid actions are handled gracefully:
  - out-of-turn move
  - clicking occupied cell
  - non-player interaction
- Announces result when game ends:
  - winner
  - tie

## Required environment variables

```env
DISCORD_TOKEN=your_bot_token
# Optional fallback name
TOKEN=your_bot_token
# Optional (recommended during development)
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
- If `GUILD_ID` is set, commands are registered only in that guild (faster updates).
- Without `GUILD_ID`, commands are global and may take time to appear.
