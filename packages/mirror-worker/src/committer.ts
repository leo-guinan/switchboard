import { execSync } from "child_process";
import type { Event } from "@switchboard/shared";

export class Committer {
  private repoPath: string;
  private batchSize: number;
  private timeoutMs: number;
  private pendingEvents: Event[] = [];
  private timeoutHandle: NodeJS.Timeout | null = null;

  constructor(repoPath: string, batchSize: number, timeoutMs: number) {
    this.repoPath = repoPath;
    this.batchSize = batchSize;
    this.timeoutMs = timeoutMs;
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
  }

  flush(): void {
    if (this.pendingEvents.length > 0) {
      this.commit();
    }
  }
}
