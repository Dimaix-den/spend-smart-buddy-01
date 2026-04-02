import type { CSSProperties, Dispatch, SetStateAction } from "react";
import { DisciplineDay } from "@/hooks/usestreak";

interface BudgetDisciplineProps {
  days: DisciplineDay[];
  weekOffset?: number;
  onWeekOffsetChange?: Dispatch<SetStateAction<number>>;
}

export default function BudgetDiscipline({ days, weekOffset = 0, onWeekOffsetChange }: BudgetDisciplineProps) {
  const months = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  const weekDaysShort = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];
  const startDay = days[0];
  const endDay = days[days.length - 1];

  const formatWeekLabel = () => {
    if (!startDay || !endDay) return "";

    const startDate = new Date(startDay.dateStr + "T00:00:00");
    const endDate = new Date(endDay.dateStr + "T00:00:00");

    if (startDate.getMonth() === endDate.getMonth()) {
      return `${startDate.getDate()}–${endDate.getDate()} ${months[endDate.getMonth()]}`;
    }

  };

  const grayColor = "hsl(var(--muted))";
  const greenColor = "hsl(var(--safe-green))";
  const redColor = "hsl(var(--destructive))";
  const mutedText = "hsl(var(--muted-foreground))";

  return (
    <div className="space-y-0">
      <div className="flex items-start justify-between gap-3">
        <div>

          <div className="mt-1 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{formatWeekLabel()}</span>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const dateObj = new Date(d.dateStr + "T00:00:00");
          const label = `${dateObj.getDate()} ${months[dateObj.getMonth()]}`;

          const isFuture = d.status === "future";
          const isNoData = d.status === "no-data";
          const dayTextColor = isFuture || isNoData ? mutedText : "hsl(var(--foreground))";

          let wrapperStyle: CSSProperties;

          if (isFuture) {
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
            const ratio = d.limit > 0 && !isNoData ? d.spent / d.limit : 0;
            const greenRatio = Math.max(0, Math.min(1 - ratio, 1));
            const greenDeg = greenRatio * 360;
            const overRatio = ratio > 1 ? Math.min(ratio - 1, 1) : 0;
            const redDeg = overRatio * 360;

            let backgroundImage: string;

            if (isNoData) {
              backgroundImage = `conic-gradient(${grayColor} 0deg 360deg)`;
            } else if (redDeg > 0) {
              backgroundImage = `
                conic-gradient(
                  ${redColor} 0deg ${redDeg}deg,
                  transparent ${redDeg}deg 360deg
                ),
                conic-gradient(${grayColor} 0deg 360deg)
              `;
            } else {
              backgroundImage = `
                conic-gradient(
                  ${greenColor} 0deg ${greenDeg}deg,
                  ${grayColor} ${greenDeg}deg 360deg
                )
              `;
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
                  ? "flex flex-col items-center justify-center rounded-xl px-1 py-2"
                  : "flex flex-col items-center justify-center"
              }
              style={d.isToday ? { backgroundColor: "hsl(var(--secondary) / 0.8)" } : {}}
            >
              <span
                className="mb-2 text-[14px] leading-none"
                style={{ color: mutedText }}
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
                      backgroundColor: "hsl(var(--background))",
                    }}
                  >
                    <span
                      className="text-[16px] leading-none"
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
