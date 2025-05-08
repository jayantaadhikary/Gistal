import React from "react";

function Selectors({
  style,
  setStyle,
  model,
  setModel,
}: {
  style: string;
  setStyle: (style: string) => void;
  model: string;
  setModel: (model: string) => void;
}) {
  return (
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
        <option value="gemma2">Gemma2</option>
      </select>
    </div>
  );
}

export default Selectors;
