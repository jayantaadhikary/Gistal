import { supabase } from "./supabase";

//  google sign in
export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
  });

  if (error) {
    console.error("Error signing in with Google:", error);
    return;
  } else {
    console.log("User signed in with Google");
  }

  return data;
};
