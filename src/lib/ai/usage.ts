import { query } from "@/lib/db";

import { usageDateKey, usageResetAt } from "./usage-window";

interface UsageRow {
  count: number;
}

export interface AiDraftUsage {
  allowed: boolean;
  used: number;
  limit: number;
  resetAt: Date;
}

export async function reserveAiDraft(
  userId: string,
  limit: number,
  now: Date = new Date()
): Promise<AiDraftUsage> {
  const normalizedLimit = Math.max(1, Math.trunc(limit));
  const usageDate = usageDateKey(now);
  const resetAt = usageResetAt(now);

  const { rows } = await query<UsageRow>(
    `insert into public.ai_usage as current_usage
       (user_id, usage_date, count, updated_at)
     values ($1, $2, 1, now())
     on conflict (user_id, usage_date) do update
       set count = current_usage.count + 1,
           updated_at = now()
       where current_usage.count < $3
     returning count`,
    [userId, usageDate, normalizedLimit]
  );

  if (rows[0]) {
    return {
      allowed: true,
      used: rows[0].count,
      limit: normalizedLimit,
      resetAt,
    };
  }

  const existing = await query<UsageRow>(
    `select count
     from public.ai_usage
     where user_id = $1 and usage_date = $2`,
    [userId, usageDate]
  );

  return {
    allowed: false,
    used: Math.max(existing.rows[0]?.count ?? normalizedLimit, normalizedLimit),
    limit: normalizedLimit,
    resetAt,
  };
}

export async function refundAiDraft(
  userId: string,
  now: Date = new Date()
): Promise<void> {
  await query(
    `update public.ai_usage
     set count = count - 1,
         updated_at = now()
     where user_id = $1 and usage_date = $2 and count > 0`,
    [userId, usageDateKey(now)]
  );
}
