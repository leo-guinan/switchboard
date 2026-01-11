import { REST, Routes, SlashCommandBuilder } from "discord.js";
import { config } from "../config.js";

export async function registerCommands(): Promise<void> {
  const commands = [
    new SlashCommandBuilder()
      .setName("task")
      .setDescription("Create a task in the coordination feed")
      .addStringOption((opt) =>
        opt.setName("title").setDescription("Short task title").setRequired(true)
      )
      .addStringOption((opt) =>
        opt.setName("details").setDescription("Extra details").setRequired(false)
      )
      .toJSON(),
  ];

  const rest = new REST({ version: "10" }).setToken(config.discordToken);
  await rest.put(
    Routes.applicationGuildCommands(config.discordAppId, config.guildId),
    { body: commands }
  );
}

