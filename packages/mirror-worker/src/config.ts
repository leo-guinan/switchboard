export interface GitHubConfig {
  pat: string;
  repoUrl: string;
  branch: string;
}

export interface Config {
  relayUrl: string;
  feedIds: string[];
  contextRepoPath: string;
  commitBatchSize: number;
  commitBatchTimeoutMs: number;
  github?: GitHubConfig;
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

  const githubPat = process.env.GITHUB_PAT;
  const githubRepoUrl = process.env.GITHUB_REPO_URL;
  const githubBranch = process.env.GITHUB_BRANCH || "main";

  let github: GitHubConfig | undefined;
  if (githubPat && githubRepoUrl) {
    github = {
      pat: githubPat,
      repoUrl: githubRepoUrl,
      branch: githubBranch,
    };
  }

  return {
    relayUrl,
    feedIds,
    contextRepoPath,
    commitBatchSize,
    commitBatchTimeoutMs,
    github,
  };
}

export function redactPat(pat: string): string {
  if (pat.length <= 4) {
    return "****";
  }
  return pat.substring(0, 4) + "***";
}
