import { useEventStream } from "../hooks/useEventStream";
import { EventCard } from "./EventCard";
import { RawEventView } from "./RawEventView";
import type { ViewMode } from "./ViewToggle";

interface EventListProps {
  feedId: string | null;
  viewMode: ViewMode;
}

export function EventList({ feedId, viewMode }: EventListProps) {
  const { events, isConnected, error } = useEventStream(feedId);

  if (!feedId) {
    return (
      <div className="text-gray-500 text-center py-8">
        Select a feed to view events
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Status:</span>
          {isConnected ? (
            <span className="flex items-center gap-1 text-green-600">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Connected
            </span>
          ) : (
            <span className="flex items-center gap-1 text-red-600">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              Disconnected
            </span>
          )}
        </div>
        <div className="text-sm text-gray-600">
          {events.length} event{events.length !== 1 ? "s" : ""}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      {events.length === 0 ? (
        <div className="text-gray-500 text-center py-8">
          Waiting for events...
        </div>
      ) : viewMode === "cards" ? (
        <div className="space-y-3">
          {events.map((event) => (
            <EventCard key={event.event_id} event={event} />
          ))}
        </div>
      ) : (
        <RawEventView events={events} />
      )}
    </div>
  );
}
