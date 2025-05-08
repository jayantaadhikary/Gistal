"use client";
import SummaryBox from "@/components/SummaryBox";
import Selectors from "@/components/Selectors";
import LoginButton from "@/components/LoginButton";
import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import { User } from "@supabase/supabase-js";

export default function Home() {
  const [input, setInput] = useState("");
  const [style, setStyle] = useState("tldr");
  const [model, setModel] = useState("llama3");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        setUser(data.session.user);
      }
    };

    // Set up auth state listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          setUser(session.user);
        } else {
          setUser(null);
        }
      }
    );

    checkUser();

    // Cleanup
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // const summarize = async () => {
  //   if (!input) {
  //     alert("Please enter some text to summarize.");
  //     return;
  //   }

  //   // if (!user) {
  //   //   const hasUsed = localStorage.getItem("anonymous_summary_used");
  //   //   if (hasUsed) {
  //   //     alert(
  //   //       "Guest users can only summarize once. Please log in for more free summaries."
  //   //     );
  //   //     return;
  //   //   }
  //   // }

  //   setLoading(true);

  //   const res = await fetch("/api/summarize/ollama", {
  //     method: "POST",
  //     body: JSON.stringify({ input, style, model }),
  //   });
  //   const data = await res.json();
  //   setSummary(data.summary);
  //   setLoading(false);

  //   // if (!user) {
  //   //   localStorage.setItem("anonymous_summary_used", "true");
  //   // }
  // };

  const summarize = async () => {
    if (!input) {
      alert("Please enter some text to summarize.");
      return;
    }

    setLoading(true);

    try {
      // Get the current session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await fetch("/api/summarize/groq", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify({ input, style, model }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.summary || "Failed to generate summary");
      }

      const data = await res.json();
      setSummary(data.summary);
    } catch (error) {
      console.error("Summarization error:", error);
      setSummary(
        "Error: " +
          (error instanceof Error
            ? error.message
            : "Failed to generate summary")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gistal – Text Summarizer</h1>
        <div>
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-200">
                {user.user_metadata?.full_name || user.email || "User"}
              </span>
              <button
                onClick={handleSignOut}
                className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 text-black rounded"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <LoginButton />
          )}
        </div>
      </div>

      <textarea
        className="w-full h-40 p-4 border rounded"
        placeholder="Paste your text..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <div className="flex justify-between items-center">
        <Selectors
          style={style}
          setStyle={setStyle}
          model={model}
          setModel={setModel}
        />
        <button
          onClick={summarize}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          disabled={loading}
        >
          {loading ? "Summarizing..." : "Summarize"}
        </button>
      </div>

      {summary && <SummaryBox summary={summary} />}
    </main>
  );
}
