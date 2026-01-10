import { useState } from "react";
import type { EventData } from "../hooks/useEventStream";

interface EventCardProps {
  event: EventData;
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

export function EventCard({ event }: EventCardProps) {
  const [expanded, setExpanded] = useState(false);

  const payloadString = JSON.stringify(event.payload);
  const needsTruncation = payloadString.length > 100;
  const displayPayload = needsTruncation && !expanded
    ? payloadString.slice(0, 100) + "..."
    : payloadString;

  return (
    <div className="rounded border border-gray-200 p-4 shadow-sm bg-white">
      <div className="flex items-center gap-2 mb-2">
        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded">
          {event.type}
        </span>
        <span className="text-xs text-gray-500">{event.source.platform}</span>
      </div>

      <div className="text-sm text-gray-700 mb-1">
        <span className="font-medium">Author:</span> {event.author_identity_id}
      </div>

      <div className="text-sm text-gray-500 mb-2">
        {formatRelativeTime(event.ts)}
      </div>

      <div className="text-sm text-gray-600">
        <span className="font-medium">Payload:</span>{" "}
        <span className="break-all">{displayPayload}</span>
        {needsTruncation && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="ml-2 text-blue-600 hover:text-blue-800 text-sm underline"
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        )}
      </div>
    </div>
  );
}
