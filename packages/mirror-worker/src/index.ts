import { getConfig, redactPat } from "./config.js";
import { initRepo, writeEvent } from "./repo.js";
import { Committer } from "./committer.js";
import { connectToFeed, SSEConnection } from "./sse.js";
import type { Event } from "@switchboard/shared";

async function main(): Promise<void> {
  const config = getConfig();

  console.log(`[Mirror] Starting mirror-worker`);
  console.log(`[Mirror] Relay URL: ${config.relayUrl}`);
  console.log(`[Mirror] Feed count: ${config.feedIds.length}`);

  if (config.github) {
    console.log(`[Mirror] GitHub mode enabled`);
    console.log(`[Mirror] GitHub PAT: ${redactPat(config.github.pat)}`);
    console.log(`[Mirror] GitHub Repo URL: ${config.github.repoUrl}`);
    console.log(`[Mirror] GitHub Branch: ${config.github.branch}`);
  } else {
    console.log(`[Mirror] Local-only mode (GitHub push disabled)`);
  }

  await initRepo(config.contextRepoPath);

  const committer = new Committer(
    config.contextRepoPath,
    config.commitBatchSize,
    config.commitBatchTimeoutMs
  );

  const connections: SSEConnection[] = [];

  for (const feedId of config.feedIds) {
    const connection = connectToFeed(config.relayUrl, feedId, async (event) => {
      await writeEvent(config.contextRepoPath, event as Event);
      committer.addEvent(event as Event);
    });
    connections.push(connection);
  }

  function shutdown(): void {
    console.log("[Mirror] Shutdown signal received, cleaning up...");

    for (const connection of connections) {
      connection.close();
    }

    committer.flush();

    console.log("[Mirror] Shutdown complete");
    process.exit(0);
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("[Mirror] Fatal error:", err);
  process.exit(1);
});
