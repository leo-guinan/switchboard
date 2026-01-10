import { useEffect, useState } from "react";

interface HealthData {
  status: string;
  last_commit_sha: string | null;
  last_event_id: string | null;
  last_event_ts: string | null;
  uptime_seconds: number;
  feed_ids: string[];
}

function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const eventTime = new Date(timestamp).getTime();
  const diffMs = now - eventTime;
  const diffSeconds = Math.floor(diffMs / 1000);
  
  if (diffSeconds < 60) {
    return diffSeconds <= 1 ? "just now" : `${diffSeconds} seconds ago`;
  }
  
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return diffMinutes === 1 ? "1 minute ago" : `${diffMinutes} minutes ago`;
  }
  
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
  }
  
  const diffDays = Math.floor(diffHours / 24);
  return diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;
}

export function MirrorStatus() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const fetchHealth = () => {
      fetch("/mirror/health")
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Failed to fetch health: ${res.status}`);
          }
          return res.json();
        })
        .then((data: HealthData) => {
          setHealth(data);
          setOffline(false);
        })
        .catch(() => {
          setHealth(null);
          setOffline(true);
        });
    };

    fetchHealth();

    const interval = setInterval(fetchHealth, 10000);

    return () => clearInterval(interval);
  }, []);

  if (offline) {
    return (
      <div className="p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">
        Mirror offline
      </div>
    );
  }

  if (!health) {
    return (
      <div className="p-3 text-gray-600 text-sm">Loading mirror status...</div>
    );
  }

  return (
    <div className="p-3 rounded border border-gray-200 bg-gray-50 text-sm">
      <div className="font-medium text-gray-800 mb-2">Mirror Status</div>
      
      <div className="space-y-1 text-gray-600">
        <div>
          <span className="font-medium">Last Commit:</span>{" "}
          {health.last_commit_sha
            ? <code className="font-mono text-xs bg-gray-200 px-1 rounded">{health.last_commit_sha.slice(0, 7)}</code>
            : <span className="text-gray-400">None</span>}
        </div>
        
        <div>
          <span className="font-medium">Last Event ID:</span>{" "}
          {health.last_event_id
            ? <code className="font-mono text-xs bg-gray-200 px-1 rounded">{health.last_event_id}</code>
            : <span className="text-gray-400">None</span>}
        </div>
        
        <div>
          <span className="font-medium">Last Event:</span>{" "}
          {health.last_event_ts
            ? formatRelativeTime(health.last_event_ts)
            : <span className="text-gray-400">None</span>}
        </div>
      </div>
    </div>
  );
}
