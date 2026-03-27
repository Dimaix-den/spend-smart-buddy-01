import { useMemo } from "react";
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

interface UseStreakParams {
  expenses: Expense[];
  dailyBudget: number;
  activeBalance: number;
  remainingObligations: number;
  stillNeedToSave: number;
  lastOpenedDates: string[];
}

export function useStreak({
  expenses,
  dailyBudget,
  activeBalance,
  remainingObligations,
  stillNeedToSave,
  lastOpenedDates,
}: UseStreakParams) {
  const { days, streak } = useMemo(() => {
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

    // Самая ранняя операция — до неё всё no-data
    const allTransactions = expenses.filter((e) => e.date);
    const firstTransaction = [...allTransactions].sort((a, b) =>
      a.date.localeCompare(b.date)
    )[0];
    const firstDate = firstTransaction
      ? new Date(firstTransaction.date + "T00:00:00")
      : null;

    // Самая ранняя дата открытия — до неё всё no-data
    const sortedOpenDates = [...lastOpenedDates].sort();
    const firstOpenDate = sortedOpenDates[0]
      ? new Date(sortedOpenDates[0] + "T00:00:00")
      : null;

    // Начало отсчёта — самая ранняя из двух дат
    const appStartDate = firstDate && firstOpenDate
      ? new Date(Math.min(firstDate.getTime(), firstOpenDate.getTime()))
      : firstDate || firstOpenDate;

    const openedSet = new Set(lastOpenedDates);

    const daysList: DisciplineDay[] = [];

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
        // Будущий день
        status = "future";
      } else if (!appStartDate || dTime < appStartDate.getTime()) {
        // До начала использования приложения
        status = "no-data";
      } else {
        // День в зоне использования приложения
        const savedStatus = localStorage.getItem(`day_status_${dateStr}`);
        const savedLimit = localStorage.getItem(`day_limit_${dateStr}`);
        const savedSpent = localStorage.getItem(`day_spent_${dateStr}`);

        if (dateStr === todayStr) {
          // Сегодня — фиксируем лимит один раз
          if (savedLimit) {
            limitForDay = parseFloat(savedLimit);
          } else if (dailyBudget > 0) {
            localStorage.setItem(`day_limit_${dateStr}`, String(dailyBudget));
            limitForDay = dailyBudget;
          }

          spent = expenses
            .filter((e) => e.type === "regular" && e.date === dateStr)
            .reduce((sum, e) => sum + e.amount, 0);

          status = spent <= limitForDay ? "within-budget" : "exceeded";

          localStorage.setItem(`day_status_${dateStr}`, status);
          localStorage.setItem(`day_spent_${dateStr}`, String(spent));
        } else if (savedStatus) {
          // Прошлый день с сохранённым статусом
          status = savedStatus as DisciplineStatus;
          spent = savedSpent ? parseFloat(savedSpent) : 0;
          limitForDay = savedLimit ? parseFloat(savedLimit) : dailyBudget;
        } else {
          // Прошлый день без сохранённого статуса
          spent = expenses
            .filter((e) => e.type === "regular" && e.date === dateStr)
            .reduce((sum, e) => sum + e.amount, 0);

          const wasOpened = openedSet.has(dateStr);

          if (spent > 0) {
            // Были операции — считаем честно
            status = spent <= limitForDay ? "within-budget" : "exceeded";
            localStorage.setItem(`day_status_${dateStr}`, status);
            localStorage.setItem(`day_spent_${dateStr}`, String(spent));
            localStorage.setItem(`day_limit_${dateStr}`, String(limitForDay));
          } else if (wasOpened) {
            // Заходил, но не тратил — уложился в лимит
            status = "within-budget";
            localStorage.setItem(`day_status_${dateStr}`, status);
            localStorage.setItem(`day_spent_${dateStr}`, "0");
            localStorage.setItem(`day_limit_${dateStr}`, String(limitForDay));
          } else {
            // Не заходил и не тратил — нет данных
            status = "no-data";
          }
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

    // Стрик: подряд "within-budget" от сегодня назад
    // no-data и future не ломают стрик, но и не считаются
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

    return { days: daysList, streak };
  }, [expenses, dailyBudget, activeBalance, remainingObligations, stillNeedToSave, lastOpenedDates]);

  return { days, streak };
}
