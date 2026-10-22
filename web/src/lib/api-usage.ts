import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Log API usage and token consumption to Supabase
 */
export async function logApiUsage({
  userId,
  serviceProvider,
  modelName,
  endpoint,
  promptTokens,
  completionTokens,
  totalTokens,
  metadata = {}
}: {
  userId?: string;
  serviceProvider: string;
  modelName: string;
  endpoint: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens: number;
  metadata?: any;
}) {
  try {
    const { error } = await supabase
      .from("api_usage_logs")
      .insert({
        user_id: userId || null,
        service_provider: serviceProvider,
        model_name: modelName,
        endpoint: endpoint,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
        metadata: metadata
      });

    if (error) {
      console.error("[logApiUsage] Supabase Error:", error);
    }
  } catch (e) {
    console.error("[logApiUsage] Unexpected Error:", e);
  }
}
