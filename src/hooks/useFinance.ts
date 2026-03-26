import { useState, useEffect, useCallback, useRef } from "react";
import { loadFromFirestore, saveToFirestore } from "@/lib/firestore";

export type AccountType = "active" | "savings" | "inactive";

export interface Account {
  id: string;
  name: string;
  balance: number;
  isActive: boolean;
  type: AccountType;
  monthlyGoal?: number | null;
  isSystem?: boolean;
  usageCount?: number;
  lastUsed?: string;
}

export interface Obligation {
  id: string;
  name: string;
  totalAmount: number;
  monthlyPayment: number;
  paidMonths: number;
  paid: boolean; // paid this month
}

export interface Asset {
  id: string;
  name: string;
  value: number;
}

export type RecurrenceType = "none" | "monthly" | "yearly";

export interface PlannedExpense {
  id: string;
  type: "expense" | "income";
  name: string;
  amount: number;
  date: string;
  recurring: boolean; // kept for backward compat migration
  recurrence: RecurrenceType;
  paidInMonths?: string[]; // ["2026-03", "2026-04"] — months where marked as done
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
  plannedExpenseId?: string | null;
}

export interface BudgetPeriod {
  totalDays: number;
  currentDay: number;
  startDate: string;
}

export interface FinanceState {
  accounts: Account[];
  obligations: Obligation[];
  assets: Asset[];
  savingsGoal: number;
  budgetPeriod: BudgetPeriod;
  expenses: Expense[];
  currentDate: string;
  monthStartBalances?: Record<string, number>;
  budgetPeriodType?: "calendar" | "salary";
  salaryDay?: number;
  plannedExpenses?: PlannedExpense[];
  includePlansInCalculation?: boolean;
  dayHistory?: Record<string, { status: string; spent: number; limit: number }>;
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
    { id: "adj", name: "Вне учёта", balance: 0, isActive: false, type: "inactive", isSystem: true },
  ],
  obligations: [
    { id: "1", name: "Аренда", totalAmount: 60000, monthlyPayment: 60000, paidMonths: 0, paid: false },
    { id: "2", name: "Kaspi рассрочка", totalAmount: 120000, monthlyPayment: 15000, paidMonths: 3, paid: false },
    { id: "3", name: "Halyk кредит", totalAmount: 528000, monthlyPayment: 22000, paidMonths: 6, paid: false },
    { id: "4", name: "Подписки", totalAmount: 5000, monthlyPayment: 5000, paidMonths: 0, paid: false },
  ],
  savingsGoal: 150000,
  assets: [],
  budgetPeriod: { totalDays: 30, currentDay: 12, startDate: "2025-11-01" },
  expenses: [],
  currentDate: today(),
  budgetPeriodType: "calendar",
  salaryDay: 15,
  plannedExpenses: [],
  includePlansInCalculation: true,
  dayHistory: {},
};

