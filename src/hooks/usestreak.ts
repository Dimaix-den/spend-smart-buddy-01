import { useMemo, useEffect } from "react";
import { Expense } from "@/hooks/useFinance";

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

export interface DayHistoryEntry {
  status: string;
  spent: number;
  limit: number;
}

interface UseStreakParams {
  expenses: Expense[];
  dailyBudget: number;
  dayHistory: Record<string, DayHistoryEntry>;
  onUpdateDayHistory: (newHistory: Record<string, DayHistoryEntry>) => void;
}

export function useStreak({
  expenses,
  dailyBudget,
  dayHistory,
  onUpdateDayHistory,
}: UseStreakParams) {
  const { days, streak, historyUpdates } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayY = today.getFullYear();
    const todayM = today.getMonth();
    const todayD = today.getDate();

    const formatLocalDate = (d: Date) => {
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const day = d.getDate();
      const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
      return `${y}-${pad(m)}-${pad(day)}`;
    };

    const todayStr = formatLocalDate(today);

    const allTransactions = expenses.filter((e) => e.date);
    const firstTransaction = [...allTransactions].sort((a, b) =>
      a.date.localeCompare(b.date)
    )[0];
    const firstDate = firstTransaction
      ? new Date(firstTransaction.date + "T00:00:00")
      : null;

    const daysList: DisciplineDay[] = [];
    const updates: Record<string, DayHistoryEntry> = {};

    const currentDayOfWeek = today.getDay();
    const daysFromMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
    const monday = new Date(todayY, todayM, todayD - daysFromMonday);
    monday.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const d = new Date(
        monday.getFullYear(),
        monday.getMonth(),
        monday.getDate() + i
      );
      d.setHours(0, 0, 0, 0);

      const dateStr = formatLocalDate(d);
      const dayNum = d.getDate();
      const jsDay = d.getDay();
      const weekDay = jsDay === 0 ? 6 : jsDay - 1;

      const dTime = d.getTime();
      const todayTime = today.getTime();

      let status: DisciplineStatus;
      let spent = 0;
      let limitForDay = dailyBudget;

      if (dTime > todayTime) {
        status = "future";
      } else if (!firstDate || dTime < firstDate.getTime()) {
        status = "no-data";
      } else if (dateStr === todayStr) {
        const saved = dayHistory[dateStr];
        if (saved?.limit) {
          limitForDay = saved.limit;
        } else if (dailyBudget > 0) {
          limitForDay = dailyBudget;
        }

        spent = expenses
          .filter((e) => e.type === "regular" && e.date === dateStr)
          .reduce((sum, e) => sum + e.amount, 0);

        status = spent <= limitForDay ? "within-budget" : "exceeded";

        updates[dateStr] = { status, spent, limit: limitForDay };
      } else {
        const saved = dayHistory[dateStr];
        if (saved) {
          status = saved.status as DisciplineStatus;
          spent = saved.spent;
          limitForDay = saved.limit;
        } else {
          spent = expenses
            .filter((e) => e.type === "regular" && e.date === dateStr)
            .reduce((sum, e) => sum + e.amount, 0);

          status = spent <= limitForDay ? "within-budget" : "exceeded";
          updates[dateStr] = { status, spent, limit: limitForDay };
        }
      }

      daysList.push({
        dateStr,
        dayNum,
        weekDay,
        spent,
        limit: limitForDay,
        isToday: dateStr === todayStr,
        status,
      });
    }

    let streak = 0;
    for (let i = daysList.length - 1; i >= 0; i--) {
      const d = daysList[i];
      if (d.status === "within-budget") {
        streak += 1;
      } else if (d.status === "future" || d.status === "no-data") {
        continue;
      } else {
        break;
      }
    }

    return { days: daysList, streak, historyUpdates: updates };
  }, [expenses, dailyBudget, dayHistory]);

  useEffect(() => {
    if (!historyUpdates || Object.keys(historyUpdates).length === 0) return;
    onUpdateDayHistory({
      ...dayHistory,
      ...historyUpdates,
    });
  }, [historyUpdates, dayHistory, onUpdateDayHistory]);

  return { days, streak };
}
