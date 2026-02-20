import { useState, useEffect, useCallback } from "react";

export interface Account {
  id: string;
  name: string;
  balance: number;
  isActive: boolean;
}

export interface Obligation {
  id: string;
  name: string;
  amount: number;
  paid: boolean;
}

export type ExpenseType = "regular" | "obligation" | "savings" | "income";

export interface Expense {
  id: string;
  date: string;
  amount: number;
  account: string;
  type: ExpenseType;
  obligationId?: string | null;
  toAccount?: string | null;
  note?: string;
}

export interface BudgetPeriod {
  totalDays: number;
  currentDay: number;
  startDate: string;
}

export interface FinanceState {
  accounts: Account[];
  obligations: Obligation[];
  savingsGoal: number;
  budgetPeriod: BudgetPeriod;
  expenses: Expense[];
  currentDate: string;
}

const STORAGE_KEY = "sanda_finance_v2";

const today = () => new Date().toISOString().split("T")[0];

const DEFAULT_STATE: FinanceState = {
  accounts: [
    { id: "1", name: "Kaspi Gold", balance: 150000, isActive: true },
    { id: "2", name: "Halyk", balance: 45000, isActive: true },
    { id: "3", name: "Наличка", balance: 5000, isActive: true },
    { id: "4", name: "Депозит", balance: 500000, isActive: false },
  ],
  obligations: [
    { id: "1", name: "Аренда", amount: 60000, paid: false },
    { id: "2", name: "Kaspi рассрочка", amount: 15000, paid: false },
    { id: "3", name: "Halyk кредит", amount: 22000, paid: false },
    { id: "4", name: "Подписки", amount: 5000, paid: false },
  ],
  savingsGoal: 30000,
  budgetPeriod: { totalDays: 30, currentDay: 12, startDate: "2025-11-01" },
  expenses: [],
  currentDate: today(),
};

function loadState(): FinanceState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as FinanceState;
      // Migrate obligations to include paid field if missing
      if (parsed.obligations && parsed.obligations.length > 0 && !("paid" in parsed.obligations[0])) {
        parsed.obligations = parsed.obligations.map((o) => ({ ...o, paid: false }));
      }
      // Migrate expenses to new type system if needed
      if (parsed.expenses && parsed.expenses.length > 0 && !("type" in parsed.expenses[0])) {
        parsed.expenses = parsed.expenses.map((e: any) => ({
          ...e,
          type: e.isObligation ? "obligation" : "regular",
          obligationId: e.obligationName ? null : null,
          toAccount: null,
          note: "",
        }));
      }
      if (!parsed.currentDate) {
        parsed.currentDate = today();
      }
      if (!parsed.budgetPeriod.startDate) {
        parsed.budgetPeriod.startDate = today();
      }
      return parsed;
    }
  } catch {}
  return DEFAULT_STATE;
}

