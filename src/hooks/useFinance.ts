import { useState, useEffect, useCallback } from "react";

export type AccountType = "active" | "savings" | "inactive";

export interface Account {
  id: string;
  name: string;
  balance: number;
  isActive: boolean;
  type: AccountType;
  monthlyGoal?: number | null;
}

export interface Obligation {
  id: string;
  name: string;
  amount: number;
  paid: boolean;
  installments?: { total: number; remaining: number } | null;
}

export type ExpenseType = "regular" | "obligation" | "savings" | "income" | "transfer";

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
  monthStartBalances?: Record<string, number>;
}

const STORAGE_KEY = "sanda_finance_v3";

const today = () => new Date().toISOString().split("T")[0];

const DEFAULT_STATE: FinanceState = {
  accounts: [
    { id: "1", name: "Kaspi Gold", balance: 150000, isActive: true, type: "active" },
    { id: "2", name: "Halyk", balance: 45000, isActive: true, type: "active" },
    { id: "3", name: "Наличка", balance: 5000, isActive: true, type: "active" },
    { id: "4", name: "Фин. подушка", balance: 500000, isActive: false, type: "savings", monthlyGoal: 100000 },
    { id: "5", name: "На поездки", balance: 200000, isActive: false, type: "savings", monthlyGoal: 50000 },
    // Скрытый счёт для корректировок (вне учёта лимитов и UI)
    { id: "adj", name: "Вне учёта", balance: 0, isActive: false, type: "inactive" },
  ],
  obligations: [
    { id: "1", name: "Аренда", amount: 60000, paid: false },
    { id: "2", name: "Kaspi рассрочка", amount: 15000, paid: false, installments: { total: 8, remaining: 5 } },
    { id: "3", name: "Halyk кредит", amount: 22000, paid: false, installments: { total: 24, remaining: 18 } },
    { id: "4", name: "Подписки", amount: 5000, paid: false },
  ],
  savingsGoal: 150000,
  budgetPeriod: { totalDays: 30, currentDay: 12, startDate: "2025-11-01" },
  expenses: [],
  currentDate: today(),
};

function migrateState(parsed: any): FinanceState {
  if (parsed.accounts) {
    parsed.accounts = parsed.accounts.map((a: any) => ({
      ...a,
      type: a.type || (a.isActive ? "active" : "inactive"),
      monthlyGoal: a.monthlyGoal ?? null,
    }));

    // Гарантируем наличие скрытого счёта "Вне учёта"
    const hasAdj = parsed.accounts.some((a: any) => a.name === "Вне учёта");
    if (!hasAdj) {
      parsed.accounts.push({
        id: "adj",
        name: "Вне учёта",
        balance: 0,
        isActive: false,
        type: "inactive" as AccountType,
        monthlyGoal: null,
      });
    }
  }

  if (parsed.obligations) {
    parsed.obligations = parsed.obligations.map((o: any) => ({
      ...o,
      paid: o.paid ?? false,
      installments: o.installments ?? null,
    }));
  }

  if (parsed.expenses) {
    parsed.expenses = parsed.expenses.map((e: any) => ({
      ...e,
      type: e.type || (e.isObligation ? "obligation" : "regular"),
      obligationId: e.obligationId ?? null,
      toAccount: e.toAccount ?? null,
      note: e.note ?? "",
    }));
  }

  if (!parsed.currentDate) parsed.currentDate = today();
  if (!parsed.budgetPeriod?.startDate) parsed.budgetPeriod.startDate = today();
  return parsed as FinanceState;
}

