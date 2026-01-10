import express from "express";
import { execSync } from "child_process";

export interface HealthState {
  lastCommitSha: string | null;
  lastEventId: string | null;
  lastEventTs: string | null;
  startTime: number;
  feedIds: string[];
}

class HealthServer {
  private state: HealthState;
  private app: express.Application;
  private server: ReturnType<express.Application["listen"]> | null = null;
  private repoPath: string;

  constructor(feedIds: string[], repoPath: string) {
    this.repoPath = repoPath;
    this.state = {
      lastCommitSha: null,
      lastEventId: null,
      lastEventTs: null,
      startTime: Date.now(),
      feedIds,
    };

    this.app = express();
    this.app.get("/health", (_req, res) => {
      const uptimeSeconds = Math.floor((Date.now() - this.state.startTime) / 1000);
      
      res.json({
        status: "ok",
        last_commit_sha: this.state.lastCommitSha,
        last_event_id: this.state.lastEventId,
        last_event_ts: this.state.lastEventTs,
        uptime_seconds: uptimeSeconds,
        feed_ids: this.state.feedIds,
      });
    });
  }

  updateLastCommit(pushed: boolean = false): void {
    // Only update if this commit was pushed (per requirement: "most recent commit pushed")
    if (!pushed) {
      return;
    }
    
    try {
      // Get the most recent commit SHA
      const sha = execSync("git rev-parse HEAD", {
        cwd: this.repoPath,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      }).trim();
      
      this.state.lastCommitSha = sha;
    } catch (err) {
      // If git command fails (e.g., no commits yet), keep lastCommitSha as null
      console.error("[Health] Failed to get last commit SHA:", err);
    }
  }

  updateLastEvent(eventId: string, eventTs: string): void {
    this.state.lastEventId = eventId;
    this.state.lastEventTs = eventTs;
  }

  start(port: number = 3001): void {
    this.server = this.app.listen(port, () => {
      console.log(`[Health] Health server listening on port ${port}`);
    });
  }

  stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }
}

export function createHealthServer(feedIds: string[], repoPath: string): HealthServer {
  return new HealthServer(feedIds, repoPath);
}

