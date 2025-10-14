const { Client, GatewayIntentBits, ActionRowBuilder, StringSelectMenuBuilder, Partials } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.GuildMember]
});

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// ======== إرسال القائمة ==========
client.on('messageCreate', async (message) => {
  if (message.content === '!setup-games') {
    const menu = new StringSelectMenuBuilder()
      .setCustomId('gameSelect')
      .setPlaceholder('اختر ألعابك المفضلة 🎮')
      .setMinValues(1)
      .setMaxValues(8)
      .addOptions([
        { label: 'COD', value: 'COD', emoji: '🪖' },
        { label: 'Among Us', value: 'Among Us', emoji: '👽' },
        { label: 'PUBG', value: 'PUBG', emoji: '💣' },
        { label: 'Minecraft', value: 'Minecraft', emoji: '⛏' },
        { label: 'Overwatch', value: 'Overwatch', emoji: '🛡' },
        { label: 'Marvel Rivals', value: 'Marvel Rivals', emoji: '🦸' },
        { label: 'Code Names', value: 'Code Names', emoji: '🕵' },
        { label: 'UNO', value: 'UNO', emoji: '🎴' },
      ]);

    const row = new ActionRowBuilder().addComponents(menu);

    await message.channel.send({ content: '🎯 اختر ألعابك من القائمة أدناه:', components: [row] });
  }
});

// ======== التعامل مع الاختيارات ==========
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;
  if (interaction.customId !== 'gameSelect') return;

  const member = interaction.member;
  const selected = interaction.values;

  const allGameRoles = ['COD', 'Among Us', 'PUBG', 'Minecraft', 'Overwatch', 'Marvel Rivals', 'Code Names', 'UNO'];
  const added = [];
  const removed = [];
  const errors = [];

  try {
    for (const roleName of selected) {
      const role = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === roleName.toLowerCase());
      if (!role) {
        errors.push(roleName);
        continue;
      }

      if (!member.roles.cache.has(role.id)) {
        try {
          await member.roles.add(role);
          added.push(role.name);
        } catch (error) {
          errors.push(roleName);
          console.error(`Failed to add role ${roleName}:`, error);
        }
      }
    }

    for (const roleName of allGameRoles) {
      if (!selected.includes(roleName)) {
        const role = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === roleName.toLowerCase());
        if (role && member.roles.cache.has(role.id)) {
          try {
            await member.roles.remove(role);
            removed.push(role.name);
          } catch (error) {
            errors.push(roleName);
            console.error(`Failed to remove role ${roleName}:`, error);
          }
        }
      }
    }

    let reply = '';
    if (added.length) reply += `✅ أُضيفت: ${added.join(', ')}\n`;
    if (removed.length) reply += `🗑 أُزيلت: ${removed.join(', ')}\n`;
    if (errors.length) reply += `⚠️ خطأ في: ${errors.join(', ')}\n`;
    if (!reply) reply = '🤷 ما صار أي تغيير';

    await interaction.reply({ content: reply.trim(), ephemeral: true });
  } catch (error) {
    console.error('Error handling interaction:', error);
    await interaction.reply({ content: '❌ حدث خطأ أثناء تحديث الأدوار', ephemeral: true }).catch(() => {});
  }
});

client.login(process.env.TOKEN);
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Bot is running!');
});

app.listen(3000, () => {
  console.log('🌐 Web server is live');
});
