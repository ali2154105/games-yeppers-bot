const { Client, GatewayIntentBits, ActionRowBuilder, StringSelectMenuBuilder, Partials } = require('discord.js');
const express = require('express');
const app = express();

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
      .setPlaceholder('🎮 اختر ألعابك المفضلة')
      .setMinValues(1)
      .setMaxValues(10)
      .addOptions([
        { label: 'Fortnite', value: 'Fortnite', emoji: '🔫' },
        { label: 'COD', value: 'COD', emoji: '🪖' },
        { label: 'Valorant', value: 'Valorant', emoji: '🎯' },
        { label: 'PUBG', value: 'PUBG', emoji: '💣' },
        { label: 'GTA Online', value: 'GTA Online', emoji: '🚗' },
        { label: 'Minecraft', value: 'Minecraft', emoji: '⛏️' },
        { label: 'League of Legends', value: 'League of Legends', emoji: '👑' },
        { label: 'Dota 2', value: 'Dota 2', emoji: '🧙' },
        { label: 'Rocket League', value: 'Rocket League', emoji: '🚀' },
        { label: 'Overwatch', value: 'Overwatch', emoji: '🛡️' },
        { label: 'Among Us', value: 'Among Us', emoji: '👽' },
        { label: 'Marvel Rivals', value: 'Marvel Rivals', emoji: '🦸' },
        { label: 'Brawlhalla', value: 'Brawlhalla', emoji: '🥊' },
      ]);

    const row = new ActionRowBuilder().addComponents(menu);

    await message.channel.send({
      content: '🎯 اختر ألعابك من القائمة أدناه:',
      components: [row]
    });
  }
});

// ======== أمر إعطاء رتبة بالـ ID (إضافة جديدة) ==========
client.on('messageCreate', async (message) => {
  if (!message.content.startsWith('!give-role')) return;
  if (!message.guild) return;

  if (!message.member.permissions.has('ManageRoles')) {
    return message.reply('❌ ما عندك صلاحية تعطي رتب');
  }

  const args = message.content.split(' ');
  const roleId = args[1];

  if (!roleId) {
    return message.reply('⚠️ استخدم الأمر هكذا:\n`!give-role ROLE_ID`');
  }

  const role = message.guild.roles.cache.get(roleId);
  if (!role) {
    return message.reply('❌ ما لقيت رتبة بهذا الـ ID');
  }

  try {
    if (message.member.roles.cache.has(role.id)) {
      return message.reply('🤷‍♂️ أنت أصلاً معك هذه الرتبة');
    }

    await message.member.roles.add(role);
    message.reply(`✅ تم إعطاؤك رتبة **${role.name}**`);
  } catch (error) {
    console.error(error);
    message.reply('❌ فشل إعطاء الرتبة (تأكد من صلاحيات البوت)');
  }
});

// ======== التعامل مع الاختيارات ==========
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isStringSelectMenu() || interaction.customId !== 'gameSelect') return;

  const member = interaction.member;
  const selected = interaction.values;
  const allGameRoles = [
    'Fortnite',
    'COD',
    'Valorant',
    'PUBG',
    'GTA Online',
    'Minecraft',
    'League of Legends',
    'Dota 2',
    'Rocket League',
    'Overwatch',
    'Among Us',
    'Marvel Rivals',
    'Brawlhalla'
  ];

  const added = [];
  const removed = [];
  const errors = [];

  try {
    for (const roleName of selected) {
      const role = interaction.guild.roles.cache.find(
        r => r.name.toLowerCase() === roleName.toLowerCase()
      );
      if (!role) {
        errors.push(roleName);
        continue;
      }
      if (!member.roles.cache.has(role.id)) {
        await member.roles.add(role);
        added.push(role.name);
      }
    }

    for (const roleName of allGameRoles) {
      if (!selected.includes(roleName)) {
        const role = interaction.guild.roles.cache.find(
          r => r.name.toLowerCase() === roleName.toLowerCase()
        );
        if (role && member.roles.cache.has(role.id)) {
          await member.roles.remove(role);
          removed.push(role.name);
        }
      }
    }

    let reply = '';
    if (added.length) reply += `✅ أُضيفت: ${added.join(', ')}\n`;
    if (removed.length) reply += `🗑 أُزيلت: ${removed.join(', ')}\n`;
    if (errors.length) reply += `⚠️ لم أجد الرتب: ${errors.join(', ')}\n`;
    if (!reply) reply = '🤷‍♂️ ما صار أي تغيير';

    await interaction.reply({ content: reply, ephemeral: true });
  } catch (error) {
    console.error('Error handling interaction:', error);
    await interaction.reply({
      content: '❌ حدث خطأ أثناء تحديث الأدوار',
      ephemeral: true
    }).catch(() => {});
  }
});

client.login(process.env.TOKEN);

app.get('/', (req, res) => res.send('Bot is running!'));
app.listen(3000, () => console.log('🌐 Web server is live'));

