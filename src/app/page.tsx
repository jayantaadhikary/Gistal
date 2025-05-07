"use client";
import { useState } from "react";

export default function Home() {
  const [input, setInput] = useState("");
  const [style, setStyle] = useState("tldr");
  const [model, setModel] = useState("mistral");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);

  const summarize = async () => {
    setLoading(true);
    const res = await fetch("/api/summarize", {
      method: "POST",
      body: JSON.stringify({ input, style, model }),
    });
    const data = await res.json();
    setSummary(data.summary);
    setLoading(false);
  };

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-3xl font-bold">Gistal – Local Summarizer</h1>
      <textarea
        className="w-full h-40 p-4 border rounded"
        placeholder="Paste your text..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <div className="flex justify-between items-center">
        <div className="flex">
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            className="p-2 border rounded"
          >
            <option value="tldr">TL;DR</option>
            <option value="bullet">Bullet Points</option>
            <option value="eli5">Explain Like I&apos;m 5</option>
          </select>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="p-2 border rounded ml-2"
          >
            <option value="llama3">Llama3</option>
            <option value="mistral">Mistral</option>
          </select>
        </div>
        <button
          onClick={summarize}
          className="px-4 py-2 bg-blue-600 text-white rounded"
          disabled={loading}
        >
          {loading ? "Summarizing..." : "Summarize"}
        </button>
      </div>

      {summary && (
        <div className="p-4 border rounded bg-gray-700 whitespace-pre-wrap">
          <strong>Summary:</strong>
          <p>{summary}</p>
        </div>
      )}
    </main>
  );
}
