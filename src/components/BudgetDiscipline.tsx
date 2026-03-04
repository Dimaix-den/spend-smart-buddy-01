import { useMemo } from "react";
import { Expense } from "@/hooks/useFinance";

interface BudgetDisciplineProps {
  expenses: Expense[];
  dailyBudget: number;
  activeBalance: number;
  remainingObligations: number;
  stillNeedToSave: number;
}

export default function BudgetDiscipline({
  expenses,
  dailyBudget,
  activeBalance,
  remainingObligations,
  stillNeedToSave,
}: BudgetDisciplineProps) {
  const months = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  const weekDaysShort = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];

  const { days, currentStreak, bestStreak } = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    type DayItem = {
      dateStr: string;
      dayNum: number;
      weekDay: number;
      spent: number;
      limit: number;
      isToday: boolean;
      withinBudget: boolean;
      hasData: boolean;
    };

    const daysList: DayItem[] = [];

    // последние 7 дней
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayNum = d.getDate();
      const jsDay = d.getDay();
      const weekDay = jsDay === 0 ? 6 : jsDay - 1;

      const spent = expenses
        .filter((e) => e.type === "regular" && e.date === dateStr)
        .reduce((sum, e) => sum + e.amount, 0);

      const daysLeftOnDay = Math.max(
        1,
        new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() - dayNum
      );

      const limit =
        dateStr === todayStr
          ? dailyBudget
          : Math.max(
              0,
              Math.round(
                (activeBalance - remainingObligations - stillNeedToSave) / daysLeftOnDay
              )
            );

      const hasData = spent > 0 || dateStr <= todayStr;
      const effectiveLimit = limit > 0 ? limit : dailyBudget;
      const withinBudget = spent <= effectiveLimit;

      daysList.push({
        dateStr,
        dayNum,
        weekDay,
        spent,
        limit: effectiveLimit,
        isToday: dateStr === todayStr,
        withinBudget,
        hasData,
      });
    }

    // текущая серия (с конца)
    let streak = 0;
    for (let i = daysList.length - 1; i >= 0; i--) {
      const d = daysList[i];
      if (d.hasData && d.withinBudget) streak++;
      else break;
    }

    // лучшая серия
    let best = 0;
    let cur = 0;
    for (const d of daysList) {
      if (d.hasData && d.withinBudget) {
        cur++;
        best = Math.max(best, cur);
      } else {
        cur = 0;
      }
    }

    return { days: daysList, currentStreak: streak, bestStreak: best };
  }, [expenses, dailyBudget, activeBalance, remainingObligations, stillNeedToSave]);

  return (
    <div className="space-y-2">
      {/* Одна строка на 7 дней, без кликов и тултипов */}
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const dateObj = new Date(d.dateStr);
          const label = `${dateObj.getDate()} ${months[dateObj.getMonth()]}`;

          return (
            <div
              key={d.dateStr}
              className="flex flex-col items-center justify-center rounded-lg"
              style={{
                width: "100%",
                aspectRatio: "1",
                background: d.isToday ? "hsl(0 0% 18%)" : "hsl(0 0% 11%)",
                border: d.isToday ? "1.5px solid hsl(162 100% 33%)" : "1px solid transparent",
              }}
              aria-label={label}
            >
              <span className="text-[8px] text-muted-foreground leading-none mb-0.5">
                {weekDaysShort[d.weekDay]}
              </span>
              <span
                className={`text-[11px] font-bold leading-none ${
                  d.isToday ? "text-safe-green" : "text-foreground"
                }`}
              >
                {d.dayNum}
              </span>
              <div
                className="w-2 h-2 rounded-full mt-1"
                style={{
                  background: !d.hasData
                    ? "hsl(0 0% 25%)" // серый по умолчанию, если нет данных
                    : d.withinBudget
                    ? "hsl(162 100% 33%)"
                    : "hsl(0 76% 61%)",
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Серии */}
      <div className="flex gap-4 text-xs pt-1">
        <span className="text-muted-foreground">
          🔥 Серия: <span className="text-foreground font-semibold">{currentStreak} дн.</span>
        </span>
        <span className="text-muted-foreground">
          🏆 Лучшая: <span className="text-foreground font-semibold">{bestStreak} дн.</span>
        </span>
      </div>
    </div>
  );
}
