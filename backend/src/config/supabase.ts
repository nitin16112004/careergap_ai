import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "./env";

let anonClient: SupabaseClient | undefined;
let serviceClient: SupabaseClient | undefined;

export const getSupabaseAnonClient = (): SupabaseClient => {
  if (!anonClient) {
    const env = getEnv();
    anonClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
  }
  return anonClient;
};

export const getSupabaseServiceClient = (): SupabaseClient => {
  if (!serviceClient) {
    const env = getEnv();
    serviceClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
  }
  return serviceClient;
};

export const getSupabaseStorageClient = (): SupabaseClient => getSupabaseServiceClient();
