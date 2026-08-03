import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://iswajdlwvxyichfbglyf.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_Sj-mESPCrjEsPqKOprW3WA_Xvpl6yM8";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
