diff --git a/index.js b/index.js
index ebf2fc3b3a7682dab060895617c08cb1948dbfb9..51163ab052a6739712bdfb8878186a1fadac84af 100644
--- a/index.js
+++ b/index.js
@@ -1,159 +1,409 @@
-const { Client, GatewayIntentBits, ActionRowBuilder, StringSelectMenuBuilder, Partials } = require('discord.js');
+const {
+  ChannelType,
+  Client,
+  EmbedBuilder,
+  GatewayIntentBits,
+  PermissionsBitField,
+  RESTJSONErrorCodes,
+  Routes,
+  SlashCommandBuilder,
+} = require('discord.js');
+const { execFileSync } = require('child_process');
 const express = require('express');
+
+const TOKEN = process.env.DISCORD_TOKEN || process.env.TOKEN;
+const APP_PORT = Number(process.env.PORT || 3000);
+const SQLITE_PATH = process.env.SQLITE_PATH || './data.sqlite';
+
+if (!TOKEN) {
+  throw new Error('Missing DISCORD_TOKEN (or TOKEN) env var.');
+}
+
 const app = express();
+app.get('/', (_req, res) => res.send('Bot is running.'));
+app.listen(APP_PORT, () => console.log(`Web server listening on ${APP_PORT}`));
+
+function sqlEscape(value) {
+  return String(value).replace(/'/g, "''");
+}
+
+function runSql(query) {
+  const out = execFileSync('sqlite3', ['-json', SQLITE_PATH, query], { encoding: 'utf8' });
+  if (!out.trim()) return [];
+  return JSON.parse(out);
+}
+
+function initializeDb() {
+  execFileSync('sqlite3', [
+    SQLITE_PATH,
+    `CREATE TABLE IF NOT EXISTS earliest_messages_cache (
+      guild_id TEXT NOT NULL,
+      user_id TEXT NOT NULL,
+      channel_id TEXT NOT NULL,
+      earliest_found_message_id TEXT NOT NULL,
+      last_scanned_at INTEGER NOT NULL,
+      PRIMARY KEY (guild_id, user_id, channel_id)
+    );`,
+  ]);
+}
+
+function getCachedRows(guildId, userId) {
+  return runSql(`SELECT guild_id, user_id, channel_id, earliest_found_message_id, last_scanned_at
+    FROM earliest_messages_cache
+    WHERE guild_id='${sqlEscape(guildId)}' AND user_id='${sqlEscape(userId)}';`);
+}
+
+function upsertCachedRow(guildId, userId, channelId, messageId) {
+  const now = Date.now();
+  execFileSync('sqlite3', [
+    SQLITE_PATH,
+    `INSERT INTO earliest_messages_cache (guild_id, user_id, channel_id, earliest_found_message_id, last_scanned_at)
+     VALUES ('${sqlEscape(guildId)}','${sqlEscape(userId)}','${sqlEscape(channelId)}','${sqlEscape(messageId)}',${now})
+     ON CONFLICT(guild_id, user_id, channel_id)
+     DO UPDATE SET earliest_found_message_id=excluded.earliest_found_message_id,last_scanned_at=excluded.last_scanned_at;`,
+  ]);
+}
+
+const DISCORD_EPOCH = 1420070400000n;
+function dateToSnowflake(date) {
+  return (((BigInt(date.getTime()) - DISCORD_EPOCH) << 22n)).toString();
+}
+
+function snowflakeToMs(id) {
+  return Number((BigInt(id) >> 22n) + DISCORD_EPOCH);
+}
+
+function sleep(ms) {
+  return new Promise((resolve) => setTimeout(resolve, ms));
+}
+
+async function fetchWithBackoff(fn, maxAttempts = 4) {
+  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
+    try {
+      return await fn();
+    } catch (error) {
+      const retryAfterSec = Number(error?.rawError?.retry_after || 0);
+      if ((error?.status === 429 || error?.code === RESTJSONErrorCodes.RateLimited) && attempt < maxAttempts) {
+        await sleep((retryAfterSec > 0 ? retryAfterSec * 1000 : attempt * 1000) + 150);
+        continue;
+      }
+      throw error;
+    }
+  }
+
+  throw new Error('Retries exhausted');
+}
 
 const client = new Client({
   intents: [
     GatewayIntentBits.Guilds,
-    GatewayIntentBits.GuildMembers,
     GatewayIntentBits.GuildMessages,
-    GatewayIntentBits.MessageContent
+    GatewayIntentBits.GuildMembers,
+    GatewayIntentBits.MessageContent,
   ],
-  partials: [Partials.GuildMember]
 });
 
