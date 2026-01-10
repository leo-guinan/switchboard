export type ViewMode = "cards" | "raw";

interface ViewToggleProps {
  viewMode: ViewMode;
  onViewChange: (mode: ViewMode) => void;
}

export function ViewToggle({ viewMode, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
      <button
        onClick={() => onViewChange("cards")}
        className={`px-4 py-2 rounded-md transition-colors ${
          viewMode === "cards"
            ? "bg-blue-600 text-white border border-blue-600"
            : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
        }`}
      >
        Cards
      </button>
      <button
        onClick={() => onViewChange("raw")}
        className={`px-4 py-2 rounded-md transition-colors ${
          viewMode === "raw"
            ? "bg-blue-600 text-white border border-blue-600"
            : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
        }`}
      >
        Raw JSON
      </button>
    </div>
  );
}
