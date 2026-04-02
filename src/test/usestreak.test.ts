import { describe, expect, it } from "vitest";
import { buildDisciplineData } from "@/hooks/usestreak";
import type { Expense } from "@/hooks/useFinance";

const regularExpense = (date: string, amount: number): Expense => ({
  id: `${date}-${amount}`,
  date,
  amount,
  account: "Kaspi Gold",
  type: "regular",
});

describe("buildDisciplineData", () => {
  it("keeps past day status stable from saved history", () => {
    const result = buildDisciplineData({
      expenses: [regularExpense("2026-04-01", 80)],
      dailyBudget: 50,
      activeBalance: 0,
      remainingObligations: 0,
      stillNeedToSave: 0,
      lastOpenedDates: ["2026-04-01", "2026-04-02", "2026-04-03"],
      dayHistory: {
        "2026-04-01": { spent: 80, limit: 100, status: "within-budget" },
      },
      now: new Date("2026-04-03T10:00:00"),
    });

    const aprilFirst = result.days.find((day) => day.dateStr === "2026-04-01");

    expect(aprilFirst).toMatchObject({
      status: "within-budget",
      spent: 80,
      limit: 100,
    });
  });

  it("counts streak across multiple weeks instead of only visible week", () => {
    const lastOpenedDates = [
      "2026-04-05",
      "2026-04-06",
      "2026-04-07",
      "2026-04-08",
      "2026-04-09",
      "2026-04-10",
      "2026-04-11",
      "2026-04-12",
      "2026-04-13",
      "2026-04-14",
    ];

    const result = buildDisciplineData({
      expenses: [],
      dailyBudget: 100,
      activeBalance: 0,
      remainingObligations: 0,
      stillNeedToSave: 0,
      lastOpenedDates,
      dayHistory: {},
      now: new Date("2026-04-14T10:00:00"),
    });

    expect(result.streak).toBe(10);
  });
});