-client.once('ready', () => {
-  console.log(`✅ Logged in as ${client.user.tag}`);
-});
+const cancelStates = new Map();
+const keyForRequester = (guildId, requesterId) => `${guildId}:${requesterId}`;
 
-// ======== إرسال القائمة ==========
-client.on('messageCreate', async (message) => {
-  if (message.content === '!setup-games') {
-    const menu = new StringSelectMenuBuilder()
-      .setCustomId('gameSelect')
-      .setPlaceholder('🎮 اختر ألعابك المفضلة')
-      .setMinValues(1)
-      .setMaxValues(10)
-      .addOptions([
-        { label: 'Fortnite', value: 'Fortnite', emoji: '🔫' },
-        { label: 'COD', value: 'COD', emoji: '🪖' },
-        { label: 'Valorant', value: 'Valorant', emoji: '🎯' },
-        { label: 'PUBG', value: 'PUBG', emoji: '💣' },
-        { label: 'GTA Online', value: 'GTA Online', emoji: '🚗' },
-        { label: 'Minecraft', value: 'Minecraft', emoji: '⛏️' },
-        { label: 'League of Legends', value: 'League of Legends', emoji: '👑' },
-        { label: 'Dota 2', value: 'Dota 2', emoji: '🧙' },
-        { label: 'Rocket League', value: 'Rocket League', emoji: '🚀' },
-        { label: 'Overwatch', value: 'Overwatch', emoji: '🛡️' },
-        { label: 'Among Us', value: 'Among Us', emoji: '👽' },
-        { label: 'Marvel Rivals', value: 'Marvel Rivals', emoji: '🦸' },
-        { label: 'Brawlhalla', value: 'Brawlhalla', emoji: '🥊' },
-      ]);
-
-    const row = new ActionRowBuilder().addComponents(menu);
-
-    await message.channel.send({
-      content: '🎯 اختر ألعابك من القائمة أدناه:',
-      components: [row]
-    });
+function canReadChannel(channel) {
+  const me = channel.guild.members.me;
+  if (!me) return false;
+  const perms = channel.permissionsFor(me);
+  return perms?.has(PermissionsBitField.Flags.ViewChannel) && perms?.has(PermissionsBitField.Flags.ReadMessageHistory);
+}
+
+async function getAccessibleSurfaces(guild) {
+  await guild.channels.fetch();
+  const channels = [...guild.channels.cache.values()].filter((ch) => {
+    if (!canReadChannel(ch)) return false;
+    return [
+      ChannelType.GuildText,
+      ChannelType.GuildAnnouncement,
+      ChannelType.PublicThread,
+      ChannelType.PrivateThread,
+      ChannelType.AnnouncementThread,
+    ].includes(ch.type);
+  });
+
+  const threads = new Map();
+  for (const channel of channels) {
+    if (!channel.isTextBased() || !('threads' in channel)) continue;
+
+    try {
+      const active = await fetchWithBackoff(() => channel.threads.fetchActive());
+      for (const t of active.threads.values()) if (canReadChannel(t)) threads.set(t.id, t);
+
+      const archivedPub = await fetchWithBackoff(() => channel.threads.fetchArchived({ type: 'public', limit: 100, fetchAll: false }));
+      for (const t of archivedPub.threads.values()) if (canReadChannel(t)) threads.set(t.id, t);
+
+      const archivedPriv = await fetchWithBackoff(() => channel.threads.fetchArchived({ type: 'private', limit: 100, fetchAll: false }));
+      for (const t of archivedPriv.threads.values()) if (canReadChannel(t)) threads.set(t.id, t);
+    } catch {
+      // best effort
+    }
   }
-});
 
-// ======== أمر إعطاء رتبة بالـ ID (إضافة جديدة) ==========
-client.on('messageCreate', async (message) => {
-  if (!message.content.startsWith('!give-role')) return;
-  if (!message.guild) return;
+  const merged = new Map();
+  for (const channel of channels) if (channel.isTextBased()) merged.set(channel.id, channel);
+  for (const thread of threads.values()) if (thread.isTextBased()) merged.set(thread.id, thread);
+  return [...merged.values()];
+}
+
+async function probeWindow(channel, userId, startMs, endMs, maxPages = 3) {
+  let after = dateToSnowflake(new Date(startMs));
+  let pages = 0;
+  while (pages < maxPages) {
+    const batch = await fetchWithBackoff(() => channel.messages.fetch({ limit: 100, after }));
+    if (!batch.size) return false;
 
-  if (!message.member.permissions.has('ManageRoles')) {
-    return message.reply('❌ ما عندك صلاحية تعطي رتب');
+    const ordered = [...batch.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);
+    const inWindow = ordered.filter((m) => m.createdTimestamp >= startMs && m.createdTimestamp <= endMs);
+    if (inWindow.some((m) => m.author.id === userId)) return true;
+
+    const last = ordered[ordered.length - 1];
+    if (!last || last.createdTimestamp > endMs) return false;
+    after = last.id;
+    pages += 1;
   }
+  return false;
+}
+
+async function extractEarliest(channel, userId, startMs, endMs, maxPages = 6) {
+  let after = dateToSnowflake(new Date(startMs));
+  let pages = 0;
+  let best = null;
 
-  const args = message.content.split(' ');
-  const roleId = args[1];
+  while (pages < maxPages) {
+    const batch = await fetchWithBackoff(() => channel.messages.fetch({ limit: 100, after }));
+    if (!batch.size) break;
 
-  if (!roleId) {
-    return message.reply('⚠️ استخدم الأمر هكذا:\n`!give-role ROLE_ID`');
+    const ordered = [...batch.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);
+    for (const msg of ordered) {
+      if (msg.createdTimestamp > endMs) return best;
+      if (msg.author.id === userId) {
+        const candidate = {
+          channelId: channel.id,
+          messageId: msg.id,
+          timestamp: msg.createdTimestamp,
+          url: msg.url,
+        };
+        if (!best || candidate.timestamp < best.timestamp) best = candidate;
+      }
+    }
+
+    const last = ordered[ordered.length - 1];
+    if (!last || last.createdTimestamp > endMs) break;
+    after = last.id;
+    pages += 1;
   }
 
-  const role = message.guild.roles.cache.get(roleId);
-  if (!role) {
-    return message.reply('❌ ما لقيت رتبة بهذا الـ ID');
+  return best;
+}
+
+async function searchChannelForUser(channel, userId, minMs, upperBoundMs) {
+  let low = minMs;
+  let high = upperBoundMs || Date.now();
+  if (high <= low) return null;
+
+  for (let i = 0; i < 16 && low < high; i += 1) {
+    const mid = Math.floor((low + high) / 2);
+    const hasAny = await probeWindow(channel, userId, low, mid, 3);
+    if (hasAny) high = mid;
+    else low = mid + 1;
   }
 
-  try {
-    if (message.member.roles.cache.has(role.id)) {
-      return message.reply('🤷‍♂️ أنت أصلاً معك هذه الرتبة');
-    }
+  const slack = 3 * 24 * 60 * 60 * 1000;
+  return extractEarliest(channel, userId, Math.max(minMs, low - slack), low + slack, 6);
+}
 
-    await message.member.roles.add(role);
-    message.reply(`✅ تم إعطاؤك رتبة **${role.name}**`);
-  } catch (error) {
-    console.error(error);
-    message.reply('❌ فشل إعطاء الرتبة (تأكد من صلاحيات البوت)');
+async function runTasksWithConcurrency(tasks, concurrency) {
+  const results = [];
+  for (let i = 0; i < tasks.length; i += concurrency) {
+    const slice = tasks.slice(i, i + concurrency);
+    const batch = await Promise.all(slice.map((fn) => fn()));
+    results.push(...batch);
   }
-});
+  return results;
+}
 
-// ======== التعامل مع الاختيارات ==========
-client.on('interactionCreate', async (interaction) => {
-  if (!interaction.isStringSelectMenu() || interaction.customId !== 'gameSelect') return;
-
-  const member = interaction.member;
-  const selected = interaction.values;
-  const allGameRoles = [
-    'Fortnite',
-    'COD',
-    'Valorant',
-    'PUBG',
-    'GTA Online',
-    'Minecraft',
-    'League of Legends',
-    'Dota 2',
-    'Rocket League',
-    'Overwatch',
-    'Among Us',
-    'Marvel Rivals',
-    'Brawlhalla'
-  ];
-
-  const added = [];
-  const removed = [];
-  const errors = [];
+async function handleFirstMessage(interaction) {
+  const targetUser = interaction.options.getUser('user', true);
+  const guild = interaction.guild;
+  const key = keyForRequester(guild.id, interaction.user.id);
+  const cancelState = { canceled: false };
+  cancelStates.set(key, cancelState);
 
-  try {
-    for (const roleName of selected) {
-      const role = interaction.guild.roles.cache.find(
-        r => r.name.toLowerCase() === roleName.toLowerCase()
-      );
-      if (!role) {
-        errors.push(roleName);
-        continue;
-      }
-      if (!member.roles.cache.has(role.id)) {
-        await member.roles.add(role);
-        added.push(role.name);
-      }
+  await interaction.reply({ content: `Scanning channels for ${targetUser.tag}...`, ephemeral: true });
+
+  const channels = await getAccessibleSurfaces(guild);
+  let scanned = 0;
+  let lastProgress = 0;
+  const started = Date.now();
+
+  let best = null;
+  const cacheRows = getCachedRows(guild.id, targetUser.id);
+  const cacheByChannel = new Map(cacheRows.map((r) => [r.channel_id, r]));
+
+  for (const row of cacheRows) {
+    const channel = channels.find((ch) => ch.id === row.channel_id);
+    if (!channel) continue;
+    try {
+      const cachedMsg = await fetchWithBackoff(() => channel.messages.fetch(row.earliest_found_message_id));
+      if (cachedMsg.author.id !== targetUser.id) continue;
+      const candidate = { channelId: channel.id, messageId: cachedMsg.id, timestamp: cachedMsg.createdTimestamp, url: cachedMsg.url };
+      if (!best || candidate.timestamp < best.timestamp) best = candidate;
+    } catch {
+      // stale cache ignored
     }
+  }
 
-    for (const roleName of allGameRoles) {
-      if (!selected.includes(roleName)) {
-        const role = interaction.guild.roles.cache.find(
-          r => r.name.toLowerCase() === roleName.toLowerCase()
-        );
-        if (role && member.roles.cache.has(role.id)) {
-          await member.roles.remove(role);
-          removed.push(role.name);
-        }
-      }
+  const maybeProgress = async () => {
+    const now = Date.now();
+    if (now - lastProgress < 3000) return;
+    lastProgress = now;
+    const bestText = best ? `<t:${Math.floor(best.timestamp / 1000)}:F> in <#${best.channelId}>` : 'none yet';
+    await interaction.editReply(`Scanning ${scanned}/${channels.length} channels • oldest so far: ${bestText}`);
+  };
+
+  const tasks = channels.map((channel) => async () => {
+    if (cancelState.canceled) return null;
+    const cached = cacheByChannel.get(channel.id);
+    const upperBound = cached?.earliest_found_message_id ? snowflakeToMs(cached.earliest_found_message_id) : undefined;
+
+    let candidate = null;
+    try {
+      candidate = await searchChannelForUser(channel, targetUser.id, guild.createdTimestamp, upperBound);
+    } catch {
+      // ignore channels that fail mid-scan
     }
 
-    let reply = '';
-    if (added.length) reply += `✅ أُضيفت: ${added.join(', ')}\n`;
-    if (removed.length) reply += `🗑 أُزيلت: ${removed.join(', ')}\n`;
-    if (errors.length) reply += `⚠️ لم أجد الرتب: ${errors.join(', ')}\n`;
-    if (!reply) reply = '🤷‍♂️ ما صار أي تغيير';
+    scanned += 1;
+    if (candidate) {
+      upsertCachedRow(guild.id, targetUser.id, channel.id, candidate.messageId);
+      if (!best || candidate.timestamp < best.timestamp) best = candidate;
+    }
 
-    await interaction.reply({ content: reply, ephemeral: true });
-  } catch (error) {
-    console.error('Error handling interaction:', error);
-    await interaction.reply({
-      content: '❌ حدث خطأ أثناء تحديث الأدوار',
-      ephemeral: true
-    }).catch(() => {});
+    await maybeProgress();
+    return candidate;
+  });
+
+  await runTasksWithConcurrency(tasks, 3);
+
+  if (cancelState.canceled) {
+    await interaction.editReply('Search canceled.');
+    cancelStates.delete(key);
+    return;
+  }
+
+  if (!best) {
+    await interaction.editReply(`No accessible messages found for ${targetUser.tag}.`);
+    cancelStates.delete(key);
+    return;
   }
+
+  const embed = new EmbedBuilder()
+    .setTitle('Oldest Accessible Message Found')
+    .setColor(0x5865f2)
+    .addFields(
+      { name: 'Message Link', value: best.url },
+      { name: 'Channel', value: `<#${best.channelId}>`, inline: true },
+      { name: 'Timestamp', value: `<t:${Math.floor(best.timestamp / 1000)}:F>`, inline: true },
+      {
+        name: 'Note',
+        value: 'Best-effort result across channels and threads where the bot can view and read history.',
+      },
+    )
+    .setFooter({ text: `Scanned ${channels.length} surfaces in ${Math.floor((Date.now() - started) / 1000)}s` });
+
+  await interaction.editReply({ content: '', embeds: [embed] });
+  cancelStates.delete(key);
+}
+
+async function handleCancel(interaction) {
+  const guild = interaction.guild;
+  const key = keyForRequester(guild.id, interaction.user.id);
+  const state = cancelStates.get(key);
+
+  if (!state) {
+    await interaction.reply({ content: 'No running first-message scan found.', ephemeral: true });
+    return;
+  }
+
+  state.canceled = true;
+  await interaction.reply({ content: 'Cancellation requested.', ephemeral: true });
+}
+
+async function handleUserInfo(interaction) {
+  const user = interaction.options.getUser('user', true);
+  const member = await interaction.guild.members.fetch(user.id).catch(() => null);
+  const roles = member
+    ? member.roles.cache
+      .filter((role) => role.id !== interaction.guild.id)
+      .sort((a, b) => b.position - a.position)
+      .map((role) => role.toString())
+    : [];
+
+  const embed = new EmbedBuilder()
+    .setTitle('User Info')
+    .setColor(0x2ecc71)
+    .setThumbnail(user.displayAvatarURL())
+    .addFields(
+      { name: 'ID', value: user.id },
+      { name: 'Created At', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>` },
+      { name: 'Joined At', value: member?.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>` : 'Not available' },
+      { name: 'Roles', value: roles.length ? roles.join(', ') : 'None' },
+    );
+
+  await interaction.reply({ embeds: [embed], ephemeral: true });
+}
+
+async function registerSlashCommands() {
+  if (!client.application) return;
+
+  const commandDefs = [
+    new SlashCommandBuilder()
+      .setName('firstmessage')
+      .setDescription('Find oldest accessible message from a user in this server')
+      .addUserOption((opt) => opt.setName('user').setDescription('User to search').setRequired(true)),
+    new SlashCommandBuilder().setName('firstmessage_cancel').setDescription('Cancel your running /firstmessage scan'),
+    new SlashCommandBuilder()
+      .setName('userinfo')
+      .setDescription('Display user metadata')
+      .addUserOption((opt) => opt.setName('user').setDescription('User to inspect').setRequired(true)),
+  ].map((c) => c.toJSON());
+
+  const guildId = process.env.GUILD_ID;
+  if (guildId) {
+    await client.rest.put(Routes.applicationGuildCommands(client.application.id, guildId), { body: commandDefs });
+    console.log(`Registered guild slash commands for ${guildId}`);
+  } else {
+    await client.rest.put(Routes.applicationCommands(client.application.id), { body: commandDefs });
+    console.log('Registered global slash commands');
+  }
+}
+
+client.once('ready', async () => {
+  console.log(`Logged in as ${client.user.tag}`);
+  initializeDb();
+  await registerSlashCommands();
 });
 
-client.login(process.env.TOKEN);
+client.on('interactionCreate', async (interaction) => {
+  if (!interaction.isChatInputCommand() || !interaction.guild) return;
 
-app.get('/', (req, res) => res.send('Bot is running!'));
-app.listen(3000, () => console.log('🌐 Web server is live'));
+  try {
+    if (interaction.commandName === 'firstmessage') return await handleFirstMessage(interaction);
+    if (interaction.commandName === 'firstmessage_cancel') return await handleCancel(interaction);
+    if (interaction.commandName === 'userinfo') return await handleUserInfo(interaction);
+  } catch (error) {
+    console.error(error);
+    if (interaction.replied || interaction.deferred) {
+      await interaction.editReply('An error occurred while executing this command.').catch(() => {});
+    } else {
+      await interaction.reply({ content: 'An error occurred while executing this command.', ephemeral: true }).catch(() => {});
+    }
+  }
+});
 
+client.login(TOKEN);

