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
}: BudgetDisciplineProps) {
  const weekDaysShort = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];

  const days = useMemo(() => {
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

    // Find first transaction date
    const allDates = expenses.filter((e) => e.date).map((e) => e.date);
    const firstDateStr = allDates.length > 0 ? allDates.sort()[0] : null;
    const firstDate = firstDateStr ? new Date(firstDateStr + "T00:00:00") : null;

    // Build spending map for the week (only regular expenses)
    const spendingByDate = new Map<string, number>();
    for (const e of expenses) {
      if (e.type === "regular" && e.date) {
        spendingByDate.set(e.date, (spendingByDate.get(e.date) || 0) + e.amount);
      }
    }

    // Find Monday of current week
    const currentDayOfWeek = today.getDay();
    const daysFromMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
    const monday = new Date(todayY, todayM, todayD - daysFromMonday);
    monday.setHours(0, 0, 0, 0);

    type DayItem = {
      dateStr: string;
      dayNum: number;
      weekDay: number;
      spent: number;
      limit: number;
      isToday: boolean;
      status: "no-data" | "within-budget" | "exceeded" | "future";
    };

    const daysList: DayItem[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      d.setHours(0, 0, 0, 0);

      const dateStr = formatLocalDate(d);
      const dayNum = d.getDate();
      const jsDay = d.getDay();
      const weekDay = jsDay === 0 ? 6 : jsDay - 1;

      const dTime = d.getTime();
      const todayTime = today.getTime();

      let status: DayItem["status"];
      const spent = spendingByDate.get(dateStr) || 0;

      if (dTime > todayTime) {
        status = "future";
      } else if (!firstDate || dTime < firstDate.getTime()) {
        status = "no-data";
      } else {
        status = spent <= dailyBudget ? "within-budget" : "exceeded";
      }

      daysList.push({
        dateStr,
        dayNum,
        weekDay,
        spent,
        limit: dailyBudget,
        isToday: dateStr === todayStr,
        status,
      });
    }

    return daysList;
  }, [expenses, dailyBudget]);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          let borderColor: string;
          let textColor: string;
          let borderStyle: "solid" | "dashed" = "solid";

          if (d.status === "no-data" || d.status === "future") {
            borderColor = "hsl(var(--muted-foreground) / 0.3)";
            textColor = "hsl(var(--muted-foreground))";
          } else if (d.status === "exceeded") {
            borderColor = "hsl(var(--destructive))";
            textColor = "hsl(var(--destructive))";
          } else {
            borderColor = "hsl(var(--accent))";
            textColor = "hsl(var(--accent))";
          }

          if (d.isToday) {
            borderStyle = "dashed";
          }

          return (
            <div
              key={d.dateStr}
              className="flex flex-col items-center justify-center"
            >
              <span className="text-[9px] text-muted-foreground leading-none mb-1">
                {weekDaysShort[d.weekDay]}
              </span>
              <div
                className="flex items-center justify-center"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "999px",
                  borderWidth: 2,
                  borderStyle,
                  borderColor,
                  background: "transparent",
                }}
              >
                <span
                  className="text-[14px] font-semibold leading-none"
                  style={{ color: textColor }}
                >
                  {d.dayNum}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
