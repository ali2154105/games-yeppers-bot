const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  PermissionsBitField,
  RESTJSONErrorCodes,
  Routes,
  SlashCommandBuilder,
} = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN || process.env.TOKEN;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN) {
  throw new Error('Missing DISCORD_TOKEN (or TOKEN) environment variable.');
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const sendCommand = new SlashCommandBuilder()
  .setName('send')
  .setDescription('Send a message in a selected text channel while mentioning a user')
  .addChannelOption((option) =>
    option
      .setName('channel')
      .setDescription('Target text channel')
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true),
  )
  .addUserOption((option) => option.setName('user').setDescription('User to mention').setRequired(true))
  .addStringOption((option) => option.setName('message').setDescription('Message content').setRequired(true));

const tictactoeCommand = new SlashCommandBuilder()
  .setName('tictactoe')
  .setDescription('Start an interactive Tic-Tac-Toe (XO) game')
  .addUserOption((option) =>
    option.setName('opponent').setDescription('The player to challenge').setRequired(true),
  );

const games = new Map();

async function registerCommands() {
  if (!client.application) return;

  const body = [sendCommand.toJSON(), tictactoeCommand.toJSON()];
  if (GUILD_ID) {
    await client.rest.put(Routes.applicationGuildCommands(client.application.id, GUILD_ID), { body });
    console.log(`Registered commands in guild ${GUILD_ID}`);
  } else {
    await client.rest.put(Routes.applicationCommands(client.application.id), { body });
    console.log('Registered global slash commands');
  }
}

function ensureTextChannel(channel) {
  return channel && channel.type === ChannelType.GuildText && channel.isTextBased();
}

function canBotSend(channel) {
  const me = channel.guild.members.me;
  if (!me) return false;
  const perms = channel.permissionsFor(me);
  return (
    perms?.has(PermissionsBitField.Flags.ViewChannel) &&
    perms?.has(PermissionsBitField.Flags.SendMessages)
  );
}

function renderBoard(cells) {
  const icon = (value) => {
    if (value === 'X') return '❌';
    if (value === 'O') return '⭕';
    return '▫️';
  };

  return [
    `${icon(cells[0])} ${icon(cells[1])} ${icon(cells[2])}`,
    `${icon(cells[3])} ${icon(cells[4])} ${icon(cells[5])}`,
    `${icon(cells[6])} ${icon(cells[7])} ${icon(cells[8])}`,
  ].join('\n');
}

function createBoardRows(cells, disabled = false) {
  const rows = [];
  for (let r = 0; r < 3; r += 1) {
    const row = new ActionRowBuilder();
    for (let c = 0; c < 3; c += 1) {
      const index = r * 3 + c;
      const cell = cells[index];
      const style = cell === 'X' ? ButtonStyle.Danger : cell === 'O' ? ButtonStyle.Primary : ButtonStyle.Secondary;
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`ttt:${index}`)
          .setLabel(cell || ' ')
          .setStyle(style)
          .setDisabled(disabled || Boolean(cell)),
      );
    }
    rows.push(row);
  }
  return rows;
}

function getWinner(cells) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (const [a, b, c] of lines) {
    if (cells[a] && cells[a] === cells[b] && cells[b] === cells[c]) {
      return cells[a];
    }
  }
  return null;
}

function currentPlayer(game) {
  return game.turn === 'X' ? game.playerX : game.playerO;
}

function symbolForUser(game, userId) {
  if (game.playerX === userId) return 'X';
  if (game.playerO === userId) return 'O';
  return null;
}

function buildGameEmbed(game, statusText) {
  return new EmbedBuilder()
    .setTitle('Tic-Tac-Toe (XO)')
    .setColor(0x5865f2)
    .setDescription(`${renderBoard(game.cells)}\n\n${statusText}`)
    .addFields(
      { name: '❌ Player X', value: `<@${game.playerX}>`, inline: true },
      { name: '⭕ Player O', value: `<@${game.playerO}>`, inline: true },
    );
}

