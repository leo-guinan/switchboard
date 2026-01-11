import {
  Events,
  type GuildTextBasedChannel,
  type Interaction,
  type Message,
} from "discord.js";
import { randomUUID } from "node:crypto";
import { config } from "./config.js";
import { postEvent } from "./relay/api.js";
import { subscribeToFeedStream } from "./relay/sse.js";
import { registerCommands } from "./discord/commands.js";
import { formatTask } from "./discord/format.js";
import { createDiscordClient } from "./discord/client.js";
import type { DiscordMessageEvent, TaskEvent } from "./relay/types.js";

async function main(): Promise<void> {
  const client = createDiscordClient();
  const messageToEvent = new Map<string, string>();

  client.once(Events.ClientReady, async () => {
    console.log(`Discord adapter logged in as ${client.user?.tag}`);
    await registerCommands();
    console.log("Slash commands registered");

    subscribeToFeedStream(async (evt) => {
      if (!evt || evt.feed_id !== config.feedId) return;
      if (evt.source?.platform === "discord") return;
      if (evt.type !== "task") return;

      const channel = await client.channels.fetch(config.channelId);
      if (!channel || !channel.isTextBased()) return;
      const textChannel = channel as GuildTextBasedChannel;
      await textChannel.send(formatTask(evt as TaskEvent));
    }).catch((err: unknown) => {
      console.error("SSE loop crashed", err);
    });
  });

  client.on(Events.MessageCreate, async (message: Message) => {
    if (message.author.bot) return;
    if (message.channelId !== config.channelId) return;
    if (!message.guildId) return;

    let refs: DiscordMessageEvent["refs"];
    const replyId = message.reference?.messageId;
    if (replyId) {
      const replyEventId = messageToEvent.get(replyId);
      if (replyEventId) {
        refs = { reply_to: replyEventId };
      }
    }

    const evt: DiscordMessageEvent = {
      event_id: randomUUID(),
      feed_id: config.feedId,
      type: "message",
      author_identity_id: `discord:user:${message.author.id}`,
      source: {
        platform: "discord",
        adapter_id: config.adapterId,
        source_msg_id: message.id,
      },
      ts: new Date(message.createdTimestamp).toISOString(),
      payload: {
        text: message.content,
        discord: {
          guild_id: message.guildId,
          channel_id: message.channelId,
          username: message.author.username,
          display_name: message.member?.displayName ?? message.author.username,
        },
      },
      refs,
    };

    try {
      await postEvent(evt);
      messageToEvent.set(message.id, evt.event_id);
    } catch (err) {
      console.error("Failed to post inbound event to relay", err);
    }
  });

  client.on(
    Events.InteractionCreate,
    async (interaction: Interaction) => {
      if (!interaction.isChatInputCommand()) return;
      if (interaction.commandName !== "task") return;

      const title = interaction.options.getString("title", true);
      const details = interaction.options.getString("details", false) ?? "";

      const evt: TaskEvent = {
        event_id: randomUUID(),
        feed_id: config.feedId,
        type: "task",
        author_identity_id:
          config.authorIdentityId ?? `discord:user:${interaction.user.id}`,
        source: {
          platform: "discord",
          adapter_id: config.adapterId,
          source_msg_id: interaction.id,
        },
        ts: new Date().toISOString(),
      payload: { title, details, acceptance_tests: [] },
      };

      try {
        await postEvent(evt);
        await interaction.reply({
          content: `✅ Task sent to feed: **${title}**`,
          ephemeral: true,
        });
      } catch (err) {
        console.error("Failed to post task event", err);
        await interaction.reply({
          content: "❌ Failed to send task to relay.",
          ephemeral: true,
        });
      }
    }
  );

  await client.login(config.discordToken);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

