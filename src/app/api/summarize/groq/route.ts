import { NextResponse, NextRequest } from "next/server";
import Groq from "groq-sdk";
import { supabase } from "../../../lib/supabase";
import { createClient } from "@supabase/supabase-js";

// Create admin Supabase client to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
);

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
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

    console.log("Calling GROQ API...");

    // Call Groq API
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

      // Set cookie for guest summary use
      const res = NextResponse.json({ summary });
      if (!user_id) {
        res.cookies.set("guest_summary_used", "true", {
          maxAge: 60 * 60 * 24 * 365, // 1 year
          path: "/",
        });
      }
      return res;
    } catch (groqError) {
      console.error("GROQ API error:", groqError);
      return NextResponse.json(
        { summary: "Error calling GROQ API. Please try again later." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("General API error:", error);
    return NextResponse.json(
      { summary: "Failed to generate summary. See server logs for details." },
      { status: 500 }
    );
  }
}

// import { NextResponse, NextRequest } from "next/server";
// import Groq from "groq-sdk";

// const groq = new Groq({
//   apiKey: process.env.GROQ_API_KEY,
// });

// export async function POST(req: NextRequest) {
//   const { input, style, model } = await req.json();

//   const prompts: Record<string, string> = {
//     tldr: `Summarize the following text in short and brief TL;DR:\n\n${input}`,
//     bullet: `Summarize the following text into few bullet points:\n\n${input}`,
//     eli5: `Explain this like I'm 5 in few simple sentences:\n\n${input}`,
//   };

//   const differentModels: Record<string, string> = {
//     llama3: "llama-3.1-8b-instant",
//     gemma2: "gemma2-9b-it",
//   };

//   try {
//     const chatCompletion = await groq.chat.completions.create({
//       model: differentModels[model],
//       messages: [
//         {
//           role: "system",
//           content: "You are a helpful assistant that summarizes content.",
//         },
//         {
//           role: "user",
//           content: prompts[style],
//         },
//       ],
//     });
//     const summary =
//       chatCompletion.choices[0]?.message?.content ||
//       "Failed to generate summary.";

//     return NextResponse.json({ summary });
//   } catch (error) {
//     console.error(error);
//     return NextResponse.json(
//       { summary: "Failed to generate summary." },
//       { status: 500 }
//     );
//   }
// }