function loadState(): FinanceState {
  try {
    let stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      stored = localStorage.getItem("sanda_finance_v2");
    }
    if (stored) {
      const parsed = JSON.parse(stored);
      return migrateState(parsed);
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

  // ─── Derived: accounts by type ────────────────────────────────
  const activeAccounts = state.accounts.filter((a) => a.type === "active");
  const savingsAccounts = state.accounts.filter((a) => a.type === "savings");
  const inactiveAccounts = state.accounts.filter((a) => a.type === "inactive");

  // ─── Core calculations ─────────────────────────────────────────
  const activeBalance = activeAccounts.reduce((sum, a) => sum + a.balance, 0);

  const remainingObligations = state.obligations
    .filter((o) => !o.paid)
    .reduce((sum, o) => sum + o.amount, 0);

  const totalObligations = state.obligations.reduce((sum, o) => sum + o.amount, 0);

  const plannedSavings = savingsAccounts.reduce((sum, a) => sum + (a.monthlyGoal || 0), 0);

  const alreadySaved = state.expenses
    .filter(
      (e) =>
        e.type === "savings" ||
        (e.type === "transfer" && savingsAccounts.some((sa) => sa.name === e.toAccount))
    )
    .reduce((sum, e) => sum + e.amount, 0);

  const getSavingsForAccount = useCallback(
    (accountName: string) => {
      return state.expenses
        .filter(
          (e) =>
            (e.type === "savings" || e.type === "transfer") &&
            e.toAccount === accountName
        )
        .reduce((sum, e) => sum + e.amount, 0);
    },
    [state.expenses]
  );

  const stillNeedToSave = Math.max(0, plannedSavings - alreadySaved);

  const daysLeft = Math.max(1, state.budgetPeriod.totalDays - state.budgetPeriod.currentDay);

  const available = activeBalance - remainingObligations - stillNeedToSave;
  const dailyBudget = Math.max(0, Math.round(available / daysLeft));

  const todayStr = state.currentDate;
  const spentToday = state.expenses
    .filter((e) => e.date === todayStr && e.type === "regular")
    .reduce((sum, e) => sum + e.amount, 0);

  const safeToSpendRaw = dailyBudget - spentToday;
  const safeToSpend = Math.round(safeToSpendRaw);

  const percentSpent =
    dailyBudget > 0 ? ((dailyBudget - Math.max(0, safeToSpend)) / dailyBudget) * 100 : 0;
  const safeToSpendStatus =
    safeToSpend < 0 ? "overspent" : percentSpent >= 80 ? "warning" : "ok";

  // ─── Monthly budget ────────────────────────────────────────────
  const monthStartBalance = Object.values(state.monthStartBalances || {}).reduce(
    (s, v) => s + v,
    0
  );
  const monthlyIncome = state.expenses
    .filter((e) => e.type === "income")
    .reduce((sum, e) => sum + e.amount, 0);
  const monthlyBudget = monthStartBalance + monthlyIncome;

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

  const savingsProgress =
    plannedSavings > 0
      ? Math.min(100, Math.round((alreadySaved / plannedSavings) * 100))
      : 0;

  // ─── Account actions ───────────────────────────────────────────
  const toggleAccount = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      accounts: s.accounts.map((a) => {
        if (a.id !== id) return a;
        if (a.type === "active")
          return { ...a, type: "inactive" as AccountType, isActive: false };
        if (a.type === "inactive")
          return { ...a, type: "active" as AccountType, isActive: true };
        return a;
      }),
    }));
  }, []);

  const updateAccountBalance = useCallback((id: string, balance: number) => {
    setState((s) => {
      const account = s.accounts.find((a) => a.id === id);
      if (!account) return s;

      const diff = balance - account.balance;
      if (diff === 0) {
        return {
          ...s,
          accounts: s.accounts.map((a) =>
            a.id === id ? { ...a, balance } : a
          ),
        };
      }

      // Счёт для корректировок
      const adjAccount = s.accounts.find((a) => a.name === "Вне учёта");
      if (!adjAccount) return s;

      let updatedAccounts = s.accounts.map((a) =>
        a.id === id ? { ...a, balance } : a
      );

      let adjNewBalance = adjAccount.balance;

      // diff > 0: на счёте стало БОЛЬШЕ — деньги пришли из "Корректировок"
      // diff < 0: на счёте стало МЕНЬШЕ — деньги ушли в "Вне учёта"
      if (diff > 0) {
        adjNewBalance -= diff;
      } else {
        adjNewBalance += Math.abs(diff);
      }

      updatedAccounts = updatedAccounts.map((a) =>
        a.id === adjAccount.id ? { ...a, balance: adjNewBalance } : a
      );

      const adjustment: Expense = {
        id: Date.now().toString(),
        date: s.currentDate,
        amount: Math.abs(diff),
        account: diff > 0 ? adjAccount.name : account.name,
        type: "transfer",
        toAccount: diff > 0 ? account.name : adjAccount.name,
        note: "Корректировка баланса",
      };

      return {
        ...s,
        accounts: updatedAccounts,
        expenses: [adjustment, ...s.expenses],
      };
    });
  }, []);

  const updateAccountName = useCallback((id: string, name: string) => {
    setState((s) => ({
      ...s,
      accounts: s.accounts.map((a) => (a.id === id ? { ...a, name } : a)),
    }));
  }, []);

  const updateAccountType = useCallback((id: string, type: AccountType) => {
    setState((s) => ({
      ...s,
      accounts: s.accounts.map((a) =>
        a.id === id ? { ...a, type, isActive: type === "active" } : a
      ),
    }));
  }, []);

  const updateAccountGoal = useCallback((id: string, monthlyGoal: number) => {
    setState((s) => ({
      ...s,
      accounts: s.accounts.map((a) =>
        a.id === id ? { ...a, monthlyGoal } : a
      ),
    }));
  }, []);

  const addAccount = useCallback(
    (name: string, balance: number, type: AccountType = "active", monthlyGoal?: number) => {
      setState((s) => ({
        ...s,
        accounts: [
          ...s.accounts,
          {
            id: Date.now().toString(),
            name,
            balance,
            isActive: type === "active",
            type,
            monthlyGoal: monthlyGoal ?? null,
          },
        ],
      }));
    },
    []
  );

  const deleteAccount = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      accounts: s.accounts.filter((a) => a.id !== id),
    }));
  }, []);

  // ─── Obligation actions ────────────────────────────────────────
  const addObligation = useCallback(
    (name: string, amount: number, installments?: { total: number; remaining: number }) => {
      setState((s) => ({
        ...s,
        obligations: [
          ...s.obligations,
          {
            id: Date.now().toString(),
            name,
            amount,
            paid: false,
            installments: installments ?? null,
          },
        ],
      }));
    },
    []
  );

  const updateObligation = useCallback((id: string, name: string, amount: number) => {
    setState((s) => ({
      ...s,
      obligations: s.obligations.map((o) =>
        o.id === id ? { ...o, name, amount } : o
      ),
    }));
  }, []);

  const toggleObligationPaid = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      obligations: s.obligations.map((o) =>
        o.id === id ? { ...o, paid: !o.paid } : o
      ),
    }));
  }, []);

  const deleteObligation = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      obligations: s.obligations.filter((o) => o.id !== id),
    }));
  }, []);

  // ─── Settings actions ──────────────────────────────────────────
  const setSavingsGoal = useCallback((goal: number) => {
    setState((s) => ({ ...s, savingsGoal: goal }));
  }, []);

  const updateBudgetPeriod = useCallback((period: Partial<BudgetPeriod>) => {
    setState((s) => ({
      ...s,
      budgetPeriod: { ...s.budgetPeriod, ...period },
    }));
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

        let updatedAccounts = s.accounts.map((a) =>
          a.name === accountName ? { ...a, balance: a.balance - amount } : a
        );

        if ((type === "savings" || type === "transfer") && opts?.toAccount) {
          updatedAccounts = updatedAccounts.map((a) =>
            a.name === opts.toAccount ? { ...a, balance: a.balance + amount } : a
          );
        }

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
          accounts: updatedAccounts,
          obligations: updatedObligations,
          expenses: [expense, ...s.expenses],
        };
      });
    },
    []
  );

  const addIncome = useCallback(
    (amount: number, accountName: string, note?: string) => {
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
    },
    []
  );

  const deleteExpense = useCallback((id: string) => {
    setState((s) => {
      const expense = s.expenses.find((e) => e.id === id);
      if (!expense)
        return { ...s, expenses: s.expenses.filter((e) => e.id !== id) };

      let updatedAccounts = s.accounts;
      if (expense.type === "income") {
        updatedAccounts = updatedAccounts.map((a) =>
          a.name === expense.account
            ? { ...a, balance: a.balance - expense.amount }
            : a
        );
      } else {
        updatedAccounts = updatedAccounts.map((a) =>
          a.name === expense.account
            ? { ...a, balance: a.balance + expense.amount }
            : a
        );
        if (
          (expense.type === "savings" || expense.type === "transfer") &&
          expense.toAccount
        ) {
          updatedAccounts = updatedAccounts.map((a) =>
            a.name === expense.toAccount
              ? { ...a, balance: a.balance - expense.amount }
              : a
          );
        }
      }

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

  const updateExpense = useCallback(
    (id: string, amount: number, accountName: string, note: string) => {
      setState((s) => {
        const old = s.expenses.find((e) => e.id === id);
        if (!old) return s;

        let accs = s.accounts;
        if (old.type === "income") {
          accs = accs.map((a) =>
            a.name === old.account
              ? { ...a, balance: a.balance - old.amount }
              : a
          );
        } else {
          accs = accs.map((a) =>
            a.name === old.account
              ? { ...a, balance: a.balance + old.amount }
              : a
          );
        }

        if (old.type === "income") {
          accs = accs.map((a) =>
            a.name === accountName
              ? { ...a, balance: a.balance + amount }
              : a
          );
        } else {
          accs = accs.map((a) =>
            a.name === accountName
              ? { ...a, balance: a.balance - amount }
              : a
          );
        }

        return {
          ...s,
          accounts: accs,
          expenses: s.expenses.map((e) =>
            e.id === id ? { ...e, amount, account: accountName, note } : e
          ),
        };
      });
    },
    []
  );

  // ─── New month (auto-detect) ────────────────────────────────────
  useEffect(() => {
    if (!state.monthStartBalances) {
      const balances: Record<string, number> = {};
      state.accounts
        .filter((a) => a.type === "active")
        .forEach((a) => {
          balances[a.id] = a.balance;
        });
      setState((s) => ({ ...s, monthStartBalances: balances }));
    }
  }, []);

  useEffect(() => {
    const currentMonth = new Date().getMonth();
    const startMonth = new Date(state.budgetPeriod.startDate).getMonth();
    if (currentMonth !== startMonth) {
      setState((s) => {
        const balances: Record<string, number> = {};
        s.accounts
          .filter((a) => a.type === "active")
          .forEach((a) => {
            balances[a.id] = a.balance;
          });
        return {
          ...s,
          budgetPeriod: { ...s.budgetPeriod, currentDay: 1, startDate: today() },
          obligations: s.obligations.map((o) => ({ ...o, paid: false })),
          expenses: [],
          monthStartBalances: balances,
          currentDate: today(),
        };
      });
    }
  }, []);

  return {
    state,
    activeAccounts,
    savingsAccounts,
    inactiveAccounts,
    activeBalance,
    totalObligations,
    remainingObligations,
    plannedSavings,
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
    getSavingsForAccount,
    toggleAccount,
    updateAccountBalance,
    updateAccountName,
    updateAccountType,
    updateAccountGoal,
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
  };
}
