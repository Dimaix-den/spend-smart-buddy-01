import { useRef, useEffect, useState } from "react";
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
  dailyBudget,
}: DailySpendingChartProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ day: string; amount: number } | null>(null);

  // Build last 14 calendar days ending with today
  const today = new Date();
  const dailyData: { day: number; spent: number; dateStr: string; isToday: boolean; label: string }[] = [];

  for (let i = 13; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    const dayNum = date.getDate();

    const daySpending = expenses
      .filter((e) => e.type === "regular" && e.date === dateStr)
      .reduce((sum, e) => sum + e.amount, 0);

    dailyData.push({
      day: dayNum,
      spent: daySpending,
      dateStr,
      isToday: i === 0,
      label: i === 0 ? "Сегодня" : `${dayNum}`,
    });
  }

  const maxSpent = Math.max(dailyBudget, ...dailyData.map((d) => d.spent), 1);

  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current;
      el.scrollLeft = el.scrollWidth - el.clientWidth;
    }
  }, []);

  const months = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

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
        <div className="flex-1 border-t border-dashed border-white/10" />
        <span className="text-[10px] text-muted-foreground font-tabular">{formatAmount(dailyBudget)} ₸</span>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div className="text-center text-xs text-foreground mb-1 animate-fade-in-up">
          <span className="font-semibold">{tooltip.day}:</span>{" "}
          <span className="font-tabular">{formatAmount(tooltip.amount)} ₸</span>
        </div>
      )}

      <div ref={scrollRef} className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1 pt-1">
        {dailyData.map((d) => {
          const pct = Math.min((d.spent / maxSpent) * 100, 100);
          const overBudget = d.spent > dailyBudget;
          const limitPct = Math.min((dailyBudget / maxSpent) * 100, 100);

          const dateObj = new Date(d.dateStr);
          const tooltipLabel = `${dateObj.getDate()} ${months[dateObj.getMonth()]}`;

          return (
            <div
              key={d.dateStr}
              className="flex flex-col items-center gap-1 min-w-[28px] cursor-pointer"
              onClick={() => setTooltip(tooltip?.day === tooltipLabel ? null : { day: tooltipLabel, amount: d.spent })}
            >
              <div className="relative w-5 h-16 rounded-md overflow-hidden flex items-end" style={{ background: "hsl(0 0% 14%)" }}>
                <div
                  className="absolute w-full border-t border-dashed border-white/10"
                  style={{ bottom: `${limitPct}%` }}
                />
                <div
                  className="w-full rounded-md transition-all duration-500"
                  style={{
                    height: `${Math.max(pct, d.spent > 0 ? 8 : 0)}%`,
                    background: d.isToday
                      ? "hsl(162 100% 33%)"
                      : overBudget
                      ? "hsl(38 100% 52%)"
                      : "hsl(162 100% 33%)",
                    opacity: d.isToday ? 1 : 0.6,
                  }}
                />
              </div>
              <span
                className={`text-[10px] font-tabular ${
                  d.isToday ? "text-safe-green font-bold" : "text-muted-foreground"
                }`}
              >
                {d.isToday ? "•" : d.day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
