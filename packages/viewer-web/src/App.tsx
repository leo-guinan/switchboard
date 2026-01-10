import { useState } from "react";
import { FeedList } from "./components/FeedList";
import { MirrorStatus } from "./components/MirrorStatus";
import { ViewToggle, ViewMode } from "./components/ViewToggle";
import { EventList } from "./components/EventList";

function App() {
  const [selectedFeedId, setSelectedFeedId] = useState<string>();
  const [viewMode, setViewMode] = useState<ViewMode>("cards");

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">Switchboard Viewer</h1>
      </header>

      <div className="flex-1 flex flex-col md:flex-row">
        <aside className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-gray-200 p-4 flex flex-col gap-6">
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Feeds
            </h2>
            <FeedList
              onSelectFeed={setSelectedFeedId}
              selectedFeedId={selectedFeedId}
            />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Mirror Status
            </h2>
            <MirrorStatus />
          </div>
        </aside>

        <main className="flex-1 p-6">
          {selectedFeedId ? (
            <div className="flex flex-col gap-4">
              <ViewToggle viewMode={viewMode} onViewChange={setViewMode} />
              <EventList feedId={selectedFeedId} viewMode={viewMode} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              Select a feed
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
