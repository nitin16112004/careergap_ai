import { getSupabaseServiceClient } from "../config/supabase";

export const getDatabaseClient = () => getSupabaseServiceClient();

export const checkDatabaseConnection = async (): Promise<void> => {
  const { error } = await getDatabaseClient().from("profiles").select("id", { head: true, count: "exact" });
  if (error) throw error;
};
