import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { input, style, model } = await req.json();

  const prompts: Record<string, string> = {
    tldr: `Summarize the following text in a short and brief TL;DR:\n\n${input}`,
    bullet: `Summarize the following text into a few bullet points:\n\n${input}`,
    eli5: `Explain this like I’m 5 in a few simple sentences:\n\n${input}`,
  };

  try {
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model,
        prompt: prompts[style],
        stream: false,
      }),
    });

    const result = await response.json();
    return NextResponse.json({ summary: result.response });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { summary: "Failed to generate summary." },
      { status: 500 }
    );
  }
}
