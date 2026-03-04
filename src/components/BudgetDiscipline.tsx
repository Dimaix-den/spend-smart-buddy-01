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

  const { days, currentStreak, bestStreak } = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    // Берём последние 7 дней
    const daysList: {
      dateStr: string;
      dayNum: number;
      weekDay: number;
      spent: number;
      limit: number;
      isToday: boolean;
      withinBudget: boolean;
      hasData: boolean;
    }[] = [];

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


    return { days: daysList, currentStreak: streak, bestStreak: best };
  }, [expenses, dailyBudget, activeBalance, remainingObligations, stillNeedToSave]);

  return (
    <div className="space-y-2">
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

      {/* Одна строка на 7 дней */}
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d) => {
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

      {/* Оставляем только серии */}
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
