const { Client, GatewayIntentBits } = require('discord.js');
const db = new (require('@railway/database').RailwayDB)(); // Railway's built-in DB

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.MessageContent]
});

const OWNER_ID = process.env.OWNER_ID;

client.once('ready', () => {
  console.log(`Nametag Bot online → ${client.user.tag}`);
});

// Commands
client.on('messageCreate', async message => {
  if (!message.content.startsWith('!') || message.author.bot) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // !customtag @user [CoolTag]
  if (command === 'customtag' && message.author.id === OWNER_ID) {
    const member = message.mentions.members?.first();
    const tag = args.slice(1).join(' ');
    if (member && tag) {
      await db.set(`tag_${member.id}`, tag);
      message.reply(`Set **${tag}** for ${member.user.tag}`);
      updateNick(member);
    } else message.reply('Usage: !customtag @user [CoolTag]');
  }

  // !removetag @user
  if (command === 'removetag' && message.author.id === OWNER_ID) {
    const member = message.mentions.members?.first();
    if (member) {
      await db.delete(`tag_${member.id}`);
      message.reply(`Removed tag from ${member.user.tag}`);
      updateNick(member);
    }
  }

  // !refresh or !refresh @user
  if (command === 'refresh') {
    const member = message.mentions.members?.first() || message.member;
    updateNick(member);
    message.react('✅');
  }
});

// Auto-update on role change or join
client.on('guildMemberUpdate', (oldM, newM) => updateNick(newM));
client.on('guildMemberAdd', member => setTimeout(() => updateNick(member), 6000));

async function updateNick(member) {
  try {
    let prefix = await db.get(`tag_${member.id}`); // Custom tag first

    // Role-based tags (add your own here)
    if (!prefix && member.roles.cache.some(r => r.name === 'VIP')) prefix = '[VIP]';
    if (!prefix && member.roles.cache.some(r => r.name === 'Moderator')) prefix = '[MOD]';
    if (!prefix && member.roles.cache.some(r => r.name === 'Booster')) prefix = '[BOOST]';
    // Add more: if (!prefix && member.roles.cache.has('ROLE_ID')) prefix = '[TAG]';

    const cleanName = member.displayName.replace(/^$$ [^ $$]+\]\s*|\s*$$ [^ $$]+\]$/g, '').trim();
    const newNick = prefix ? `${prefix} ${cleanName}`.slice(0, 32) : cleanName.slice(0, 32);

    if (member.nickname !== newNick && member.manageable) {
      await member.setNickname(newNick).catch(() => {});
    }
  } catch (e) {
    console.log('Update error:', e);
  }
}

client.login(process.env.TOKEN);
