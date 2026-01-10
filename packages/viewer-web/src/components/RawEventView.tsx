import type { EventData } from "../hooks/useEventStream";

interface RawEventViewProps {
  events: EventData[];
}

export function RawEventView({ events }: RawEventViewProps) {
  return (
    <div className="space-y-3 max-h-[600px] overflow-y-auto">
      {events.map((event) => (
        <pre
          key={event.event_id}
          className="bg-gray-100 p-4 rounded border border-gray-200 overflow-x-auto"
        >
          <code className="font-mono text-sm text-gray-800">
            {JSON.stringify(event, null, 2)}
          </code>
        </pre>
      ))}
    </div>
  );
}
