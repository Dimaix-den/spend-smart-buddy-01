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
      if (parsed.obligations && parsed.obligations.length > 0 && !("paid" in parsed.obligations[0])) {
        parsed.obligations = parsed.obligations.map((o) => ({ ...o, paid: false }));
      }
      if (parsed.expenses && parsed.expenses.length > 0 && !("type" in parsed.expenses[0])) {
        parsed.expenses = parsed.expenses.map((e: any) => ({
          ...e,
          type: e.isObligation ? "obligation" : "regular",
          obligationId: null,
          toAccount: null,
          note: "",
        }));
      }
      if (!parsed.currentDate) parsed.currentDate = today();
      if (!parsed.budgetPeriod.startDate) parsed.budgetPeriod.startDate = today();
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

function maybeAdvanceDay(state: FinanceState): FinanceState {
  const nowDate = today();
  if (state.currentDate === nowDate) return state;
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

  const available = activeBalance - remainingObligations - stillNeedToSave;
  const dailyBudget = Math.max(0, Math.round(available / daysLeft));

  const todayStr = state.currentDate;
  const spentToday = state.expenses
    .filter((e) => e.date === todayStr && e.type === "regular")
    .reduce((sum, e) => sum + e.amount, 0);

  const safeToSpendRaw = dailyBudget - spentToday;
  const safeToSpend = Math.round(safeToSpendRaw);

  const percentSpent = dailyBudget > 0 ? ((dailyBudget - Math.max(0, safeToSpend)) / dailyBudget) * 100 : 0;
  const safeToSpendStatus =
    safeToSpend < 0 ? "overspent" : percentSpent >= 80 ? "warning" : "ok";

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
        const updatedAccounts = s.accounts.map((a) =>
          a.name === accountName ? { ...a, balance: Math.max(0, a.balance - amount) } : a
        );
        const finalAccounts =
          type === "savings" && opts?.toAccount
            ? updatedAccounts.map((a) =>
                a.name === opts.toAccount ? { ...a, balance: a.balance + amount } : a
              )
            : updatedAccounts;
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
    setState((s) => {
      const expense = s.expenses.find((e) => e.id === id);
      if (!expense) return { ...s, expenses: s.expenses.filter((e) => e.id !== id) };

      // Reverse the balance change
      let updatedAccounts = s.accounts;
      if (expense.type === "income") {
        updatedAccounts = updatedAccounts.map((a) =>
          a.name === expense.account ? { ...a, balance: a.balance - expense.amount } : a
        );
      } else {
        updatedAccounts = updatedAccounts.map((a) =>
          a.name === expense.account ? { ...a, balance: a.balance + expense.amount } : a
        );
        if (expense.type === "savings" && expense.toAccount) {
          updatedAccounts = updatedAccounts.map((a) =>
            a.name === expense.toAccount ? { ...a, balance: a.balance - expense.amount } : a
          );
        }
      }

      // Reverse obligation paid status
      let updatedObligations = s.obligations;
      if (expense.type === "obligation" && expense.obligationId) {
        updatedObligations = updatedObligations.map((o) =>
          o.id === expense.obligationId ? { ...o, paid: false } : o
        );
      }

      return {
        ...s,
        accounts: updatedAccounts,
        obligations: updatedObligations,
        expenses: s.expenses.filter((e) => e.id !== id),
      };
    });
  }, []);

  const updateExpense = useCallback((id: string, amount: number, accountName: string, note: string) => {
    setState((s) => {
      const old = s.expenses.find((e) => e.id === id);
      if (!old) return s;

      // Reverse old balance
      let accs = s.accounts;
      if (old.type === "income") {
        accs = accs.map((a) => a.name === old.account ? { ...a, balance: a.balance - old.amount } : a);
      } else {
        accs = accs.map((a) => a.name === old.account ? { ...a, balance: a.balance + old.amount } : a);
      }

      // Apply new balance
      if (old.type === "income") {
        accs = accs.map((a) => a.name === accountName ? { ...a, balance: a.balance + amount } : a);
      } else {
        accs = accs.map((a) => a.name === accountName ? { ...a, balance: Math.max(0, a.balance - amount) } : a);
      }

      return {
        ...s,
        accounts: accs,
        expenses: s.expenses.map((e) =>
          e.id === id ? { ...e, amount, account: accountName, note } : e
        ),
      };
    });
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
    updateExpense,
    startNewMonth,
  };
}