function migrateState(parsed: any): FinanceState {
  if (parsed.accounts) {
    parsed.accounts = parsed.accounts.map((a: any) => ({
      ...a,
      type: a.type || (a.isActive ? "active" : "inactive"),
      monthlyGoal: a.monthlyGoal ?? null,
      isSystem: a.isSystem ?? (a.name === "Вне учёта"),
      usageCount: a.usageCount ?? 0,
      lastUsed: a.lastUsed ?? null,
    }));

    const hasAdj = parsed.accounts.some((a: any) => a.name === "Вне учёта");
    if (!hasAdj) {
      parsed.accounts.push({
        id: "adj", name: "Вне учёта", balance: 0, isActive: false,
        type: "inactive" as AccountType, monthlyGoal: null, isSystem: true,
      });
    }
  }

  if (parsed.obligations) {
    parsed.obligations = parsed.obligations.map((o: any) => {
      if (o.totalAmount === undefined) {
        if (o.installments) {
          return {
            id: o.id, name: o.name,
            totalAmount: o.amount * o.installments.total,
            monthlyPayment: o.amount,
            paidMonths: o.installments.total - o.installments.remaining,
            paid: o.paid ?? false,
          };
        } else {
          return {
            id: o.id, name: o.name,
            totalAmount: o.amount, monthlyPayment: o.amount,
            paidMonths: 0, paid: o.paid ?? false,
          };
        }
      }
      return { ...o, paid: o.paid ?? false };
    });
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

  // Migrate planned expenses: recurring bool → recurrence string
  if (parsed.plannedExpenses) {
    parsed.plannedExpenses = parsed.plannedExpenses.map((p: any) => ({
      ...p,
      recurrence: p.recurrence || (p.recurring ? "monthly" : "none"),
      recurring: p.recurring ?? false,
      paidInMonths: p.paidInMonths || [],
    }));
  }

  if (!parsed.currentDate) parsed.currentDate = today();
  if (!parsed.budgetPeriod?.startDate) parsed.budgetPeriod.startDate = today();
  if (!parsed.budgetPeriodType) parsed.budgetPeriodType = "calendar";
  if (!parsed.salaryDay) parsed.salaryDay = 15;
  if (!parsed.plannedExpenses) parsed.plannedExpenses = [];
  if (parsed.includePlansInCalculation === undefined) parsed.includePlansInCalculation = true;
  if (!parsed.assets) parsed.assets = [];
  if (!parsed.dayHistory) parsed.dayHistory = {};
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

/** Get plans visible in a given month, including recurring projections */
export function getPlansForMonth(
  plans: PlannedExpense[],
  year: number,
  month: number
): (PlannedExpense & { virtualDate: string })[] {
  const result: (PlannedExpense & { virtualDate: string })[] = [];
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

  for (const p of plans) {
    const d = new Date(p.date);
    const pYear = d.getFullYear();
    const pMonth = d.getMonth();
    const pDay = d.getDate();

    if (pYear === year && pMonth === month) {
      // Original month — always show
      result.push({ ...p, virtualDate: p.date });
    } else if (p.recurrence === "monthly") {
      // Show in every month on or after the original date's month
      const origMs = new Date(pYear, pMonth, 1).getTime();
      const viewMs = new Date(year, month, 1).getTime();
      if (viewMs > origMs) {
        const lastDay = new Date(year, month + 1, 0).getDate();
        const day = Math.min(pDay, lastDay);
        const vDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        result.push({ ...p, virtualDate: vDate });
      }
    } else if (p.recurrence === "yearly") {
      if (pMonth === month && year > pYear) {
        const lastDay = new Date(year, month + 1, 0).getDate();
        const day = Math.min(pDay, lastDay);
        const vDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        result.push({ ...p, virtualDate: vDate });
      }
    }
  }

  return result.sort((a, b) => a.virtualDate.localeCompare(b.virtualDate));
}

export function isPlanPaidInMonth(plan: PlannedExpense, year: number, month: number): boolean {
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  return (plan.paidInMonths || []).includes(monthKey);
}

export function useFinance(userId?: string | null) {
  const [state, setState] = useState<FinanceState>(DEFAULT_STATE);
  const [firestoreLoading, setFirestoreLoading] = useState(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedUserRef = useRef<string | null>(null);
  const readyToSave = useRef(false);

  // Load from Firestore when userId changes (or localStorage if no user)
  useEffect(() => {
    readyToSave.current = false;

    if (!userId) {
      const loaded = loadState();
      setState(maybeAdvanceDay(loaded));
      setFirestoreLoading(false);
      loadedUserRef.current = null;
      readyToSave.current = true;
      return;
    }

    if (loadedUserRef.current === userId) return;

    setFirestoreLoading(true);

    (async () => {
      const firestoreData = await loadFromFirestore(userId);
      if (firestoreData) {
        const migrated = migrateState(firestoreData);
        setState(maybeAdvanceDay(migrated));
      } else {
        const localData = loadState();
        const migrated = maybeAdvanceDay(localData);
        setState(migrated);
        await saveToFirestore(userId, migrated);
      }
      loadedUserRef.current = userId;
      setFirestoreLoading(false);
      readyToSave.current = true;
    })();
  }, [userId]);

  // Save to Firestore (debounced)
  useEffect(() => {
    if (!readyToSave.current) return;
    saveState(state);
    if (userId) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveToFirestore(userId, state);
      }, 1000);
    }
  }, [state, userId]);

  // ─── Derived ───────────────────────────────────────────────────
  const activeAccounts = state.accounts.filter((a) => a.type === "active" && !a.isSystem);
  const savingsAccounts = state.accounts.filter((a) => a.type === "savings" && !a.isSystem);
  const inactiveAccounts = state.accounts.filter((a) => a.type === "inactive" && !a.isSystem);

  const activeBalance = activeAccounts.reduce((sum, a) => sum + a.balance, 0);

  const remainingObligations = state.obligations
    .filter((o) => !o.paid)
    .reduce((sum, o) => sum + o.monthlyPayment, 0);

  const totalObligations = state.obligations.reduce((sum, o) => sum + o.monthlyPayment, 0);

  const totalDebt = state.obligations.reduce((sum, o) => {
    const isInstallment = o.totalAmount > o.monthlyPayment;
    if (isInstallment) {
      return sum + Math.max(0, o.totalAmount - o.monthlyPayment * o.paidMonths);
    }
    return sum;
  }, 0);

  const plannedSavings = savingsAccounts.reduce(
    (sum, a) => sum + (a.monthlyGoal || 0),
    0
  );

  const alreadySaved = state.expenses
    .filter((e) => {
      if (e.type === "savings") return true;
      if (e.type !== "transfer") return false;
      const isToSavings = !!e.toAccount && savingsAccounts.some((sa) => sa.name === e.toAccount);
      const isAdjInvolved = e.account === "Вне учёта" || e.toAccount === "Вне учёта";
      return isToSavings && !isAdjInvolved;
    })
    .reduce((sum, e) => sum + e.amount, 0);

  const getSavingsForAccount = useCallback(
    (accountName: string) => {
      return state.expenses
        .filter((e) => {
          if (e.toAccount !== accountName) return false;
          if (e.type === "savings") return true;
          if (e.type !== "transfer") return false;
          const isAdjInvolved = e.account === "Вне учёта" || e.toAccount === "Вне учёта";
          return !isAdjInvolved;
        })
        .reduce((sum, e) => sum + e.amount, 0);
    },
    [state.expenses]
  );

  const stillNeedToSave = Math.max(0, plannedSavings - alreadySaved);

  const now = new Date(state.currentDate);
  const year = now.getFullYear();
  const month = now.getMonth();

  let daysLeft: number;
  if (state.budgetPeriodType === "salary" && state.salaryDay) {
    const salaryDay = state.salaryDay;
    const currentDay = now.getDate();
    let periodEnd: Date;
    if (currentDay >= salaryDay) {
      periodEnd = new Date(year, month + 1, salaryDay - 1);
    } else {
      periodEnd = new Date(year, month, salaryDay - 1);
    }
    daysLeft = Math.max(1, Math.ceil((periodEnd.getTime() - now.getTime()) / 86400000));
  } else {
    const nextMonthStart = new Date(year, month + 1, 1);
    const diffMs = nextMonthStart.getTime() - now.getTime();
    daysLeft = Math.max(1, Math.ceil(diffMs / 86400000));
  }

  const available = activeBalance - remainingObligations - stillNeedToSave;
  const dailyBudget = Math.max(0, Math.round(available / daysLeft));

  const todayStr = state.currentDate;
  const spentToday = state.expenses
    .filter((e) => e.date === todayStr && e.type === "regular")
    .reduce((sum, e) => sum + e.amount, 0);

  // ─── Plans impact (exclude paid plans) ─────────────────────────
  const plans = state.plannedExpenses || [];
  const currentMonthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

  const upcomingPlannedIncome = plans
    .filter((p) => {
      if (p.type !== "income" || p.date < todayStr) return false;
      const isPaid = (p.paidInMonths || []).includes(currentMonthKey);
      return !isPaid;
    })
    .reduce((sum, p) => sum + p.amount, 0);
  const upcomingPlannedExpenses = plans
    .filter((p) => {
      if (p.type !== "expense" || p.date < todayStr) return false;
      const isPaid = (p.paidInMonths || []).includes(currentMonthKey);
      return !isPaid;
    })
    .reduce((sum, p) => sum + p.amount, 0);

  const adjustedAvailable = available + upcomingPlannedIncome - upcomingPlannedExpenses;
  const adjustedDailyBudget = Math.max(0, Math.round(adjustedAvailable / daysLeft));

  const usePlans = state.includePlansInCalculation ?? true;
  const effectiveDailyBudget = usePlans ? adjustedDailyBudget : dailyBudget;

  const safeToSpendRaw = effectiveDailyBudget - spentToday;
  const safeToSpend = Math.round(safeToSpendRaw);

  const percentSpent =
    effectiveDailyBudget > 0
      ? ((effectiveDailyBudget - Math.max(0, safeToSpend)) / effectiveDailyBudget) * 100
      : 0;
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
        return { ...s, accounts: s.accounts.map((a) => a.id === id ? { ...a, balance } : a) };
      }
      const adjAccount = s.accounts.find((a) => a.name === "Вне учёта");
      if (!adjAccount) return s;
      let updatedAccounts = s.accounts.map((a) => a.id === id ? { ...a, balance } : a);
      let adjNewBalance = adjAccount.balance;
      if (diff > 0) adjNewBalance -= diff;
      else adjNewBalance += Math.abs(diff);
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
        note: "Вне учета",
      };
      return { ...s, accounts: updatedAccounts, expenses: [adjustment, ...s.expenses] };
    });
  }, []);

  const updateAccountName = useCallback((id: string, name: string) => {
    setState((s) => ({ ...s, accounts: s.accounts.map((a) => (a.id === id ? { ...a, name } : a)) }));
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
      accounts: s.accounts.map((a) => a.id === id ? { ...a, monthlyGoal } : a),
    }));
  }, []);

  const addAccount = useCallback(
    (name: string, balance: number, type: AccountType = "active", monthlyGoal?: number) => {
      setState((s) => ({
        ...s,
        accounts: [
          ...s.accounts,
          {
            id: Date.now().toString(), name, balance,
            isActive: type === "active", type,
            monthlyGoal: monthlyGoal ?? null,
          },
        ],
      }));
    },
    []
  );

  const deleteAccount = useCallback((id: string) => {
    setState((s) => ({ ...s, accounts: s.accounts.filter((a) => a.id !== id) }));
  }, []);

  // ─── Obligation actions ────────────────────────────────────────
  const addObligation = useCallback(
    (name: string, totalAmount: number, monthlyPayment: number) => {
      setState((s) => ({
        ...s,
        obligations: [
          ...s.obligations,
          {
            id: Date.now().toString(),
            name,
            totalAmount,
            monthlyPayment,
            paidMonths: 0,
            paid: false,
          },
        ],
      }));
    },
    []
  );

  const updateObligation = useCallback(
    (id: string, updates: Partial<Pick<Obligation, "name" | "totalAmount" | "monthlyPayment" | "paidMonths">>) => {
      setState((s) => ({
        ...s,
        obligations: s.obligations.map((o) =>
          o.id === id ? { ...o, ...updates } : o
        ),
      }));
    },
    []
  );

  const markObligationPayment = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      obligations: s.obligations.map((o) =>
        o.id === id ? { ...o, paid: true, paidMonths: o.paidMonths + 1 } : o
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
    setState((s) => ({ ...s, obligations: s.obligations.filter((o) => o.id !== id) }));
  }, []);

  // ─── Asset actions ─────────────────────────────────────────────
  const addAsset = useCallback((name: string, value: number) => {
    setState((s) => ({
      ...s,
      assets: [...(s.assets || []), { id: Date.now().toString(), name, value }],
    }));
  }, []);

  const updateAsset = useCallback((id: string, updates: Partial<Pick<Asset, "name" | "value">>) => {
    setState((s) => ({
      ...s,
      assets: (s.assets || []).map((a) => a.id === id ? { ...a, ...updates } : a),
    }));
  }, []);

  const deleteAsset = useCallback((id: string) => {
    setState((s) => ({ ...s, assets: (s.assets || []).filter((a) => a.id !== id) }));
  }, []);

  const totalAssetsValue = (state.assets || []).reduce((sum, a) => sum + a.value, 0);

  // ─── Planned expense actions ───────────────────────────────────
  const addPlannedExpense = useCallback(
    (plan: Omit<PlannedExpense, "id">) => {
      setState((s) => ({
        ...s,
        plannedExpenses: [
          ...(s.plannedExpenses || []),
          { ...plan, id: Date.now().toString(), paidInMonths: plan.paidInMonths || [] },
        ],
      }));
    },
    []
  );

  const updatePlannedExpense = useCallback(
    (id: string, updates: Partial<PlannedExpense>) => {
      setState((s) => ({
        ...s,
        plannedExpenses: (s.plannedExpenses || []).map((p) =>
          p.id === id ? { ...p, ...updates } : p
        ),
      }));
    },
    []
  );

  const deletePlannedExpense = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      plannedExpenses: (s.plannedExpenses || []).filter((p) => p.id !== id),
    }));
  }, []);

  const togglePlanPaidInMonth = useCallback((id: string, year: number, month: number) => {
    const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
    setState((s) => ({
      ...s,
      plannedExpenses: (s.plannedExpenses || []).map((p) => {
        if (p.id !== id) return p;
        const paidInMonths = p.paidInMonths || [];
        if (paidInMonths.includes(monthKey)) {
          return { ...p, paidInMonths: paidInMonths.filter((m) => m !== monthKey) };
        } else {
          return { ...p, paidInMonths: [...paidInMonths, monthKey] };
        }
      }),
    }));
  }, []);

  // ─── Settings actions ──────────────────────────────────────────
  const setSavingsGoal = useCallback((goal: number) => {
    setState((s) => ({ ...s, savingsGoal: goal }));
  }, []);

  const updateBudgetPeriod = useCallback((period: Partial<BudgetPeriod>) => {
    setState((s) => ({ ...s, budgetPeriod: { ...s.budgetPeriod, ...period } }));
  }, []);

  const updateSettings = useCallback((settings: Partial<FinanceState>) => {
    setState((s) => ({ ...s, ...settings }));
  }, []);

  // ─── Expense actions ───────────────────────────────────────────
  const addExpense = useCallback(
    (
      amount: number,
      accountName: string,
      type: ExpenseType,
      opts?: { obligationId?: string; toAccount?: string; note?: string; date?: string; plannedExpenseId?: string }
    ) => {
      setState((s) => {
        const opDate = opts?.date || s.currentDate;
        let updatedAccounts = s.accounts.map((a) =>
          a.name === accountName
            ? { ...a, balance: a.balance - amount, usageCount: (a.usageCount || 0) + 1, lastUsed: new Date().toISOString() }
            : a
        );
        if ((type === "savings" || type === "transfer") && opts?.toAccount) {
          updatedAccounts = updatedAccounts.map((a) =>
            a.name === opts.toAccount
              ? { ...a, balance: a.balance + amount, usageCount: (a.usageCount || 0) + 1, lastUsed: new Date().toISOString() }
              : a
          );
        }
        const updatedObligations =
          type === "obligation" && opts?.obligationId
            ? s.obligations.map((o) =>
                o.id === opts.obligationId ? { ...o, paid: true } : o
              )
            : s.obligations;

        // If linked to a planned expense, mark it as paid for the current month
        let updatedPlans = s.plannedExpenses || [];
        if (opts?.plannedExpenseId) {
          const now = new Date(opDate);
          const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
          updatedPlans = updatedPlans.map((p) => {
            if (p.id !== opts.plannedExpenseId) return p;
            const paidInMonths = p.paidInMonths || [];
            if (paidInMonths.includes(monthKey)) return p;
            return { ...p, paidInMonths: [...paidInMonths, monthKey] };
          });
        }

        const expense: Expense = {
          id: Date.now().toString(),
          date: opDate,
          amount,
          account: accountName,
          type,
          obligationId: opts?.obligationId ?? null,
          toAccount: opts?.toAccount ?? null,
          note: opts?.note ?? "",
          plannedExpenseId: opts?.plannedExpenseId ?? null,
        };
        return { ...s, accounts: updatedAccounts, obligations: updatedObligations, plannedExpenses: updatedPlans, expenses: [expense, ...s.expenses] };
      });
    },
    []
  );

  const addIncome = useCallback(
    (amount: number, accountName: string, note?: string, date?: string, plannedExpenseId?: string) => {
      setState((s) => {
        const opDate = date || s.currentDate;
        const updatedAccounts = s.accounts.map((a) =>
          a.name === accountName
            ? { ...a, balance: a.balance + amount, usageCount: (a.usageCount || 0) + 1, lastUsed: new Date().toISOString() }
            : a
        );

        let updatedPlans = s.plannedExpenses || [];
        if (plannedExpenseId) {
          const now = new Date(opDate);
          const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
          updatedPlans = updatedPlans.map((p) => {
            if (p.id !== plannedExpenseId) return p;
            const paidInMonths = p.paidInMonths || [];
            if (paidInMonths.includes(monthKey)) return p;
            return { ...p, paidInMonths: [...paidInMonths, monthKey] };
          });
        }

        const income: Expense = {
          id: Date.now().toString(),
          date: opDate,
          amount,
          account: accountName,
          type: "income",
          note: note ?? "",
          plannedExpenseId: plannedExpenseId ?? null,
        };
        return { ...s, accounts: updatedAccounts, plannedExpenses: updatedPlans, expenses: [income, ...s.expenses] };
      });
    },
    []
  );

  const deleteExpense = useCallback((id: string) => {
    setState((s) => {
      const expense = s.expenses.find((e) => e.id === id);
      if (!expense) return { ...s, expenses: s.expenses.filter((e) => e.id !== id) };
      let updatedAccounts = s.accounts;
      if (expense.type === "income") {
        updatedAccounts = updatedAccounts.map((a) =>
          a.name === expense.account ? { ...a, balance: a.balance - expense.amount } : a
        );
      } else {
        updatedAccounts = updatedAccounts.map((a) =>
          a.name === expense.account ? { ...a, balance: a.balance + expense.amount } : a
        );
        if ((expense.type === "savings" || expense.type === "transfer") && expense.toAccount) {
          updatedAccounts = updatedAccounts.map((a) =>
            a.name === expense.toAccount ? { ...a, balance: a.balance - expense.amount } : a
          );
        }
      }
      let updatedObligations = s.obligations;
      if (expense.type === "obligation" && expense.obligationId) {
        updatedObligations = updatedObligations.map((o) =>
          o.id === expense.obligationId ? { ...o, paid: false } : o
        );
      }
      // Откатываем paidInMonths у связанного плана
      let updatedPlans = s.plannedExpenses || [];
      if (expense.plannedExpenseId) {
        const expDate = new Date(expense.date);
        const monthKey = `${expDate.getFullYear()}-${String(expDate.getMonth() + 1).padStart(2, "0")}`;
        updatedPlans = updatedPlans.map((p) => {
          if (p.id !== expense.plannedExpenseId) return p;
          return {
            ...p,
            paidInMonths: (p.paidInMonths || []).filter((m) => m !== monthKey),
          };
        });
      }
      return { ...s, accounts: updatedAccounts, obligations: updatedObligations, plannedExpenses: updatedPlans, expenses: s.expenses.filter((e) => e.id !== id) };
    });
  }, []);

  const updateExpense = useCallback(
    (id: string, amount: number, accountName: string, note: string) => {
      setState((s) => {
        const old = s.expenses.find((e) => e.id === id);
        if (!old) return s;
        let accs = s.accounts;
        if (old.type === "income") {
          accs = accs.map((a) => a.name === old.account ? { ...a, balance: a.balance - old.amount } : a);
          accs = accs.map((a) => a.name === accountName ? { ...a, balance: a.balance + amount } : a);
        } else {
          accs = accs.map((a) => a.name === old.account ? { ...a, balance: a.balance + old.amount } : a);
          accs = accs.map((a) => a.name === accountName ? { ...a, balance: a.balance - amount } : a);
        }
        return {
          ...s, accounts: accs,
          expenses: s.expenses.map((e) => e.id === id ? { ...e, amount, account: accountName, note } : e),
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
        .filter((a) => a.type === "active" && !a.isSystem)
        .forEach((a) => { balances[a.id] = a.balance; });
      setState((s) => ({ ...s, monthStartBalances: balances }));
    }
  }, []);

  useEffect(() => {
    const now = new Date();
    const startDate = new Date(state.budgetPeriod.startDate);

    const monthsDiff =
      (now.getFullYear() - startDate.getFullYear()) * 12 +
      (now.getMonth() - startDate.getMonth());

    if (monthsDiff > 0) {
      setState((s) => {
        const balances: Record<string, number> = {};
        s.accounts
          .filter((a) => a.type === "active" && !a.isSystem)
          .forEach((a) => { balances[a.id] = a.balance; });
        return {
          ...s,
          budgetPeriod: { ...s.budgetPeriod, currentDay: 1, startDate: today() },
          obligations: s.obligations.map((o) => ({ ...o, paid: false })),
          monthStartBalances: balances,
          currentDate: today(),
        };
      });
    }
  }, []);

  return {
    state,
    firestoreLoading,
    activeAccounts,
    savingsAccounts,
    inactiveAccounts,
    activeBalance,
    totalObligations,
    totalDebt,
    remainingObligations,
    plannedSavings,
    daysLeft,
    dailyBudget,
    adjustedDailyBudget,
    effectiveDailyBudget,
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
    upcomingPlannedIncome,
    upcomingPlannedExpenses,
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
    markObligationPayment,
    toggleObligationPaid,
    deleteObligation,
    addAsset,
    updateAsset,
    deleteAsset,
    totalAssetsValue,
    addPlannedExpense,
    updatePlannedExpense,
    deletePlannedExpense,
    togglePlanPaidInMonth,
    setSavingsGoal,
    updateBudgetPeriod,
    updateSettings,
    addExpense,
    addIncome,
    deleteExpense,
    updateExpense,
  };
}
