export interface Config {
  relayUrl: string;
  feedIds: string[];
  contextRepoPath: string;
  commitBatchSize: number;
  commitBatchTimeoutMs: number;
}

export function getConfig(): Config {
  const relayUrl = process.env.RELAY_URL;
  if (!relayUrl) {
    throw new Error("RELAY_URL environment variable is required");
  }

  const feedIdsRaw = process.env.FEED_IDS;
  if (!feedIdsRaw) {
    throw new Error("FEED_IDS environment variable is required");
  }
  const feedIds = feedIdsRaw.split(",").map((id) => id.trim()).filter((id) => id.length > 0);
  if (feedIds.length === 0) {
    throw new Error("FEED_IDS must contain at least one feed ID");
  }

  const contextRepoPath = process.env.CONTEXT_REPO_PATH;
  if (!contextRepoPath) {
    throw new Error("CONTEXT_REPO_PATH environment variable is required");
  }

  const commitBatchSize = process.env.COMMIT_BATCH_SIZE
    ? parseInt(process.env.COMMIT_BATCH_SIZE, 10)
    : 10;

  const commitBatchTimeoutMs = process.env.COMMIT_BATCH_TIMEOUT_MS
    ? parseInt(process.env.COMMIT_BATCH_TIMEOUT_MS, 10)
    : 5000;

  return {
    relayUrl,
    feedIds,
    contextRepoPath,
    commitBatchSize,
    commitBatchTimeoutMs,
  };
}
