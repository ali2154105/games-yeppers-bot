const {
  ChannelType,
  Client,
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

async function registerCommands() {
  if (!client.application) return;

  const body = [sendCommand.toJSON()];
  if (GUILD_ID) {
    await client.rest.put(Routes.applicationGuildCommands(client.application.id, GUILD_ID), { body });
    console.log(`Registered /send in guild ${GUILD_ID}`);
  } else {
    await client.rest.put(Routes.applicationCommands(client.application.id), { body });
    console.log('Registered global /send command');
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

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  await registerCommands();
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== 'send') return;

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
});

client.login(TOKEN);
