import { useRef, useEffect, useState, useMemo } from "react";
import { Expense } from "@/hooks/useFinance";
import { formatAmount } from "@/lib/formatAmount";

interface DailySpendingChartProps {
  expenses: Expense[];
  totalDays: number;
  currentDay: number;
  dailyBudget: number;
  startDate: string;
  // For historical limit calculation
  activeBalance?: number;
  remainingObligations?: number;
  stillNeedToSave?: number;
}

export default function DailySpendingChart({
  expenses,
  dailyBudget,
  activeBalance = 0,
  remainingObligations = 0,
  stillNeedToSave = 0,
}: DailySpendingChartProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ day: string; amount: number; limit: number } | null>(null);

  const months = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

  // Build last 14 calendar days ending with today
  const today = new Date();
  const dailyData = useMemo(() => {
    const data: { day: number; spent: number; dateStr: string; isToday: boolean; historicalLimit: number }[] = [];

    // Precompute cumulative spending from today backwards to reconstruct historical balances
    for (let i = 13; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const dayNum = date.getDate();

      const daySpending = expenses
        .filter((e) => e.type === "regular" && e.date === dateStr)
        .reduce((sum, e) => sum + e.amount, 0);

      // Calculate what the limit was on this day:
      // Sum spending from this day forward to reconstruct what balance was
      let spendingAfterThisDay = 0;
      let incomeAfterThisDay = 0;
      for (let j = i - 1; j >= 0; j--) {
        const futureDate = new Date(today);
        futureDate.setDate(today.getDate() - j);
        const futureDateStr = futureDate.toISOString().split("T")[0];
        spendingAfterThisDay += expenses
          .filter((e) => e.type === "regular" && e.date === futureDateStr)
          .reduce((sum, e) => sum + e.amount, 0);
        incomeAfterThisDay += expenses
          .filter((e) => e.type === "income" && e.date === futureDateStr)
          .reduce((sum, e) => sum + e.amount, 0);
      }

      // Reconstruct balance at end of this day
      const balanceOnDay = activeBalance + spendingAfterThisDay - incomeAfterThisDay;
      const daysLeftOnDay = Math.max(1, new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - dayNum);
      const availableOnDay = balanceOnDay - remainingObligations - stillNeedToSave;
      const historicalLimit = Math.max(0, Math.round(availableOnDay / daysLeftOnDay));

      data.push({
        day: dayNum,
        spent: daySpending,
        dateStr,
        isToday: i === 0,
        historicalLimit,
      });
    }
    return data;
  }, [expenses, activeBalance, remainingObligations, stillNeedToSave]);

  const maxValue = Math.max(dailyBudget, ...dailyData.map((d) => Math.max(d.spent, d.historicalLimit)), 1);

  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current;
      el.scrollLeft = el.scrollWidth - el.clientWidth;
    }
  }, []);

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

      {/* Tooltip */}
      {tooltip && (
        <div className="text-center text-xs text-foreground mb-1 animate-fade-in-up">
          <span className="font-semibold">{tooltip.day}</span>
          <br />
          <span className="font-tabular">Расход: {formatAmount(tooltip.amount)} ₸</span>
          <span className="text-muted-foreground mx-1">·</span>
          <span className="font-tabular text-muted-foreground">Лимит: {formatAmount(tooltip.limit)} ₸</span>
          {tooltip.amount > tooltip.limit && tooltip.limit > 0 && (
            <span className="text-alert-orange ml-1">(+{formatAmount(tooltip.amount - tooltip.limit)} ₸)</span>
          )}
        </div>
      )}

      <div ref={scrollRef} className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1 pt-1">
        {dailyData.map((d) => {
          const pct = Math.min((d.spent / maxValue) * 100, 100);
          const overBudget = d.spent > d.historicalLimit;
          const limitPct = Math.min((d.historicalLimit / maxValue) * 100, 100);

          const dateObj = new Date(d.dateStr);
          const tooltipLabel = `${dateObj.getDate()} ${months[dateObj.getMonth()]}`;

          return (
            <div
              key={d.dateStr}
              className="flex flex-col items-center gap-1 min-w-[28px] cursor-pointer"
              onClick={() =>
                setTooltip(tooltip?.day === tooltipLabel ? null : { day: tooltipLabel, amount: d.spent, limit: d.historicalLimit })
              }
            >
              <div className="relative w-5 h-16 rounded-md overflow-hidden flex items-end" style={{ background: "hsl(0 0% 14%)" }}>
                {/* Per-day limit marker */}
                <div
                  className="absolute w-full border-t border-dashed border-white/20"
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
