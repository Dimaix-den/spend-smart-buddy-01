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

    // Найти самую первую транзакцию (день начала использования)
    const allTransactions = expenses.filter((e) => e.date);
    
    const firstTransaction = allTransactions
      .sort((a, b) => a.date.localeCompare(b.date))[0];
    
    const firstDate = firstTransaction ? new Date(firstTransaction.date + 'T00:00:00') : null;

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

    // Находим понедельник текущей недели
    const currentDayOfWeek = today.getDay();
    const daysFromMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
    
    const monday = new Date(todayY, todayM, todayD - daysFromMonday);
    monday.setHours(0, 0, 0, 0);

    // Генерируем 7 дней с понедельника
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
      let limitForDay = dailyBudget;

      if (dTime > todayTime) {
        // Будущий день
        status = "future";
      } else if (!firstDate || dTime < firstDate.getTime()) {
        // День ДО начала использования
        status = "no-data";
      } else if (dateStr === todayStr) {
        // СЕГОДНЯ - считаем в реальном времени
        spent = expenses
          .filter((e) => e.type === "regular" && e.date === dateStr)
          .reduce((sum, e) => sum + e.amount, 0);
        
        status = spent <= limitForDay ? "within-budget" : "exceeded";
      } else {
        // ПРОШЛЫЙ ДЕНЬ - берём сохранённый статус
        // Сначала проверяем есть ли сохранённый статус в localStorage
        const savedStatus = localStorage.getItem(`day_status_${dateStr}`);
        
        if (savedStatus) {
          // Используем сохранённый статус
          status = savedStatus as "within-budget" | "exceeded";
          
          // Загружаем сохранённые траты (для отображения, если нужно)
          const savedSpent = localStorage.getItem(`day_spent_${dateStr}`);
          spent = savedSpent ? parseFloat(savedSpent) : 0;
        } else {
          // Если статус не сохранён (старые дни до внедрения фичи)
          // Считаем по текущим данным
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

  // Сохраняем статус вчерашнего дня в конце дня (в полночь)
  // Это нужно делать в useEffect, который отслеживает смену дня
  // Добавь этот код в родительский компонент или здесь через useEffect:
  /*
  useEffect(() => {
    const checkAndSaveYesterday = () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const yesterdayStr = formatLocalDate(yesterday);
      
      // Проверяем сохранён ли уже статус вчерашнего дня
      const savedStatus = localStorage.getItem(`day_status_${yesterdayStr}`);
      
      if (!savedStatus) {
        // Считаем траты за вчера
        const spent = expenses
          .filter((e) => e.type === "regular" && e.date === yesterdayStr)
          .reduce((sum, e) => sum + e.amount, 0);
        
        // Определяем статус
        const status = spent <= dailyBudget ? "within-budget" : "exceeded";
        
        // Сохраняем
        localStorage.setItem(`day_status_${yesterdayStr}`, status);
        localStorage.setItem(`day_spent_${yesterdayStr}`, spent.toString());
      }
    };
    
    // Проверяем при загрузке компонента
    checkAndSaveYesterday();
    
    // Проверяем каждую минуту (чтобы поймать полночь)
    const interval = setInterval(checkAndSaveYesterday, 60000);
    
    return () => clearInterval(interval);
  }, [expenses, dailyBudget]);
  */

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const dateObj = new Date(d.dateStr + 'T00:00:00');
          const label = `${dateObj.getDate()} ${months[dateObj.getMonth()]}`;

          let borderColor: string;
          let textColor: string;
          let borderStyle: "solid" | "dashed" = "solid";
          
          if (d.status === "no-data" || d.status === "future") {
            borderColor = "hsl(0 0% 15%)";
            textColor = "hsl(0 0% 50%)";
          } else if (d.status === "exceeded") {
            borderColor = "hsl(0 76% 61%)";
            textColor = "hsl(0 76% 61%)";
          } else {
            borderColor = "hsl(162 100% 33%)";
            textColor = "hsl(162 100% 33%)";
          }
          
          if (d.isToday) {
            borderStyle = "dashed";
          }

          return (
            <div
              key={d.dateStr}
              className="flex flex-col items-center justify-center"
              aria-label={label}
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
                  borderStyle: borderStyle,
                  borderColor: borderColor,
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
