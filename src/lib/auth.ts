import { supabase } from "./supabase";
import type { Profile } from "@/types";
import { autoFollowFounders } from "./posts";

export async function signUp(
  email: string,
  password: string,
  username: string,
  displayName: string,
  gender?: string,
  accountType: string = "personal",
  musicianAgreement?: { signature: string; agreeFee: boolean; agreeCopyright: boolean }
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        display_name: displayName,
        gender: gender || null,
        account_type: accountType || "personal",
        guidelines_accepted: true,
        musician_signature: musicianAgreement?.signature || null,
        musician_agree_fee: musicianAgreement?.agreeFee || false,
        musician_agree_copyright: musicianAgreement?.agreeCopyright || false,
      },
    },
  });

  if (!error && data.user) {
    const uid = data.user.id;
    const type = accountType || "personal";
    // Persist account type immediately (trigger may be outdated)
    setTimeout(async () => {
      try {
        const patch: Record<string, unknown> = {
          account_type: type,
          guidelines_accepted_at: new Date().toISOString(),
        };
        if (type === "business") {
          patch.avatar_url = null;
        }
        if (musicianAgreement?.signature) {
          patch.musician_agreement_signature = musicianAgreement.signature;
          patch.musician_agreement_signed_at = new Date().toISOString();
        }
        await supabase.from("profiles").update(patch).eq("id", uid);
      } catch (e) {
        console.error("Could not save account type / agreements", e);
      }
    }, 1500);
  }

  // After successful signup, auto-follow @thevip + @kendall.vip (every account, no exceptions)
  if (!error && data.user) {
    const uid = data.user.id;
    // Profile is created by DB trigger — delay then follow; second attempt if needed
    setTimeout(async () => {
      try {
        await autoFollowFounders(uid);
      } catch (e) {
        console.error("Auto-follow founders failed:", e);
      }
    }, 1500);
    setTimeout(async () => {
      try {
        await autoFollowFounders(uid);
      } catch (e) {
        console.error("Auto-follow founders retry failed:", e);
      }
    }, 4000);
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


export async function updateUserEmail(newEmail: string) {
  const { data, error } = await supabase.auth.updateUser({ email: newEmail });
  return { data, error };
}

export async function updateUserPassword(newPassword: string) {
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  return { data, error };
}

export async function resetPasswordForEmail(email: string) {
  const redirectTo =
    (typeof window !== "undefined" ? window.location.origin : "") + "/reset-password";
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });
  return { data, error };
}
