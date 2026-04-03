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

describe("buildDisciplineData – dynamic limits", () => {
  it("computes rolling limits: underspending increases future limits", () => {
    // Period: Apr 1-10 (10 days), budget = 10000
    // Day 1: limit = 10000/10 = 1000, spent 500 → within-budget
    // Day 2: remaining = 9500/9 ≈ 1056 → within-budget (spent 0)
    const result = buildDisciplineData({
      expenses: [regularExpense("2026-04-01", 500)],
      totalPeriodBudget: 10000,
      periodStartStr: "2026-04-01",
      totalDaysInPeriod: 10,
      weekOffset: 0,
      now: new Date("2026-04-03T12:00:00"),
    });

    const day1 = result.days.find((d) => d.dateStr === "2026-04-01");
    expect(day1).toMatchObject({ limit: 1000, spent: 500, status: "within-budget" });

    const day2 = result.days.find((d) => d.dateStr === "2026-04-02");
    expect(day2).toMatchObject({ limit: 1056, spent: 0, status: "within-budget" });

    expect(result.streak).toBe(3);
  });

  it("overspending reduces future limits and marks exceeded", () => {
    const result = buildDisciplineData({
      expenses: [regularExpense("2026-04-01", 5000)],
      totalPeriodBudget: 10000,
      periodStartStr: "2026-04-01",
      totalDaysInPeriod: 10,
      weekOffset: 0,
      now: new Date("2026-04-03T12:00:00"),
    });

    const day1 = result.days.find((d) => d.dateStr === "2026-04-01");
    expect(day1!.status).toBe("exceeded");

    // Day 2: (10000 - 5000) / 9 ≈ 556
    const day2 = result.days.find((d) => d.dateStr === "2026-04-02");
    expect(day2!.limit).toBe(556);
  });

  it("recalculates fully when backdated expenses are added", () => {
    const base = {
      totalPeriodBudget: 10000,
      periodStartStr: "2026-04-01",
      totalDaysInPeriod: 10,
      now: new Date("2026-04-03T12:00:00"),
    };

    const before = buildDisciplineData({ ...base, expenses: [] });
    expect(before.days.find((d) => d.dateStr === "2026-04-01")!.status).toBe("within-budget");

    const after = buildDisciplineData({
      ...base,
      expenses: [regularExpense("2026-04-01", 2000)],
    });
    expect(after.days.find((d) => d.dateStr === "2026-04-01")!.status).toBe("exceeded");
  });
});