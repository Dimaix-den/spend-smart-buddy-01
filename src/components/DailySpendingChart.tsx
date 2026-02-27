import { useRef, useEffect, useState, useMemo } from "react";
import { Expense } from "@/hooks/useFinance";
import { formatAmount } from "@/lib/formatAmount";

interface DailySpendingChartProps {
  expenses: Expense[];
  totalDays: number;
  currentDay: number;
  dailyBudget: number;
  startDate: string;
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
  const [tooltip, setTooltip] = useState<{ day: string; amount: number; limit: number } | null>(
    null
  );

  const months = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

  const dailyData = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    // все даты, где были операции
    const datesWithData = Array.from(new Set(expenses.map((e) => e.date))).sort(); // "YYYY-MM-DD"

    const hasAnyData = datesWithData.length > 0;
    const hasDataToday = datesWithData.includes(todayStr);

    let visibleDays: string[] = [];

    if (!hasAnyData || (hasDataToday && datesWithData.length === 1)) {
      // кейс: нет данных вообще ИЛИ данные только сегодня
      // первый столбец = сегодня, дальше 10 будущих дней
      for (let i = 0; i < 11; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        visibleDays.push(d.toISOString().split("T")[0]);
      }
    } else {
      // есть данные за прошлые дни
      const firstDateStr = datesWithData[0]; // первый день с операциями
      const first = new Date(firstDateStr);
      const last = new Date(todayStr); // всегда сегодня

      // все дни от первой даты с данными до сегодня
      const allDays: string[] = [];
      for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
        allDays.push(d.toISOString().split("T")[0]);
      }

      // максимум 14 последних
      visibleDays = allDays.slice(-14);

      // если всё равно меньше 11 (например, пользователь начал 3 дня назад),
      // добавляем будущие дни после сегодня, чтобы было минимум 11
      while (visibleDays.length < 11) {
        const lastDay = new Date(visibleDays[visibleDays.length - 1]);
        lastDay.setDate(lastDay.getDate() + 1);
        visibleDays.push(lastDay.toISOString().split("T")[0]);
      }
    }

    const data: {
      day: number;
      spent: number;
      dateStr: string;
      isToday: boolean;
      historicalLimit: number;
    }[] = [];

    visibleDays.forEach((dateStr) => {
      const date = new Date(dateStr);
      const dayNum = date.getDate();

      const daySpending = expenses
        .filter((e) => e.type === "regular" && e.date === dateStr)
        .reduce((sum, e) => sum + e.amount, 0);

      // считаем исторический лимит
      let spendingAfterThisDay = 0;
      let incomeAfterThisDay = 0;

      visibleDays.forEach((futureDateStr) => {
        if (futureDateStr > dateStr) {
          spendingAfterThisDay += expenses
            .filter((e) => e.type === "regular" && e.date === futureDateStr)
            .reduce((sum, e) => sum + e.amount, 0);
          incomeAfterThisDay += expenses
            .filter((e) => e.type === "income" && e.date === futureDateStr)
            .reduce((sum, e) => sum + e.amount, 0);
        }
      });

      const balanceOnDay = activeBalance + spendingAfterThisDay - incomeAfterThisDay;
      const daysLeftOnDay = Math.max(
        1,
        new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - dayNum
      );
      const availableOnDay = balanceOnDay - remainingObligations - stillNeedToSave;

      const historicalLimit =
        dateStr === todayStr
          ? dailyBudget // для "сегодня" лимит = дневной лимит из хедера
          : Math.max(0, Math.round(availableOnDay / daysLeftOnDay));

      data.push({
        day: dayNum,
        spent: daySpending,
        dateStr,
        isToday: dateStr === todayStr,
        historicalLimit,
      });
    });

    return data;
  }, [expenses, activeBalance, remainingObligations, stillNeedToSave, dailyBudget]);

  const maxValue = Math.max(
    dailyBudget,
    ...dailyData.map((d) => Math.max(d.spent, d.historicalLimit)),
    1
  );

  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current;
      el.scrollLeft = el.scrollWidth - el.clientWidth;
    }
  }, []);

  return (
    <div className="space-y-2">
      {/* Легенда сверху, без заголовка блока */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Расходы за последние дни</span>
        <div className="flex items-center gap-3">
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
        <div className="text-center text-[11px] text-foreground mb-1">
          <span className="font-semibold">{tooltip.day}</span>
          <br />
          <span className="font-tabular">
            Расход: {formatAmount(tooltip.amount)} ₸
          </span>
          <span className="text-muted-foreground mx-1">·</span>
          <span className="font-tabular text-muted-foreground">
            Лимит: {formatAmount(tooltip.limit)} ₸
          </span>
          {tooltip.amount > tooltip.limit && tooltip.limit > 0 && (
            <span className="text-alert-orange ml-1">
              (+{formatAmount(tooltip.amount - tooltip.limit)} ₸)
            </span>
          )}
        </div>
      )}

      {/* Бар‑чарт */}
      <div
        ref={scrollRef}
        className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1 pt-1"
      >
        {dailyData.map((d) => {
          const pct = Math.min((d.spent / maxValue) * 100, 100);
          const overBudget = d.spent > d.historicalLimit;
          const limitPct = Math.min((d.historicalLimit / maxValue) * 100, 100);

          const dateObj = new Date(d.dateStr);
          const tooltipLabel = `${dateObj.getDate()} ${months[dateObj.getMonth()]}`;

          return (
            <div
              key={d.dateStr}
              className="flex flex-col items-center gap-1 min-w-[30px] cursor-pointer"
              onClick={() =>
                setTooltip(
                  tooltip?.day === tooltipLabel
                    ? null
                    : { day: tooltipLabel, amount: d.spent, limit: d.historicalLimit }
                )
              }
            >
              <div
                className="relative w-5 h-16 rounded-md overflow-hidden flex items-end"
                style={{ background: "hsl(0 0% 14%)" }}
              >
                {/* Маркер лимита */}
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
