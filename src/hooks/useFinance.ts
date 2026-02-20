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
}

export interface Expense {
  id: string;
  date: string;
  amount: number;
  account: string;
  isObligation: boolean;
  obligationName?: string;
}

export interface BudgetPeriod {
  totalDays: number;
  currentDay: number;
}

export interface FinanceState {
  accounts: Account[];
  obligations: Obligation[];
  savingsGoal: number;
  budgetPeriod: BudgetPeriod;
  expenses: Expense[];
}

const STORAGE_KEY = "sanda_finance_v1";

const DEFAULT_STATE: FinanceState = {
  accounts: [
    { id: "1", name: "Kaspi Gold", balance: 150000, isActive: true },
    { id: "2", name: "Halyk", balance: 45000, isActive: true },
    { id: "3", name: "Наличка", balance: 5000, isActive: true },
    { id: "4", name: "Депозит", balance: 500000, isActive: false },
  ],
  obligations: [
    { id: "1", name: "Аренда", amount: 60000 },
    { id: "2", name: "Kaspi рассрочка", amount: 15000 },
    { id: "3", name: "Halyk кредит", amount: 22000 },
    { id: "4", name: "Подписки", amount: 5000 },
  ],
  savingsGoal: 30000,
  budgetPeriod: { totalDays: 30, currentDay: 12 },
  expenses: [
    { id: "e1", date: new Date().toISOString().split("T")[0], amount: 3500, account: "Kaspi Gold", isObligation: false },
    { id: "e2", date: new Date().toISOString().split("T")[0], amount: 800, account: "Наличка", isObligation: false },
  ],
};

function loadState(): FinanceState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return DEFAULT_STATE;
}

function saveState(state: FinanceState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function useFinance() {
  const [state, setState] = useState<FinanceState>(loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  // ─── Calculations ──────────────────────────────────────────────
  const activeBalance = state.accounts
    .filter((a) => a.isActive)
    .reduce((sum, a) => sum + a.balance, 0);

  const totalObligations = state.obligations.reduce((sum, o) => sum + o.amount, 0);

  const daysLeft = Math.max(1, state.budgetPeriod.totalDays - state.budgetPeriod.currentDay);

  const available = activeBalance - totalObligations - state.savingsGoal;

  const safeToSpendRaw = available / daysLeft;
  const safeToSpend = Math.max(0, Math.round(safeToSpendRaw));
  const safeToSpendStatus = safeToSpendRaw < 0 ? "deficit" : "ok";

  const monthlyBudget = Math.max(0, available);

  const spentThisMonth = state.expenses
    .filter((e) => !e.isObligation)
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
      accounts: [
        ...s.accounts,
        { id: Date.now().toString(), name, balance, isActive },
      ],
    }));
  }, []);

  const deleteAccount = useCallback((id: string) => {
    setState((s) => ({ ...s, accounts: s.accounts.filter((a) => a.id !== id) }));
  }, []);

  // ─── Obligation actions ────────────────────────────────────────
  const addObligation = useCallback((name: string, amount: number) => {
    setState((s) => ({
      ...s,
      obligations: [...s.obligations, { id: Date.now().toString(), name, amount }],
    }));
  }, []);

  const updateObligation = useCallback((id: string, name: string, amount: number) => {
    setState((s) => ({
      ...s,
      obligations: s.obligations.map((o) => (o.id === id ? { ...o, name, amount } : o)),
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
    (amount: number, accountName: string, isObligation: boolean, obligationName?: string) => {
      const expense: Expense = {
        id: Date.now().toString(),
        date: new Date().toISOString().split("T")[0],
        amount,
        account: accountName,
        isObligation,
        obligationName,
      };
      setState((s) => {
        const updatedAccounts = s.accounts.map((a) =>
          a.name === accountName ? { ...a, balance: Math.max(0, a.balance - amount) } : a
        );
        return { ...s, accounts: updatedAccounts, expenses: [expense, ...s.expenses] };
      });
    },
    []
  );

  const deleteExpense = useCallback((id: string) => {
    setState((s) => ({ ...s, expenses: s.expenses.filter((e) => e.id !== id) }));
  }, []);

  // ─── New month ─────────────────────────────────────────────────
  const startNewMonth = useCallback(() => {
    setState((s) => ({
      ...s,
      budgetPeriod: { ...s.budgetPeriod, currentDay: 1 },
      expenses: [],
    }));
  }, []);

  return {
    state,
    // Calculated values
    activeBalance,
    totalObligations,
    daysLeft,
    safeToSpend,
    safeToSpendStatus,
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
    deleteObligation,
    setSavingsGoal,
    updateBudgetPeriod,
    addExpense,
    deleteExpense,
    startNewMonth,
  };
}
