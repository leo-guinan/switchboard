import { execSync } from "child_process";

/**
 * Build authenticated URL with PAT embedded.
 * Converts https://github.com/owner/repo.git to https://{PAT}@github.com/owner/repo.git
 */
function buildAuthenticatedUrl(repoUrl: string, pat: string): string {
  const url = new URL(repoUrl);
  url.username = pat;
  return url.toString();
}

/**
 * Configure the git remote origin with PAT authentication.
 * - If origin doesn't exist, adds it
 * - If origin exists but URL differs, updates it
 */
export function configureRemote(repoPath: string, repoUrl: string, pat: string): void {
  const authenticatedUrl = buildAuthenticatedUrl(repoUrl, pat);
  
  let currentUrl: string | null = null;
  
  try {
    currentUrl = execSync("git remote get-url origin", {
      cwd: repoPath,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    // Remote doesn't exist
    currentUrl = null;
  }

  if (currentUrl === null) {
    // Remote doesn't exist, add it
    execSync(`git remote add origin "${authenticatedUrl}"`, {
      cwd: repoPath,
      stdio: "inherit",
    });
    console.log("Configured git remote: origin (added)");
  } else if (currentUrl !== authenticatedUrl) {
    // Remote exists but URL differs, update it
    execSync(`git remote set-url origin "${authenticatedUrl}"`, {
      cwd: repoPath,
      stdio: "inherit",
    });
    console.log("Configured git remote: origin (updated)");
  } else {
    console.log("Git remote origin already configured");
  }
}

/**
 * Fetch from origin and rebase local commits on top.
 * Returns true if successful, false if rebase fails (and aborts rebase).
 */
/**
 * Check that all event file changes are append-only (no modifications or deletions).
 * Returns true if all event file changes are additions (A status).
 * Returns false if any modifications (M) or deletions (D) found.
 */
export function checkAppendOnly(repoPath: string, branch: string): boolean {
  let diffOutput: string;
  
  try {
    diffOutput = execSync(`git diff --name-status origin/${branch}..HEAD`, {
      cwd: repoPath,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch (err) {
    console.error(`Failed to get diff against origin/${branch}:`, err);
    return false;
  }

  const lines = diffOutput.trim().split("\n").filter(line => line.length > 0);
  
  for (const line of lines) {
    const [status, filePath] = line.split("\t");
    
    if (filePath && filePath.startsWith("events/")) {
      if (status !== "A") {
        console.error(`Append-only check failed: ${status} ${filePath} (only additions allowed)`);
        return false;
      }
    }
  }

  return true;
}

export function fetchAndRebase(repoPath: string, branch: string): boolean {
  try {
    execSync(`git fetch origin ${branch}`, {
      cwd: repoPath,
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch (err) {
    console.error(`Failed to fetch origin/${branch}:`, err);
    return false;
  }

  try {
    execSync(`git rebase origin/${branch}`, {
      cwd: repoPath,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return true;
  } catch (err) {
    console.error(`Rebase failed, aborting:`, err);
    try {
      execSync("git rebase --abort", {
        cwd: repoPath,
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch {
      // Ignore abort errors
    }
    return false;
  }
}

/**
 * Push local commits to remote origin.
 * Returns true on success, false on failure.
 * Logs success/error but does not throw.
 */
export function pushToRemote(repoPath: string, branch: string): boolean {
  try {
    execSync(`git push origin ${branch}`, {
      cwd: repoPath,
      stdio: ["pipe", "pipe", "pipe"],
    });
    console.log("Pushed to GitHub");
    return true;
  } catch (err) {
    console.error(`Failed to push to origin/${branch}:`, err);
    return false;
  }
}
