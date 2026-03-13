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

  const { days } = useMemo(() => {
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

    const allTransactions = expenses.filter((e) => e.date);
    const firstTransaction = allTransactions.sort((a, b) => a.date.localeCompare(b.date))[0];
    const firstDate = firstTransaction ? new Date(firstTransaction.date + "T00:00:00") : null;

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

    const currentDayOfWeek = today.getDay();
    const daysFromMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
    const monday = new Date(todayY, todayM, todayD - daysFromMonday);
    monday.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      d.setHours(0, 0, 0, 0);

      const dateStr = formatLocalDate(d);
      const dayNum = d.getDate();
      const jsDay = d.getDay();
      const weekDay = jsDay === 0 ? 6 : jsDay - 1;

      const dTime = d.getTime();
      const todayTime = today.getTime();

      let status: "no-data" | "within-budget" | "exceeded" | "future";
      let spent = 0;
      const limitForDay = dailyBudget;

      if (dTime > todayTime) {
        status = "future";
      } else if (!firstDate || dTime < firstDate.getTime()) {
        status = "no-data";
      } else if (dateStr === todayStr) {
        spent = expenses
          .filter((e) => e.type === "regular" && e.date === dateStr)
          .reduce((sum, e) => sum + e.amount, 0);

        status = spent <= limitForDay ? "within-budget" : "exceeded";
      } else {
        const savedStatus = localStorage.getItem(`day_status_${dateStr}`);

        if (savedStatus) {
          status = savedStatus as "within-budget" | "exceeded";

          const savedSpent = localStorage.getItem(`day_spent_${dateStr}`);
          spent = savedSpent ? parseFloat(savedSpent) : 0;
        } else {
          spent = expenses
            .filter((e) => e.type === "regular" && e.date === dateStr)
            .reduce((sum, e) => sum + e.amount, 0);

          status = spent <= limitForDay ? "within-budget" : "exceeded";
        }
      }

      daysList.push({
        dateStr,
        dayNum,
        weekDay,
        spent,
        limit: limitForDay,
        isToday: dateStr === todayStr,
        status,
      });
    }

    return { days: daysList };
  }, [expenses, dailyBudget, activeBalance, remainingObligations, stillNeedToSave]);

  return (
    <div className="space-y-2 ">
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const dateObj = new Date(d.dateStr + "T00:00:00");
          const label = `${dateObj.getDate()} ${months[dateObj.getMonth()]}`;

          const isFuture = d.status === "future";
          const isNoData = d.status === "no-data";

          const grayColor = "hsl(0 0% 25%)";
          const greenColor = "hsl(162 100% 45%)";
          const redColor = "hsl(0 76% 61%)";

          const dayTextColor =
            isFuture || isNoData ? "hsl(0 0% 50%)" : "#ffffff";

          let wrapperStyle: React.CSSProperties;

          if (isFuture) {
            // Будущие дни: пунктирный серый бордер, без прогресса
            wrapperStyle = {
              width: 38,
              height: 38,
              borderRadius: "999px",
              borderWidth: 2,
              borderStyle: "dashed",
              borderColor: grayColor,
              backgroundColor: "transparent",
            };
          } else {
            // Прошлые / сегодня: прогресс‑бордер
            const ratio = d.limit > 0 && !isNoData ? d.spent / d.limit : 0;

            // 0–1: зелёное кольцо уменьшается, серое растёт
            const greenRatio = Math.max(0, Math.min(1 - ratio, 1));
            const greenDeg = greenRatio * 360;

            // >1–2: поверх серого добавляется красное кольцо
            const overRatio = ratio > 1 ? Math.min(ratio - 1, 1) : 0;
            const redDeg = overRatio * 360;

            let backgroundImage: string;

            if (isNoData) {
              backgroundImage = `conic-gradient(${grayColor} 0deg 360deg)`;
            } else {
              backgroundImage = `
                conic-gradient(
                  ${greenColor} 0deg ${greenDeg}deg,
                  ${grayColor} ${greenDeg}deg 360deg
                )
              `;

              if (redDeg > 0) {
                backgroundImage = `
                  conic-gradient(
                    ${redColor} 0deg ${redDeg}deg,
                    transparent ${redDeg}deg 360deg
                  ),
                  conic-gradient(
                    ${grayColor} 0deg 360deg
                  )
                `;
              }
            }

            wrapperStyle = {
              width: 38,
              height: 38,
              borderRadius: "999px",
              borderWidth: 2,
              borderStyle: "solid",
              borderColor: "transparent",
              backgroundImage,
              backgroundOrigin: "border-box",
              backgroundClip: "border-box",
            };
          }

          return (
          <div
            key={d.dateStr}
            aria-label={label}
            className={
              d.isToday
                ? "flex flex-col items-center justify-center px-1 py-2 rounded-xl"
                : "flex flex-col items-center justify-center"
            }
            style={
              d.isToday
                ? {
                    backgroundColor: "rgba(140,146,172,0.18)", // серый фон
                  }
                : {}
            }
          >
            <span
              className="text-[14px] leading-none mb-2"
              style={{ color: "hsl(0 0% 65%)" }}
            >
              {weekDaysShort[d.weekDay]}
            </span>

            <div className="flex items-center justify-center">
              <div className="flex items-center justify-center" style={wrapperStyle}>
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "999px",
                    backgroundColor: "hsl(222 0% 0%)",
                  }}
                >
                  <span
                    className="text-[16px] font-regular leading-none"
                    style={{ color: dayTextColor }}
                  >
                    {d.dayNum}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );

        })}
      </div>
    </div>
  );
}