async function handleSend(interaction) {
  const channel = interaction.options.getChannel('channel', true);
  const user = interaction.options.getUser('user', true);
  const message = interaction.options.getString('message', true).trim();

  if (!ensureTextChannel(channel)) {
    await interaction.reply({
      content: '❌ Please choose a server text channel.',
      ephemeral: true,
    });
    return;
  }

  if (!canBotSend(channel)) {
    await interaction.reply({
      content: '❌ I do not have permission to send messages in that channel.',
      ephemeral: true,
    });
    return;
  }

  const output = `<@${user.id}> ${message}`;

  try {
    await channel.send(output);
    await interaction.reply({
      content: `✅ Message sent in ${channel}.`,
      ephemeral: true,
    });
  } catch (error) {
    console.error(error);

    if (error?.code === RESTJSONErrorCodes.MissingPermissions || error?.status === 403) {
      await interaction.reply({
        content: '❌ Failed to send message: missing permissions for that channel.',
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({
      content: '❌ Failed to send message due to an unexpected error.',
      ephemeral: true,
    });
  }
}

async function handleTicTacToe(interaction) {
  const opponent = interaction.options.getUser('opponent', true);

  if (opponent.bot) {
    await interaction.reply({ content: '❌ You cannot play against a bot.', ephemeral: true });
    return;
  }

  if (opponent.id === interaction.user.id) {
    await interaction.reply({ content: '❌ You cannot play against yourself.', ephemeral: true });
    return;
  }

  const existing = [...games.values()].find(
    (game) => !game.ended && (game.playerX === interaction.user.id || game.playerO === interaction.user.id || game.playerX === opponent.id || game.playerO === opponent.id),
  );

  if (existing) {
    await interaction.reply({ content: '❌ One of the players is already in an active game.', ephemeral: true });
    return;
  }

  const game = {
    playerX: interaction.user.id,
    playerO: opponent.id,
    turn: 'X',
    cells: Array(9).fill(null),
    ended: false,
  };

  const embed = buildGameEmbed(
    game,
    `Turn: <@${currentPlayer(game)}> (${game.turn})\nClick a button to place your mark.`,
  );

  await interaction.reply({
    content: `🎮 Tic-Tac-Toe started: <@${game.playerX}> vs <@${game.playerO}>`,
    embeds: [embed],
    components: createBoardRows(game.cells),
  });

  const message = await interaction.fetchReply();
  games.set(message.id, game);
}

async function handleBoardInteraction(interaction) {
  if (!interaction.isButton() || !interaction.customId.startsWith('ttt:')) return;

  const game = games.get(interaction.message.id);
  if (!game) {
    await interaction.reply({ content: '⚠️ This game session is no longer active.', ephemeral: true });
    return;
  }

  if (game.ended) {
    await interaction.reply({ content: '⚠️ This game has already ended.', ephemeral: true });
    return;
  }

  if (interaction.user.id !== game.playerX && interaction.user.id !== game.playerO) {
    await interaction.reply({ content: '❌ Only the two players can use this board.', ephemeral: true });
    return;
  }

  const expectedUserId = currentPlayer(game);
  if (interaction.user.id !== expectedUserId) {
    await interaction.reply({ content: `⏳ It is not your turn. It is <@${expectedUserId}>'s turn.`, ephemeral: true });
    return;
  }

  const index = Number(interaction.customId.split(':')[1]);
  if (!Number.isInteger(index) || index < 0 || index > 8) {
    await interaction.reply({ content: '❌ Invalid move.', ephemeral: true });
    return;
  }

  if (game.cells[index]) {
    await interaction.reply({ content: '❌ That cell is already taken. Choose another one.', ephemeral: true });
    return;
  }

  const symbol = symbolForUser(game, interaction.user.id);
  game.cells[index] = symbol;

  const winner = getWinner(game.cells);
  const boardFull = game.cells.every(Boolean);

  if (winner) {
    game.ended = true;
    const winnerId = winner === 'X' ? game.playerX : game.playerO;
    const embed = buildGameEmbed(game, `🏆 Winner: <@${winnerId}> (${winner})`);
    await interaction.update({ embeds: [embed], components: createBoardRows(game.cells, true) });
    games.delete(interaction.message.id);
    return;
  }

  if (boardFull) {
    game.ended = true;
    const embed = buildGameEmbed(game, '🤝 It is a tie!');
    await interaction.update({ embeds: [embed], components: createBoardRows(game.cells, true) });
    games.delete(interaction.message.id);
    return;
  }

  game.turn = game.turn === 'X' ? 'O' : 'X';
  const embed = buildGameEmbed(
    game,
    `Turn: <@${currentPlayer(game)}> (${game.turn})\nClick a button to place your mark.`,
  );

  await interaction.update({ embeds: [embed], components: createBoardRows(game.cells) });
}

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  await registerCommands();
});

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'send') {
        await handleSend(interaction);
        return;
      }
      if (interaction.commandName === 'tictactoe') {
        await handleTicTacToe(interaction);
        return;
      }
    }

    await handleBoardInteraction(interaction);
  } catch (error) {
    console.error(error);
    if (interaction.isRepliable()) {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: '❌ An unexpected error occurred.', ephemeral: true }).catch(() => {});
      } else {
        await interaction.reply({ content: '❌ An unexpected error occurred.', ephemeral: true }).catch(() => {});
      }
    }
  }
});

client.login(TOKEN);
