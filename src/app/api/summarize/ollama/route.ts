import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";
import { createClient } from "@supabase/supabase-js";

// Create admin Supabase client to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { input, style, model } = await req.json();

    const prompts: Record<string, string> = {
      tldr: `Summarize the following text in a short and brief TL;DR:\n\n${input}`,
      bullet: `Summarize the following text into a few bullet points:\n\n${input}`,
      eli5: `Explain this like I'm 5 in a few simple sentences:\n\n${input}`,
    };

    // Extract auth token from headers
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "") || null;

    console.log("Auth header present:", !!authHeader);

    let user_id: string | null = null;

    if (token) {
      try {
        // Verify the token with Supabase
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser(token);
        if (error) {
          console.error("Auth error:", error);
        } else if (user) {
          user_id = user.id;
          console.log("Authenticated user:", user_id);
        }
      } catch (authError) {
        console.error("Auth verification error:", authError);
      }
    }

    // Skip counting for now if Ollama isn't running
    // let ollamaAvailable = true;
    // try {
    //   const testResponse = await fetch("http://localhost:11434/api/health", {
    //     method: "GET",
    //   });
    //   ollamaAvailable = testResponse.ok;
    // } catch (e) {
    //   ollamaAvailable = false;
    //   return NextResponse.json(
    //     {
    //       summary:
    //         "Error: Ollama API is not running. Please start the Ollama service.",
    //     },
    //     { status: 500 }
    //   );
    // }

    // Determine limit based on user status
    if (user_id) {
      // Logged-in: Check and update user's summary count using admin client
      try {
        // First check if user exists in summary_counts
        const { data: existingData, error: existingErr } = await supabaseAdmin
          .from("summary_counts")
          .select("count")
          .eq("user_id", user_id)
          .maybeSingle();

        if (existingErr && existingErr.code !== "PGRST116") {
          console.error("Error checking existing count:", existingErr);
        }

        if (existingData) {
          // User exists, check count
          if (existingData.count >= 5) {
            return NextResponse.json(
              {
                summary:
                  "Free limit reached (5 summaries max for logged-in users).",
              },
              { status: 403 }
            );
          }

          // Update existing count
          const { error: updateErr } = await supabaseAdmin
            .from("summary_counts")
            .update({ count: existingData.count + 1 })
            .eq("user_id", user_id);

          if (updateErr) {
            console.error("Error updating count:", updateErr);
          }
        } else {
          // User doesn't exist, create new entry
          const { error: insertErr } = await supabaseAdmin
            .from("summary_counts")
            .insert([
              {
                user_id: user_id,
                count: 1,
                last_reset: new Date().toISOString(),
              },
            ]);

          if (insertErr) {
            console.error("Error inserting new count:", insertErr);
          }
        }
      } catch (dbError) {
        console.error("Database operation error:", dbError);
      }
    } else {
      console.log("Processing as guest user");
      // Guest user: Enforce 1-summary-per-device using cookies
      const cookieKey = "guest_summary_used";
      if (req.cookies.get(cookieKey)?.value === "true") {
        return NextResponse.json(
          {
            summary:
              "Guest users can only summarize once. Please log in for more free summaries.",
          },
          { status: 403 }
        );
      }
    }

    console.log("Calling Ollama API...");

    // Call Ollama API
    let response;
    try {
      response = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt: prompts[style],
          stream: false,
        }),
      });
    } catch (ollamaError) {
      console.error("Ollama API connection error:", ollamaError);
      return NextResponse.json(
        { summary: "Error connecting to Ollama API. Is it running?" },
        { status: 500 }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Ollama API error:", errorText);
      return NextResponse.json(
        { summary: `Ollama API error: ${response.status} ${errorText}` },
        { status: 500 }
      );
    }

    const result = await response.json();

    // Set cookie for guest summary use
    const res = NextResponse.json({ summary: result.response });
    if (!user_id) {
      res.cookies.set("guest_summary_used", "true", {
        maxAge: 60 * 60 * 24 * 365, // 1 year
        path: "/",
      });
    }
    return res;
  } catch (error) {
    console.error("General API error:", error);
    return NextResponse.json(
      { summary: "Failed to generate summary. See server logs for details." },
      { status: 500 }
    );
  }
}
