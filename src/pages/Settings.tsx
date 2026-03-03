import { useState } from "react";
import { useFinance } from "@/hooks/useFinance";

interface SettingsProps {
  finance: ReturnType<typeof useFinance>;
}

export default function Settings({ finance }: SettingsProps) {
  const { state, updateSettings } = finance;

  const [periodType, setPeriodType] = useState<"calendar" | "salary">(
    state.budgetPeriodType || "calendar"
  );
  const [salaryDay, setSalaryDay] = useState(state.salaryDay || 15);

  const handlePeriodChange = (type: "calendar" | "salary") => {
    setPeriodType(type);
    updateSettings({ budgetPeriodType: type, salaryDay });
  };

  const handleDayChange = (day: number) => {
    setSalaryDay(day);
    updateSettings({ budgetPeriodType: periodType, salaryDay: day });
  };

  const days = Array.from({ length: 28 }, (_, i) => i + 1);

  return (
    <div className="flex flex-col min-h-screen pb-28">
      <div className="px-5 pt-10 pb-6">
        <h1 className="text-2xl font-bold text-foreground">Настройки</h1>
      </div>

      <div className="flex-1 px-4 space-y-6">
        {/* Budget Period */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">
            Период бюджета
          </h2>
          <div className="glass-card p-4 space-y-4">
            {/* Calendar month option */}
            <button
              onClick={() => handlePeriodChange("calendar")}
              className="w-full flex items-start gap-3 text-left"
            >
              <div
                className="w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center mt-0.5"
                style={{
                  borderColor: periodType === "calendar" ? "hsl(162 100% 33%)" : "hsl(0 0% 40%)",
                }}
              >
                {periodType === "calendar" && (
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: "hsl(162 100% 33%)" }}
                  />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Календарный месяц</p>
                <p className="text-xs text-muted-foreground mt-0.5">1-е — последнее число месяца</p>
              </div>
            </button>

            {/* Salary period option */}
            <button
              onClick={() => handlePeriodChange("salary")}
              className="w-full flex items-start gap-3 text-left"
            >
              <div
                className="w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center mt-0.5"
                style={{
                  borderColor: periodType === "salary" ? "hsl(162 100% 33%)" : "hsl(0 0% 40%)",
                }}
              >
                {periodType === "salary" && (
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: "hsl(162 100% 33%)" }}
                  />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">От зарплаты до зарплаты</p>
                <p className="text-xs text-muted-foreground mt-0.5">Бюджет считается от дня зарплаты</p>
              </div>
            </button>

            {/* Salary day selector */}
            {periodType === "salary" && (
              <div className="pl-8 animate-fade-in-up">
                <label className="text-xs text-muted-foreground mb-2 block">
                  Дата зарплаты
                </label>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                  {days.map((d) => (
                    <button
                      key={d}
                      onClick={() => handleDayChange(d)}
                      className="flex-shrink-0 w-10 h-10 rounded-[10px] text-sm font-semibold transition-all"
                      style={{
                        background: salaryDay === d ? "hsl(162 100% 33%)" : "hsl(0 0% 18%)",
                        color: salaryDay === d ? "white" : "hsl(0 0% 60%)",
                      }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Currency */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">
            Валюта
          </h2>
          <div className="glass-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Основная валюта</span>
              <span className="text-sm font-semibold text-muted-foreground">KZT ₸</span>
            </div>
          </div>
        </div>

        {/* About */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">
            О приложении
          </h2>
          <div className="glass-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">SANDA</span>
              <span className="text-xs text-muted-foreground">v2.0.0</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Личный финансовый помощник. Контролируй расходы, следи за бюджетом.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
