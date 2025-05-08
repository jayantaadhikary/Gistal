import React from "react";

function SummaryBox({ summary }: { summary: string }) {
  return (
    <div className="p-4 border rounded bg-gray-700 whitespace-pre-wrap">
      <strong>Summary:</strong>
      <p>{summary}</p>
      <button
        onClick={() => navigator.clipboard.writeText(summary)}
        className="mt-2 text-sm text-blue-500 underline hover:text-blue-700 transition"
      >
        Copy Summary
      </button>
    </div>
  );
}

export default SummaryBox;
