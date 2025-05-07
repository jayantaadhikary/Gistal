import { NextResponse, NextRequest } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: NextRequest) {
  const { input, style, model } = await req.json();

  const prompts: Record<string, string> = {
    tldr: `Summarize the following text in short and brief TL;DR:\n\n${input}`,
    bullet: `Summarize the following text into few bullet points:\n\n${input}`,
    eli5: `Explain this like I'm 5 in few simple sentences:\n\n${input}`,
  };

  const differentModels: Record<string, string> = {
    llama3: "llama-3.1-8b-instant",
    gemma2: "gemma2-9b-it",
  };

  try {
    const chatCompletion = await groq.chat.completions.create({
      model: differentModels[model],
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that summarizes content.",
        },
        {
          role: "user",
          content: prompts[style],
        },
      ],
    });
    const summary =
      chatCompletion.choices[0]?.message?.content ||
      "Failed to generate summary.";

    return NextResponse.json({ summary });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { summary: "Failed to generate summary." },
      { status: 500 }
    );
  }
}
