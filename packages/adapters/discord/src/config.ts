function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  discordToken: requiredEnv("DISCORD_BOT_TOKEN"),
  discordAppId: requiredEnv("DISCORD_APP_ID"),
  guildId: requiredEnv("DISCORD_GUILD_ID"),
  channelId: requiredEnv("DISCORD_CHANNEL_ID"),
  relayBaseUrl: requiredEnv("RELAY_BASE_URL"),
  feedId: requiredEnv("FEED_ID"),
  adapterId: process.env.ADAPTER_ID ?? "discord-1",
  authorIdentityId: process.env.AUTHOR_IDENTITY_ID,
};

