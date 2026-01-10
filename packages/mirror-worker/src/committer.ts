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
  private onCommitCallback?: (pushed: boolean) => void;

  constructor(
    repoPath: string,
    batchSize: number,
    timeoutMs: number,
    githubConfig?: GitHubConfig,
    onCommitCallback?: (pushed: boolean) => void
  ) {
    this.repoPath = repoPath;
    this.batchSize = batchSize;
    this.timeoutMs = timeoutMs;
    this.githubConfig = githubConfig;
    this.onCommitCallback = onCommitCallback;
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

    let pushed = false;
    if (this.githubConfig) {
      pushed = this.pushToGitHub();
    }
    
    if (this.onCommitCallback) {
      this.onCommitCallback(pushed);
    }
  }

  private pushToGitHub(): boolean {
    if (!this.githubConfig) {
      return false;
    }

    const { branch } = this.githubConfig;

    if (!checkAppendOnly(this.repoPath, branch)) {
      console.error("Append-only check failed, skipping push");
      return false;
    }

    if (!fetchAndRebase(this.repoPath, branch)) {
      console.error("Fetch/rebase failed, skipping push (will retry next batch)");
      return false;
    }

    if (!pushToRemote(this.repoPath, branch)) {
      console.error("Push failed, will retry next batch");
      return false;
    }

    return true;
  }

  flush(): void {
    if (this.pendingEvents.length > 0) {
      this.commit();
    }
  }
}
