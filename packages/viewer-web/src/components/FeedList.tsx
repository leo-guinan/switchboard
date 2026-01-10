import { useEffect, useState } from "react";

interface Feed {
  id: string;
  name: string;
  policy_json: unknown;
  created_at: string;
}

interface FeedListProps {
  onSelectFeed: (feedId: string) => void;
  selectedFeedId?: string;
}

export function FeedList({ onSelectFeed, selectedFeedId }: FeedListProps) {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/feeds")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch feeds: ${res.status}`);
        }
        return res.json();
      })
      .then((data: Feed[]) => {
        setFeeds(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="p-4 text-gray-600">Loading...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">Error: {error}</div>;
  }

  if (feeds.length === 0) {
    return <div className="p-4 text-gray-600">No feeds available</div>;
  }

  return (
    <div className="flex flex-col gap-1">
      {feeds.map((feed) => (
        <button
          key={feed.id}
          onClick={() => onSelectFeed(feed.id)}
          className={`text-left px-3 py-2 rounded transition-colors ${
            selectedFeedId === feed.id
              ? "bg-blue-600 text-white"
              : "hover:bg-gray-100 text-gray-800"
          }`}
        >
          {feed.name}
        </button>
      ))}
    </div>
  );
}
