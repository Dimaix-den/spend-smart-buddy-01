import { useMemo } from "react";
import type { Expense } from "@/hooks/useFinance";

export type DisciplineStatus = "no-data" | "within-budget" | "exceeded" | "future";

export type DisciplineDay = {
  dateStr: string;
  dayNum: number;
  weekDay: number;
  spent: number;
  limit: number;
  isToday: boolean;
  status: DisciplineStatus;
};

interface UseStreakParams {
  expenses: Expense[];
  totalPeriodBudget: number;
  periodStartStr: string;
  totalDaysInPeriod: number;
  weekOffset?: number;
}

const DAY_MS = 86400000;

export function formatLocalDate(date: Date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const day = date.getDate();
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${y}-${pad(m)}-${pad(day)}`;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function getMonday(baseDate: Date, weekOffset: number) {
  const dow = baseDate.getDay();
  const daysFromMon = dow === 0 ? 6 : dow - 1;
  const monday = new Date(baseDate);
  monday.setDate(monday.getDate() - daysFromMon - weekOffset * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * Динамический расчёт лимитов по дням.
 * Для дня D (индекс i от начала периода):
 *   cumulative = сумма regular-расходов за дни 0..i-1
 *   remaining = totalPeriodBudget - cumulative
 *   daysLeft = totalDays - i
 *   limit = remaining / daysLeft
 *
 * Если пользователь превысил лимит — бюджет на следующие дни уменьшается.
 * Если не потратил — бюджет перетекает на будущие дни.
 */
function computeDayLimits(
  expenses: Expense[],
  totalPeriodBudget: number,
  periodStartStr: string,
  totalDaysInPeriod: number
): Map<string, { spent: number; limit: number }> {
  const periodStart = startOfDay(new Date(periodStartStr + "T00:00:00"));

  const spentByDate = new Map<string, number>();
  expenses.forEach((e) => {
    if (e.type !== "regular") return;
    spentByDate.set(e.date, (spentByDate.get(e.date) ?? 0) + e.amount);
  });

  const result = new Map<string, { spent: number; limit: number }>();
  let cumulative = 0;

  for (let i = 0; i < totalDaysInPeriod; i++) {
    const date = new Date(periodStart.getTime() + i * DAY_MS);
    const dateStr = formatLocalDate(date);
    const spent = spentByDate.get(dateStr) ?? 0;
    const daysRemaining = totalDaysInPeriod - i;
    const remaining = totalPeriodBudget - cumulative;
    const limit = Math.max(0, Math.round(remaining / daysRemaining));

    result.set(dateStr, { spent, limit });
    cumulative += spent;
  }

  return result;
}

export function buildDisciplineData({
  expenses,
  totalPeriodBudget,
  periodStartStr,
  totalDaysInPeriod,
  weekOffset = 0,
  now = new Date(),
}: UseStreakParams & { now?: Date }) {
  const today = startOfDay(now);
  const todayStr = formatLocalDate(today);
  const periodStart = startOfDay(new Date(periodStartStr + "T00:00:00"));
  const periodEndMs = periodStart.getTime() + totalDaysInPeriod * DAY_MS;

  const dayLimits = computeDayLimits(
    expenses,
    totalPeriodBudget,
    periodStartStr,
    totalDaysInPeriod
  );

  const monday = getMonday(today, weekOffset);

  const days: DisciplineDay[] = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday.getTime() + i * DAY_MS);
    const dateStr = formatLocalDate(date);
    const dateMs = date.getTime();
    const isToday = dateStr === todayStr;
    const jsDay = date.getDay();
    const weekDay = jsDay === 0 ? 6 : jsDay - 1;

    // Future day
    if (dateMs > today.getTime()) {
      return {
        dateStr,
        dayNum: date.getDate(),
        weekDay,
        spent: 0,
        limit: 0,
        isToday: false,
        status: "future" as const,
      };
    }

    // Outside current budget period
    if (dateMs < periodStart.getTime() || dateMs >= periodEndMs) {
      return {
        dateStr,
        dayNum: date.getDate(),
        weekDay,
        spent: 0,
        limit: 0,
        isToday,
        status: "no-data" as const,
      };
    }

    const info = dayLimits.get(dateStr);
    const spent = info?.spent ?? 0;
    const limit = info?.limit ?? 0;
    const status: DisciplineStatus = spent <= limit ? "within-budget" : "exceeded";

    return {
      dateStr,
      dayNum: date.getDate(),
      weekDay,
      spent,
      limit,
      isToday,
      status,
    };
  });

  // Streak: consecutive within-budget days backwards from today
  let streak = 0;
  const cursor = new Date(today);
  while (cursor.getTime() >= periodStart.getTime()) {
    const dateStr = formatLocalDate(cursor);
    const info = dayLimits.get(dateStr);
    if (!info) break;
    if (info.spent > info.limit) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { days, streak };
}

export function useStreak(params: UseStreakParams) {
  const { days, streak } = useMemo(
    () => buildDisciplineData(params),
    [
      params.expenses,
      params.totalPeriodBudget,
      params.periodStartStr,
      params.totalDaysInPeriod,
      params.weekOffset,
    ]
  );

  return { days, streak };
}