function saveState(state: FinanceState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

/** Check if a new day started since last save and advance the day counter */
function maybeAdvanceDay(state: FinanceState): FinanceState {
  const nowDate = today();
  if (state.currentDate === nowDate) return state;

  // Count calendar days elapsed between stored date and today
  const storedMs = new Date(state.currentDate).getTime();
  const nowMs = new Date(nowDate).getTime();
  const daysElapsed = Math.round((nowMs - storedMs) / 86400000);

  const newCurrentDay = Math.min(
    state.budgetPeriod.currentDay + daysElapsed,
    state.budgetPeriod.totalDays
  );

  return {
    ...state,
    currentDate: nowDate,
    budgetPeriod: { ...state.budgetPeriod, currentDay: newCurrentDay },
  };
}

export function useFinance() {
  const [state, setState] = useState<FinanceState>(() => {
    const loaded = loadState();
    return maybeAdvanceDay(loaded);
  });

  useEffect(() => {
    saveState(state);
  }, [state]);

  // ─── Core calculations ─────────────────────────────────────────

  const activeBalance = state.accounts
    .filter((a) => a.isActive)
    .reduce((sum, a) => sum + a.balance, 0);

  const remainingObligations = state.obligations
    .filter((o) => !o.paid)
    .reduce((sum, o) => sum + o.amount, 0);

  const totalObligations = state.obligations.reduce((sum, o) => sum + o.amount, 0);

  const alreadySaved = state.expenses
    .filter((e) => e.type === "savings")
    .reduce((sum, e) => sum + e.amount, 0);

  const stillNeedToSave = Math.max(0, state.savingsGoal - alreadySaved);

  const daysLeft = Math.max(1, state.budgetPeriod.totalDays - state.budgetPeriod.currentDay);

  // dailyBudget: how much to spend per day for remaining days
  const available = activeBalance - remainingObligations - stillNeedToSave;
  const dailyBudget = Math.max(0, Math.round(available / daysLeft));

  // spentToday: only regular expenses logged today
  const todayStr = state.currentDate;
  const spentToday = state.expenses
    .filter((e) => e.date === todayStr && e.type === "regular")
    .reduce((sum, e) => sum + e.amount, 0);

  // safeToSpend: real-time remaining for today
  const safeToSpendRaw = dailyBudget - spentToday;
  const safeToSpend = Math.round(safeToSpendRaw);

  const percentSpent = dailyBudget > 0 ? ((dailyBudget - Math.max(0, safeToSpend)) / dailyBudget) * 100 : 0;
  const safeToSpendStatus =
    safeToSpend < 0 ? "overspent" : percentSpent >= 80 ? "warning" : "ok";

  // Monthly budget remaining
  const monthlyBudget = Math.max(0, available);
  const spentThisMonth = state.expenses
    .filter((e) => e.type === "regular")
    .reduce((sum, e) => sum + e.amount, 0);
  const budgetRemaining = monthlyBudget - spentThisMonth;
  const budgetStatus =
    budgetRemaining < monthlyBudget * 0.2
      ? "critical"
      : budgetRemaining < monthlyBudget * 0.5
      ? "warning"
      : "good";

  const monthProgress = Math.min(
    100,
    Math.round((state.budgetPeriod.currentDay / state.budgetPeriod.totalDays) * 100)
  );

  const savingsProgress = state.savingsGoal > 0 ? Math.min(100, Math.round((alreadySaved / state.savingsGoal) * 100)) : 0;

  // ─── Account actions ───────────────────────────────────────────
  const toggleAccount = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      accounts: s.accounts.map((a) => (a.id === id ? { ...a, isActive: !a.isActive } : a)),
    }));
  }, []);

  const updateAccountBalance = useCallback((id: string, balance: number) => {
    setState((s) => ({
      ...s,
      accounts: s.accounts.map((a) => (a.id === id ? { ...a, balance } : a)),
    }));
  }, []);

  const updateAccountName = useCallback((id: string, name: string) => {
    setState((s) => ({
      ...s,
      accounts: s.accounts.map((a) => (a.id === id ? { ...a, name } : a)),
    }));
  }, []);

  const addAccount = useCallback((name: string, balance: number, isActive = true) => {
    setState((s) => ({
      ...s,
      accounts: [...s.accounts, { id: Date.now().toString(), name, balance, isActive }],
    }));
  }, []);

  const deleteAccount = useCallback((id: string) => {
    setState((s) => ({ ...s, accounts: s.accounts.filter((a) => a.id !== id) }));
  }, []);

  // ─── Obligation actions ────────────────────────────────────────
  const addObligation = useCallback((name: string, amount: number) => {
    setState((s) => ({
      ...s,
      obligations: [...s.obligations, { id: Date.now().toString(), name, amount, paid: false }],
    }));
  }, []);

  const updateObligation = useCallback((id: string, name: string, amount: number) => {
    setState((s) => ({
      ...s,
      obligations: s.obligations.map((o) => (o.id === id ? { ...o, name, amount } : o)),
    }));
  }, []);

  const toggleObligationPaid = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      obligations: s.obligations.map((o) => (o.id === id ? { ...o, paid: !o.paid } : o)),
    }));
  }, []);

  const deleteObligation = useCallback((id: string) => {
    setState((s) => ({ ...s, obligations: s.obligations.filter((o) => o.id !== id) }));
  }, []);

  // ─── Settings actions ──────────────────────────────────────────
  const setSavingsGoal = useCallback((goal: number) => {
    setState((s) => ({ ...s, savingsGoal: goal }));
  }, []);

  const updateBudgetPeriod = useCallback((period: Partial<BudgetPeriod>) => {
    setState((s) => ({ ...s, budgetPeriod: { ...s.budgetPeriod, ...period } }));
  }, []);

  // ─── Expense actions ───────────────────────────────────────────
  const addExpense = useCallback(
    (
      amount: number,
      accountName: string,
      type: ExpenseType,
      opts?: { obligationId?: string; toAccount?: string; note?: string }
    ) => {
      setState((s) => {
        const nowDate = s.currentDate;

        // Deduct from source account
        const updatedAccounts = s.accounts.map((a) =>
          a.name === accountName ? { ...a, balance: Math.max(0, a.balance - amount) } : a
        );

        // If savings and transferring to another account, increase that account
        const finalAccounts =
          type === "savings" && opts?.toAccount
            ? updatedAccounts.map((a) =>
                a.name === opts.toAccount ? { ...a, balance: a.balance + amount } : a
              )
            : updatedAccounts;

        // If obligation payment, mark obligation as paid
        const updatedObligations =
          type === "obligation" && opts?.obligationId
            ? s.obligations.map((o) =>
                o.id === opts.obligationId ? { ...o, paid: true } : o
              )
            : s.obligations;

        const expense: Expense = {
          id: Date.now().toString(),
          date: nowDate,
          amount,
          account: accountName,
          type,
          obligationId: opts?.obligationId ?? null,
          toAccount: opts?.toAccount ?? null,
          note: opts?.note ?? "",
        };

        return {
          ...s,
          accounts: finalAccounts,
          obligations: updatedObligations,
          expenses: [expense, ...s.expenses],
        };
      });
    },
    []
  );

  const addIncome = useCallback((amount: number, accountName: string, note?: string) => {
    setState((s) => {
      const nowDate = s.currentDate;
      const updatedAccounts = s.accounts.map((a) =>
        a.name === accountName ? { ...a, balance: a.balance + amount } : a
      );
      const income: Expense = {
        id: Date.now().toString(),
        date: nowDate,
        amount,
        account: accountName,
        type: "income",
        note: note ?? "",
      };
      return { ...s, accounts: updatedAccounts, expenses: [income, ...s.expenses] };
    });
  }, []);

  const deleteExpense = useCallback((id: string) => {
    setState((s) => ({ ...s, expenses: s.expenses.filter((e) => e.id !== id) }));
  }, []);

  // ─── New month ─────────────────────────────────────────────────
  const startNewMonth = useCallback(() => {
    setState((s) => ({
      ...s,
      budgetPeriod: { ...s.budgetPeriod, currentDay: 1, startDate: today() },
      obligations: s.obligations.map((o) => ({ ...o, paid: false })),
      expenses: [],
      currentDate: today(),
    }));
  }, []);

  return {
    state,
    // Calculated values
    activeBalance,
    totalObligations,
    remainingObligations,
    daysLeft,
    dailyBudget,
    spentToday,
    safeToSpend,
    safeToSpendStatus,
    alreadySaved,
    stillNeedToSave,
    savingsProgress,
    monthlyBudget,
    spentThisMonth,
    budgetRemaining,
    budgetStatus,
    monthProgress,
    // Actions
    toggleAccount,
    updateAccountBalance,
    updateAccountName,
    addAccount,
    deleteAccount,
    addObligation,
    updateObligation,
    toggleObligationPaid,
    deleteObligation,
    setSavingsGoal,
    updateBudgetPeriod,
    addExpense,
    addIncome,
    deleteExpense,
    startNewMonth,
  };
}
