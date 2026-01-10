import { execSync } from "child_process";
import type { Event } from "@switchboard/shared";
import type { GitHubConfig } from "./config.js";
import { checkAppendOnly, fetchAndRebase, pushToRemote } from "./git.js";

export class Committer {
  private repoPath: string;
  private batchSize: number;
  private timeoutMs: number;
  private pendingEvents: Event[] = [];
  private timeoutHandle: NodeJS.Timeout | null = null;
  private githubConfig?: GitHubConfig;

  constructor(
    repoPath: string,
    batchSize: number,
    timeoutMs: number,
    githubConfig?: GitHubConfig
  ) {
    this.repoPath = repoPath;
    this.batchSize = batchSize;
    this.timeoutMs = timeoutMs;
    this.githubConfig = githubConfig;
  }

  addEvent(event: Event): void {
    this.pendingEvents.push(event);

    if (this.pendingEvents.length >= this.batchSize) {
      this.commit();
    } else {
      this.scheduleTimeout();
    }
  }

  private scheduleTimeout(): void {
    if (this.timeoutHandle !== null) {
      return;
    }
    this.timeoutHandle = setTimeout(() => {
      if (this.pendingEvents.length > 0) {
        this.commit();
      }
    }, this.timeoutMs);
  }

  private clearTimeout(): void {
    if (this.timeoutHandle !== null) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }
  }

  commit(): void {
    if (this.pendingEvents.length === 0) {
      return;
    }

    this.clearTimeout();
    const eventCount = this.pendingEvents.length;
    this.pendingEvents = [];

    execSync("git add -A", { cwd: this.repoPath, stdio: "inherit" });
    execSync(`git commit -m "Mirror: add ${eventCount} event(s)"`, {
      cwd: this.repoPath,
      stdio: "inherit",
    });

    console.log(`Committed ${eventCount} event(s)`);

    if (this.githubConfig) {
      this.pushToGitHub();
    }
  }

  private pushToGitHub(): void {
    if (!this.githubConfig) {
      return;
    }

    const { branch } = this.githubConfig;

    if (!checkAppendOnly(this.repoPath, branch)) {
      console.error("Append-only check failed, skipping push");
      return;
    }

    if (!fetchAndRebase(this.repoPath, branch)) {
      console.error("Fetch/rebase failed, skipping push (will retry next batch)");
      return;
    }

    if (!pushToRemote(this.repoPath, branch)) {
      console.error("Push failed, will retry next batch");
      return;
    }
  }

  flush(): void {
    if (this.pendingEvents.length > 0) {
      this.commit();
    }
  }
}
