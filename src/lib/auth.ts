import { supabase } from "./supabase";
import type { Profile } from "@/types";
import { autoFollowFounders } from "./posts";

export async function signUp(
  email: string,
  password: string,
  username: string,
  displayName: string,
  gender?: string
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        display_name: displayName,
        gender: gender || null,
      },
    },
  });

  // After successful signup, auto-follow founders (thevip + kendall.vip)
  if (!error && data.user) {
    // Profile is created by DB trigger — small delay then follow
    setTimeout(async () => {
      try {
        await autoFollowFounders(data.user!.id);
      } catch (e) {
        console.error("Auto-follow founders failed:", e);
      }
    }, 1500);
  }

  return { data, error };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Error fetching profile:", error);
    return null;
  }
  return data;
}

export function onAuthStateChange(callback: (user: any) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
}
