import { getConfig } from "./config.js";
import { initRepo, writeEvent } from "./repo.js";
import { Committer } from "./committer.js";
import { connectToFeed } from "./sse.js";
import type { Event } from "@switchboard/shared";

async function main(): Promise<void> {
  const config = getConfig();

  console.log(`[Mirror] Starting mirror-worker`);
  console.log(`[Mirror] Relay URL: ${config.relayUrl}`);
  console.log(`[Mirror] Feed count: ${config.feedIds.length}`);

  await initRepo(config.contextRepoPath);

  const committer = new Committer(
    config.contextRepoPath,
    config.commitBatchSize,
    config.commitBatchTimeoutMs
  );

  for (const feedId of config.feedIds) {
    connectToFeed(config.relayUrl, feedId, async (event) => {
      await writeEvent(config.contextRepoPath, event as Event);
      committer.addEvent(event as Event);
    });
  }
}

main().catch((err) => {
  console.error("[Mirror] Fatal error:", err);
  process.exit(1);
});
