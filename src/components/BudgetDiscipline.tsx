import { useMemo, useState } from "react";
import { Expense } from "@/hooks/useFinance";
import { formatAmount } from "@/lib/formatAmount";

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
  const [tooltip, setTooltip] = useState<{ date: string; spent: number; limit: number } | null>(null);

  const months = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  const weekDaysShort = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];

  const { days, currentStreak, bestStreak, successCount } = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    // Generate last 14 days
    const daysList: {
      dateStr: string;
      dayNum: number;
      weekDay: number; // 0=Mon, 6=Sun
      spent: number;
      limit: number;
      isToday: boolean;
      withinBudget: boolean;
      hasData: boolean;
    }[] = [];

    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayNum = d.getDate();
      // getDay: 0=Sun → convert to Mon=0
      const jsDay = d.getDay();
      const weekDay = jsDay === 0 ? 6 : jsDay - 1;

      const spent = expenses
        .filter((e) => e.type === "regular" && e.date === dateStr)
        .reduce((sum, e) => sum + e.amount, 0);

      // Historical limit approximation
      const daysLeftOnDay = Math.max(
        1,
        new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() - dayNum
      );
      const limit = dateStr === todayStr
        ? dailyBudget
        : Math.max(0, Math.round((activeBalance - remainingObligations - stillNeedToSave) / daysLeftOnDay));

      const hasData = spent > 0 || dateStr <= todayStr;
      const withinBudget = spent <= (limit > 0 ? limit : dailyBudget);

      daysList.push({
        dateStr,
        dayNum,
        weekDay,
        spent,
        limit: limit > 0 ? limit : dailyBudget,
        isToday: dateStr === todayStr,
        withinBudget,
        hasData,
      });
    }

    // Calculate streaks
    let streak = 0;
    for (let i = daysList.length - 1; i >= 0; i--) {
      if (daysList[i].hasData && daysList[i].withinBudget) streak++;
      else break;
    }

    let best = 0;
    let current = 0;
    for (const day of daysList) {
      if (day.hasData && day.withinBudget) {
        current++;
        best = Math.max(best, current);
      } else {
        current = 0;
      }
    }

    const successDays = daysList.filter((d) => d.hasData && d.withinBudget).length;

    return { days: daysList, currentStreak: streak, bestStreak: best, successCount: successDays };
  }, [expenses, dailyBudget, activeBalance, remainingObligations, stillNeedToSave]);

  // Split into 2 weeks
  const week1 = days.slice(0, 7);
  const week2 = days.slice(7, 14);
  const pct = days.length > 0 ? Math.round((successCount / 14) * 100) : 0;

  const renderWeek = (week: typeof days) => (
    <div className="grid grid-cols-7 gap-1.5">
      {week.map((d) => {
        const dateObj = new Date(d.dateStr);
        const tooltipLabel = `${dateObj.getDate()} ${months[dateObj.getMonth()]}`;

        return (
          <button
            key={d.dateStr}
            onClick={() =>
              setTooltip(
                tooltip?.date === d.dateStr
                  ? null
                  : { date: tooltipLabel, spent: d.spent, limit: d.limit }
              )
            }
            className="flex flex-col items-center justify-center rounded-lg transition-all active:scale-95"
            style={{
              width: "100%",
              aspectRatio: "1",
              background: d.isToday ? "hsl(0 0% 18%)" : "hsl(0 0% 11%)",
              border: d.isToday ? "1.5px solid hsl(162 100% 33%)" : "1px solid transparent",
            }}
          >
            <span className="text-[8px] text-muted-foreground leading-none mb-0.5">
              {weekDaysShort[d.weekDay]}
            </span>
            <span className={`text-[11px] font-bold leading-none ${d.isToday ? "text-safe-green" : "text-foreground"}`}>
              {d.dayNum}
            </span>
            <div
              className="w-2 h-2 rounded-full mt-1"
              style={{
                background: !d.hasData
                  ? "hsl(0 0% 25%)"
                  : d.withinBudget
                  ? "hsl(162 100% 33%)"
                  : "hsl(0 76% 61%)",
              }}
            />
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Дисциплина бюджета</span>
        <span>Последние 14 дней</span>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div className="text-center text-[11px] text-foreground">
          <span className="font-semibold">{tooltip.date}</span>
          <span className="text-muted-foreground mx-1">·</span>
          <span className="font-tabular">
            Расход: {formatAmount(tooltip.spent)} ₸
          </span>
          <span className="text-muted-foreground mx-1">·</span>
          <span className="font-tabular text-muted-foreground">
            Лимит: {formatAmount(tooltip.limit)} ₸
          </span>
        </div>
      )}

      {/* Calendar grid */}
      <div className="space-y-1.5">
        {renderWeek(week1)}
        {renderWeek(week2)}
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-xs pt-1">
        <span className="text-muted-foreground">
          <span className="text-safe-green font-semibold">{successCount}</span> из 14 дней в норме ({pct}%)
        </span>
      </div>
      <div className="flex gap-4 text-xs">
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
