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

type DisciplineSnapshot = {
  status: string;
  spent: number;
  limit: number;
};

interface UseStreakParams {
  expenses: Expense[];
  dailyBudget: number;
  activeBalance: number;
  remainingObligations: number;
  stillNeedToSave: number;
  lastOpenedDates: string[];
  dayHistory?: Record<string, DisciplineSnapshot>;
  weekOffset?: number;
}

interface BuildDisciplineDataParams extends UseStreakParams {
  now?: Date;
}

const DAY_MS = 86400000;

export function formatLocalDate(date: Date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const day = date.getDate();
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${y}-${pad(m)}-${pad(day)}`;
}

function parseLocalDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`);
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

// Статус по цифрам дня
function resolveStatusFromNumbers({
  spent,
  limit,
  isFuture,
}: {
  spent: number;
  limit: number;
  isFuture: boolean;
}): DisciplineStatus {
  if (isFuture) return "future";

  // День без трат в пределах периода считается удачным
  if (spent === 0 && limit >= 0) {
    return "within-budget";
  }

  if (limit <= 0) {
    // Есть траты, а лимит не задан / нулевой — считаем перерасходом
    return "exceeded";
  }

  return spent <= limit ? "within-budget" : "exceeded";
}

function getMonday(baseDate: Date, weekOffset: number) {
  const currentDayOfWeek = baseDate.getDay();
  const daysFromMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
  const monday = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate() - daysFromMonday - Math.max(0, weekOffset) * 7
  );

  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function buildDisciplineData({
  expenses,
  dailyBudget,
  lastOpenedDates,
  dayHistory,
  weekOffset = 0,
  now = new Date(),
}: BuildDisciplineDataParams) {
  const today = startOfDay(now);
  const todayStr = formatLocalDate(today);
  const history = dayHistory ?? {};

  // Фактические траты по датам
  const spentByDate = new Map<string, number>();
  expenses.forEach((expense) => {
    if (expense.type !== "regular" || !expense.date) return;
    spentByDate.set(
      expense.date,
      (spentByDate.get(expense.date) ?? 0) + expense.amount
    );
  });

  // Минимальная известная дата: траты, снапшоты или открытия приложения
  const allKnownDates = [
    ...spentByDate.keys(),
    ...Object.keys(history),
    ...lastOpenedDates,
  ].sort();

  const appStartDateMs = allKnownDates[0]
    ? startOfDay(parseLocalDate(allKnownDates[0])).getTime()
    : null;

  const cache = new Map<string, DisciplineDay>();

  const resolveDay = (date: Date): DisciplineDay => {
    const normalizedDate = startOfDay(date);
    const dateStr = formatLocalDate(normalizedDate);
    const cached = cache.get(dateStr);
    if (cached) return cached;

    const snapshot = history[dateStr];
    const spent = spentByDate.get(dateStr) ?? 0;

    const isToday = dateStr === todayStr;
    const dTime = normalizedDate.getTime();
    const todayTime = today.getTime();

    // Лимит на день:
    // 1) если есть snapshot.limit — фиксированный лимит того дня
    // 2) иначе — текущий dailyBudget (для новых дней без истории)
    const limit =
      typeof snapshot?.limit === "number" ? snapshot.limit : dailyBudget;

    let status: DisciplineStatus;

    if (dTime > todayTime) {
      status = "future";
    } else if (appStartDateMs === null || dTime < appStartDateMs) {
      status = "no-data";
    } else {
      status = resolveStatusFromNumbers({
        spent,
        limit,
        isFuture: false,
      });
    }

    const jsDay = normalizedDate.getDay();
    const resolved: DisciplineDay = {
      dateStr,
      dayNum: normalizedDate.getDate(),
      weekDay: jsDay === 0 ? 6 : jsDay - 1,
      spent,
      limit,
      isToday,
      status,
    };

    cache.set(dateStr, resolved);
    return resolved;
  };

  const monday = getMonday(today, weekOffset);
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday.getTime() + index * DAY_MS);
    return resolveDay(day);
  });

  let streak = 0;
  if (appStartDateMs !== null) {
    const cursor = new Date(today);

    while (cursor.getTime() >= appStartDateMs) {
      const day = resolveDay(cursor);

      if (day.status !== "within-budget") {
        break;
      }

      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  return { days, streak };
}

export function useStreak({
  expenses,
  dailyBudget,
  activeBalance,
  remainingObligations,
  stillNeedToSave,
  lastOpenedDates,
  dayHistory,
  weekOffset = 0,
}: UseStreakParams) {
  const { days, streak } = useMemo(() => {
    return buildDisciplineData({
      expenses,
      dailyBudget,
      activeBalance,
      remainingObligations,
      stillNeedToSave,
      lastOpenedDates,
      dayHistory,
      weekOffset,
    });
  }, [
    expenses,
    dailyBudget,
    activeBalance,
    remainingObligations,
    stillNeedToSave,
    lastOpenedDates,
    dayHistory,
    weekOffset,
  ]);

  return { days, streak };
}
