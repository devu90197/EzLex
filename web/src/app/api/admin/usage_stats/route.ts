import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // 1. Get total tokens used this month
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    const { data: totalData, error: totalError } = await supabase
      .from("api_usage_logs")
      .select("total_tokens")
      .gte("created_at", firstDayOfMonth.toISOString());

    if (totalError) throw totalError;

    const monthlyTotalTokens = totalData.reduce((sum, log) => sum + (log.total_tokens || 0), 0);

    // 2. Get breakdown by endpoint
    const { data: breakdownData, error: breakdownError } = await supabase
      .from("api_usage_logs")
      .select("endpoint, total_tokens")
      .gte("created_at", firstDayOfMonth.toISOString());

    if (breakdownError) throw breakdownError;

    const breakdown: Record<string, { tokens: number; calls: number }> = {};
    breakdownData.forEach(log => {
      if (!breakdown[log.endpoint]) {
        breakdown[log.endpoint] = { tokens: 0, calls: 0 };
      }
      breakdown[log.endpoint].tokens += (log.total_tokens || 0);
      breakdown[log.endpoint].calls += 1;
    });

    // 3. Get recent logs (last 5)
    const { data: recentLogs, error: recentError } = await supabase
      .from("api_usage_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);

    if (recentError) throw recentError;

    return NextResponse.json({
      monthlyTotalTokens,
      breakdown,
      recentLogs,
      timestamp: new Date().toISOString()
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
