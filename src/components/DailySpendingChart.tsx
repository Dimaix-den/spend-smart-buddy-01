import { useRef, useEffect } from "react";
import { Expense } from "@/hooks/useFinance";
import { formatAmount } from "@/lib/formatAmount";

interface DailySpendingChartProps {
  expenses: Expense[];
  totalDays: number;
  currentDay: number;
  dailyBudget: number;
}

export default function DailySpendingChart({
  expenses,
  totalDays,
  currentDay,
  dailyBudget,
}: DailySpendingChartProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Build daily totals
  const dailyTotals: number[] = [];
  for (let day = 1; day <= totalDays; day++) {
    dailyTotals.push(0);
  }

  const dateMap = new Map<string, number>();
  expenses
    .filter((e) => e.type === "regular")
    .forEach((e) => {
      dateMap.set(e.date, (dateMap.get(e.date) || 0) + e.amount);
    });

  const sortedDates = [...dateMap.keys()].sort();
  sortedDates.forEach((date, idx) => {
    if (idx < totalDays) {
      const dayIdx = Math.min(idx, totalDays - 1);
      dailyTotals[dayIdx] = dateMap.get(date) || 0;
    }
  });

  const allDays: { day: number; spent: number; isToday: boolean }[] = [];
  for (let d = 1; d <= Math.min(currentDay, totalDays); d++) {
    allDays.push({ day: d, spent: 0, isToday: d === currentDay });
  }

  const dateEntries = [...dateMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  dateEntries.forEach((entry, idx) => {
    if (idx < allDays.length) {
      allDays[idx].spent = entry[1];
    }
  });

  const maxSpent = Math.max(dailyBudget, ...allDays.map((d) => d.spent), 1);

  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current;
      el.scrollLeft = el.scrollWidth - el.clientWidth;
    }
  }, [currentDay]);

  if (allDays.length === 0) {
    return (
      <div className="glass-card p-4 animate-fade-in-up">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Расходы по дням
        </h3>
        <p className="text-xs text-muted-foreground text-center py-4">Нет данных</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-4 animate-fade-in-up">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Расходы по дням
        </h3>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-safe-green inline-block" /> в норме
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-alert-orange inline-block" /> превышение
          </span>
        </div>
      </div>

      {/* Limit line label */}
      <div className="flex items-center gap-2 mb-1">
        <div className="flex-1 border-t border-dashed border-gray-300" />
        <span className="text-[10px] text-muted-foreground font-tabular">{formatAmount(dailyBudget)} ₸</span>
      </div>

      <div ref={scrollRef} className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1 pt-1">
        {allDays.map((d) => {
          const pct = Math.min((d.spent / maxSpent) * 100, 100);
          const overBudget = d.spent > dailyBudget;
          const limitPct = Math.min((dailyBudget / maxSpent) * 100, 100);

          return (
            <div key={d.day} className="flex flex-col items-center gap-1 min-w-[28px]">
              {/* Bar */}
              <div className="relative w-5 h-16 rounded-md bg-gray-100 overflow-hidden flex items-end">
                {/* Limit marker */}
                <div
                  className="absolute w-full border-t border-dashed border-gray-300"
                  style={{ bottom: `${limitPct}%` }}
                />
                {/* Bar fill */}
                <div
                  className="w-full rounded-md transition-all duration-500"
                  style={{
                    height: `${Math.max(pct, d.spent > 0 ? 8 : 0)}%`,
                    background: overBudget
                      ? "linear-gradient(180deg, hsl(22 82% 55%), hsl(22 82% 45%))"
                      : "linear-gradient(180deg, hsl(162 100% 38%), hsl(162 100% 28%))",
                    opacity: d.isToday ? 1 : 0.7,
                  }}
                />
              </div>
              {/* Day number */}
              <span
                className={`text-[10px] font-tabular ${
                  d.isToday ? "text-foreground font-bold" : "text-muted-foreground"
                }`}
              >
                {d.day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
