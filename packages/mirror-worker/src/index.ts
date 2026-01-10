import { getConfig, redactPat } from "./config.js";
import { initRepo, writeEvent } from "./repo.js";
import { Committer } from "./committer.js";
import { connectToFeed, SSEConnection } from "./sse.js";
import { acquireLock, updateHeartbeat } from "./lock.js";
import { configureRemote } from "./git.js";
import type { Event } from "@switchboard/shared";

const HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds

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

  if (config.github) {
    configureRemote(config.contextRepoPath, config.github.repoUrl, config.github.pat);
  }

  acquireLock(config.contextRepoPath);
  const heartbeatInterval = setInterval(() => {
    updateHeartbeat(config.contextRepoPath);
  }, HEARTBEAT_INTERVAL_MS);

  const committer = new Committer(
    config.contextRepoPath,
    config.commitBatchSize,
    config.commitBatchTimeoutMs,
    config.github
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

    clearInterval(heartbeatInterval);

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
