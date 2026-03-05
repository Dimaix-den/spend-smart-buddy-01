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
  const weekDaysShort = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];

  const { days, currentStreak, bestStreak, successDays, totalDays } = useMemo(() => {
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
        dateStr, dayNum, weekDay, spent,
        limit: effectiveLimit, isToday: dateStr === todayStr,
        withinBudget, hasData,
      });
    }

    let streak = 0;
    for (let i = daysList.length - 1; i >= 0; i--) {
      const d = daysList[i];
      if (d.hasData && d.withinBudget) streak++;
      else break;
    }

    let best = 0;
    let cur = 0;
    let success = 0;
    for (const d of daysList) {
      if (d.hasData && d.withinBudget) {
        cur++;
        best = Math.max(best, cur);
        success++;
      } else {
        cur = 0;
      }
    }

    return { days: daysList, currentStreak: streak, bestStreak: best, successDays: success, totalDays: daysList.length };
  }, [expenses, dailyBudget, activeBalance, remainingObligations, stillNeedToSave]);

  const successRate = totalDays > 0 ? Math.round((successDays / totalDays) * 100) : 0;

  return (
    <div className="space-y-3">
      <h3 className="section-header">🎯 Дисциплина</h3>

      {/* Grid of 7 days */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((d) => (
          <div
            key={d.dateStr}
            className="flex flex-col items-center justify-center rounded-xl py-2"
            style={{
              background: d.isToday ? "hsl(var(--foreground))" : "transparent",
            }}
          >
            <span
              className="text-[9px] font-semibold uppercase"
              style={{
                color: d.isToday ? "hsl(var(--background))" : "hsl(var(--muted-foreground))",
              }}
            >
              {weekDaysShort[d.weekDay]}
            </span>
            <span
              className="text-sm font-bold"
              style={{
                color: d.isToday ? "hsl(var(--background))" : "hsl(var(--foreground))",
              }}
            >
              {d.dayNum}
            </span>
            <div
              className="w-2 h-2 rounded-full mt-1"
              style={{
                background: !d.hasData
                  ? "hsl(var(--border))"
                  : d.withinBudget
                  ? "hsl(var(--safe-green))"
                  : "hsl(var(--destructive))",
              }}
            />
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {successDays}/{totalDays} дней ({successRate}%)
        </span>
        <div className="flex gap-3">
          <span className="text-muted-foreground">
            🔥 <span className="text-foreground font-semibold">{currentStreak} дн.</span>
          </span>
          <span className="text-muted-foreground">
            🏆 <span className="text-foreground font-semibold">{bestStreak} дн.</span>
          </span>
        </div>
      </div>
    </div>
  );
}