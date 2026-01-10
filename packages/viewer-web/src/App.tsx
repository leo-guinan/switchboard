import { useState } from "react";
import { FeedList } from "./components/FeedList";

function App() {
  const [selectedFeedId, setSelectedFeedId] = useState<string>();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold text-gray-900">Switchboard Viewer</h1>
      <div className="mt-4">
        <h2 className="text-lg font-semibold text-gray-700 mb-2">Feeds</h2>
        <FeedList 
          onSelectFeed={setSelectedFeedId} 
          selectedFeedId={selectedFeedId} 
        />
        {selectedFeedId && (
          <p className="mt-4 text-gray-600">Selected feed: {selectedFeedId}</p>
        )}
      </div>
    </div>
  );
}

export default App;

