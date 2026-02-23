import { useRef, useEffect } from "react";
import { Expense } from "@/hooks/useFinance";
import { formatAmount } from "@/lib/formatAmount";

interface DailySpendingChartProps {
  expenses: Expense[];
  totalDays: number;
  currentDay: number;
  dailyBudget: number;
  startDate: string;
}

export default function DailySpendingChart({
  expenses,
  totalDays,
  currentDay,
  dailyBudget,
  startDate,
}: DailySpendingChartProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Build daily totals based on calendar days from startDate
  const start = new Date(startDate);
  const dailyData: { day: number; spent: number; dateStr: string; isToday: boolean }[] = [];

  for (let d = 0; d < totalDays; d++) {
    const date = new Date(start);
    date.setDate(start.getDate() + d);
    const dateStr = date.toISOString().split("T")[0];
    const dayNum = date.getDate(); // actual calendar day

    const daySpending = expenses
      .filter((e) => e.type === "regular" && e.date === dateStr)
      .reduce((sum, e) => sum + e.amount, 0);

    dailyData.push({
      day: dayNum,
      spent: daySpending,
      dateStr,
      isToday: d + 1 === currentDay,
    });
  }

  // Only show days up to currentDay
  const visibleDays = dailyData.slice(0, currentDay);
  const maxSpent = Math.max(dailyBudget, ...visibleDays.map((d) => d.spent), 1);

  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current;
      el.scrollLeft = el.scrollWidth - el.clientWidth;
    }
  }, [currentDay]);

  if (visibleDays.length === 0) {
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
        <div className="flex-1 border-t border-dashed" style={{ borderColor: "hsl(0 0% 30%)" }} />
        <span className="text-[10px] text-muted-foreground font-tabular">{formatAmount(dailyBudget)} ₸</span>
      </div>

      <div ref={scrollRef} className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1 pt-1">
        {visibleDays.map((d) => {
          const pct = Math.min((d.spent / maxSpent) * 100, 100);
          const overBudget = d.spent > dailyBudget;
          const limitPct = Math.min((dailyBudget / maxSpent) * 100, 100);

          return (
            <div key={d.dateStr} className="flex flex-col items-center gap-1 min-w-[28px]">
              {/* Bar */}
              <div className="relative w-5 h-16 rounded-md overflow-hidden flex items-end" style={{ background: "hsl(0 0% 18%)" }}>
                {/* Limit marker */}
                <div
                  className="absolute w-full border-t border-dashed"
                  style={{ bottom: `${limitPct}%`, borderColor: "hsl(0 0% 30%)" }}
                />
                {/* Bar fill */}
                <div
                  className="w-full rounded-md transition-all duration-500"
                  style={{
                    height: `${Math.max(pct, d.spent > 0 ? 8 : 0)}%`,
                    background: overBudget
                      ? "hsl(38 100% 52%)"
                      : "hsl(162 100% 33%)",
                    opacity: d.isToday ? 1 : 0.7,
                  }}
                />
              </div>
              {/* Day number — calendar day */}
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
