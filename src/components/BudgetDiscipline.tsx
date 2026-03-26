import { DisciplineDay } from "@/hooks/usestreak";

interface BudgetDisciplineProps {
  days: DisciplineDay[];
}

export default function BudgetDiscipline({ days }: BudgetDisciplineProps) {
  const months = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  const weekDaysShort = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];

  return (
    <div className="space-y-2">
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
            // Сколько потратил относительно лимита (0..∞)
            const rawRatio = d.limit > 0 && !isNoData ? d.spent / d.limit : 0;
            // Для зелёной части ограничиваем максимум 1 (то есть 100%)
            const clampedRatio = Math.min(rawRatio, 1);

            // Показываем красный только если день реально "пробил лимит"
            // (в useStreak такой день помечен статусом "exceeded")
            const showRed = d.status === "exceeded";

            // Зелёный сектор: чем меньше потратил, тем больше зелёного
            const greenRatio = Math.max(0, Math.min(1 - clampedRatio, 1));
            const greenDeg = greenRatio * 360;

            // Насколько "сверх лимита" ушли (для красного сектора)
            const overRatio = showRed ? Math.min(rawRatio - 1, 1) : 0;
            const redDeg = overRatio > 0 ? overRatio * 360 : 0;

            let backgroundImage: string;

            if (isNoData) {
              // Нет данных — просто серый кружок
              backgroundImage = `conic-gradient(${grayColor} 0deg 360deg)`;
            } else if (showRed && redDeg > 0) {
              // День превышен — добавляем красную дугу поверх
              backgroundImage = `
                conic-gradient(
                  ${redColor} 0deg ${redDeg}deg,
                  transparent ${redDeg}deg 360deg
                ),
                conic-gradient(
                  ${grayColor} 0deg 360deg
                )
              `;
            } else {
              // Обычный день в лимите — зелёная + серая часть
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
                  ? "flex flex-col items-center justify-center px-1 py-2 rounded-xl"
                  : "flex flex-col items-center justify-center"
              }
              style={
                d.isToday
                  ? { backgroundColor: "rgba(140,146,172,0.18)" }
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
