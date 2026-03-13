import { useState, useEffect } from "react";

interface StreakData {
  count: number;
  lastCheckedDate: string; // YYYY-MM-DD
  lastStatus: "ok" | "fail" | null;
}

const STREAK_KEY = "sanda_streak_v1";

function today() {
  return new Date().toISOString().split("T")[0];
}

function loadStreak(): StreakData {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { count: 0, lastCheckedDate: "", lastStatus: null };
}

function saveStreak(data: StreakData) {
  try {
    localStorage.setItem(STREAK_KEY, JSON.stringify(data));
  } catch {}
}

/**
 * Страйк растёт если каждый день spentToday <= effectiveDailyBudget.
 * Проверка происходит при смене даты — вчерашний день засчитывается.
 * Сегодняшний день ещё не закончился — страйк показывается как есть.
 */
export function useStreak(spentToday: number, effectiveDailyBudget: number) {
  const [streak, setStreak] = useState<StreakData>(loadStreak);

  useEffect(() => {
    const todayStr = today();
    const data = loadStreak();

    if (!data.lastCheckedDate) {
      // Первый запуск — инициализируем
      const initial: StreakData = { count: 0, lastCheckedDate: todayStr, lastStatus: null };
      saveStreak(initial);
      setStreak(initial);
      return;
    }

    if (data.lastCheckedDate === todayStr) {
      // Тот же день — просто отдаём текущее состояние
      setStreak(data);
      return;
    }

    // Новый день — засчитываем вчерашний
    // Проверяем был ли пропуск (больше 1 дня)
    const lastMs = new Date(data.lastCheckedDate).getTime();
    const todayMs = new Date(todayStr).getTime();
    const daysDiff = Math.round((todayMs - lastMs) / 86400000);

    let newCount = data.count;

    if (daysDiff > 1) {
      // Пропустили день(и) — страйк сбрасывается
      newCount = 0;
    }
    // если daysDiff === 1 — вчерашний статус уже записан в lastStatus
    // страйк уже обновлён при записи вчера

    const updated: StreakData = {
      count: newCount,
      lastCheckedDate: todayStr,
      lastStatus: null,
    };
    saveStreak(updated);
    setStreak(updated);
  }, []);

  // Записываем результат дня при изменении потраченного
  useEffect(() => {
    const todayStr = today();
    const data = loadStreak();
    if (data.lastCheckedDate !== todayStr) return;

    // Обновляем статус текущего дня в реальном времени (но не финализируем)
    // Финализация происходит при следующем открытии приложения
    setStreak((prev) => ({ ...prev, lastStatus: spentToday <= effectiveDailyBudget ? "ok" : "fail" }));
  }, [spentToday, effectiveDailyBudget]);

  // Метод для ручной финализации — вызывается при смене дня
  const finalizeDay = (wasWithinLimit: boolean) => {
    const todayStr = today();
    const data = loadStreak();
    const newCount = wasWithinLimit ? data.count + 1 : 0;
    const updated: StreakData = {
      count: newCount,
      lastCheckedDate: todayStr,
      lastStatus: wasWithinLimit ? "ok" : "fail",
    };
    saveStreak(updated);
    setStreak(updated);
  };

  // При монтировании — если вчера не финализировали, делаем это сейчас
  useEffect(() => {
    const todayStr = today();
    const data = loadStreak();
    if (!data.lastCheckedDate || data.lastCheckedDate === todayStr) return;

    const lastMs = new Date(data.lastCheckedDate).getTime();
    const todayMs = new Date(todayStr).getTime();
    const daysDiff = Math.round((todayMs - lastMs) / 86400000);

    if (daysDiff === 1 && data.lastStatus !== null) {
      // Вчера был записан статус — финализируем
      const newCount = data.lastStatus === "ok" ? data.count + 1 : 0;
      const updated: StreakData = {
        count: newCount,
        lastCheckedDate: todayStr,
        lastStatus: null,
      };
      saveStreak(updated);
      setStreak(updated);
    } else if (daysDiff > 1) {
      const updated: StreakData = { count: 0, lastCheckedDate: todayStr, lastStatus: null };
      saveStreak(updated);
      setStreak(updated);
    }
  }, []);

  const isOnTrack = spentToday <= effectiveDailyBudget;

  return {
    count: streak.count,
    isOnTrack,
  };
}
