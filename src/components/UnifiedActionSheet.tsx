import { useState, useRef, useEffect, useMemo } from "react";
import { X } from "lucide-react";
import {
  Account,
  Obligation,
  ExpenseType,
  Expense,
  PlannedExpense,
  getPlansForMonth,
  isPlanPaidInMonth,
} from "@/hooks/useFinance";
import { formatAmount } from "@/lib/formatAmount";
import MoneyInput from "@/components/MoneyInput";

type ActionTab = "expense" | "income" | "transfer";

interface UnifiedActionSheetProps {
  open: boolean;
  onClose: () => void;
  onSaveExpense: (
    amount: number,
    account: string,
    type: ExpenseType,
    opts?: {
      obligationId?: string;
      toAccount?: string;
      note?: string;
      date?: string;
      plannedExpenseId?: string;
    }
  ) => void;
  onSaveIncome: (
    amount: number,
    account: string,
    note?: string,
    date?: string,
    plannedExpenseId?: string
  ) => void;
  onDeleteExpense: (id: string) => void;
  accounts: Account[];
  obligations: Obligation[];
  editingExpense?: Expense | null;
  plannedExpenses?: PlannedExpense[];
  preselectedAccount?: string;
}

function sortByUsage(accounts: Account[]): Account[] {
  return [...accounts].sort((a, b) => {
    const aCount = a.usageCount || 0;
    const bCount = b.usageCount || 0;
    if (bCount !== aCount) return bCount - aCount;
    const aDate = a.lastUsed || "";
    const bDate = b.lastUsed || "";
    return bDate.localeCompare(aDate);
  });
}

export default function UnifiedActionSheet({
  open,
  onClose,
  onSaveExpense,
  onSaveIncome,
  onDeleteExpense,
  accounts,
  obligations,
  editingExpense,
  plannedExpenses = [],
  preselectedAccount,
}: UnifiedActionSheetProps) {
  const isEditing = !!editingExpense;

  const initialTab: ActionTab = editingExpense
    ? editingExpense.type === "income"
      ? "income"
      : editingExpense.type === "savings" || editingExpense.type === "transfer"
      ? "transfer"
      : "expense"
    : "expense";

  const [tab, setTab] = useState<ActionTab>(initialTab);
  const [amount, setAmount] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [note, setNote] = useState("");
  const [expenseType, setExpenseType] = useState<
    "regular" | "obligation" | "planned"
  >("regular");
  const [selectedObligId, setSelectedObligId] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [toAccount, setToAccount] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const [operationDate, setOperationDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  const sheetRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const nonSystemAccounts = accounts.filter((a) => !a.isSystem);
  const activeAccounts = sortByUsage(
    nonSystemAccounts.filter((a) => a.type === "active")
  );
  const transferableAccounts = sortByUsage(
    nonSystemAccounts.filter((a) => a.type === "active" || a.type === "savings")
  );
  const unpaidObligations = obligations.filter((o) => !o.paid);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const currentMonthPlans = useMemo(() => {
    return getPlansForMonth(plannedExpenses, currentYear, currentMonth).filter(
      (p) => !isPlanPaidInMonth(p, currentYear, currentMonth)
    );
  }, [plannedExpenses, currentYear, currentMonth]);

  const expensePlans = currentMonthPlans.filter((p) => p.type === "expense");
  const incomePlans = currentMonthPlans.filter((p) => p.type === "income");

  // Лочим скролл страницы, пока открыт поп-ап
  useEffect(() => {
    if (!open) return;

    const scrollY = window.scrollY || window.pageYOffset;

    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  // автофокус + скролл к началу при открытии
  useEffect(() => {
    if (!open) return;

    const hardResetScroll = () => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = 0;
      }
    };

    const focusInput = () => {
      const el = inputRef.current as HTMLInputElement | null;
      if (!el) return;
      try {
        el.focus({ preventScroll: true } as any);
      } catch {
        el.focus();
      }
    };

    hardResetScroll();
    focusInput();

    const t1 = setTimeout(hardResetScroll, 50);
    const t2 = setTimeout(hardResetScroll, 150);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [open]);

  // инициализация стейта при открытии
  useEffect(() => {
    if (!open) return;

    const resetScroll = () => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = 0;
      }
    };

    resetScroll();
    const t1 = setTimeout(resetScroll, 0);
    const t2 = setTimeout(resetScroll, 50);
    const t3 = setTimeout(resetScroll, 100);

    if (editingExpense) {
      const exp = editingExpense;
      const t: ActionTab =
        exp.type === "income"
          ? "income"
          : exp.type === "savings" || exp.type === "transfer"
          ? "transfer"
          : "expense";

      setTab(t);
      setAmount(exp.amount > 0 ? exp.amount.toLocaleString("ru-RU") : "");
      setSelectedAccount(exp.account);
      setNote(exp.note || "");
      setOperationDate(exp.date || new Date().toISOString().split("T")[0]);

      if (t === "expense") {
        if (exp.type === "obligation" && exp.obligationId) {
          setExpenseType("obligation");
          setSelectedObligId(exp.obligationId);
        } else {
          setExpenseType("regular");
          setSelectedObligId("");
        }
      } else {
        setExpenseType("regular");
        setSelectedObligId("");
      }

      if (t === "transfer") {
        setToAccount(exp.toAccount || "");
      } else {
        setToAccount("");
      }
      setSelectedPlanId("");
    } else {
      setTab("expense");
      setAmount("");
      setNote("");
      setExpenseType("regular");
      setSelectedObligId("");
      setSelectedPlanId("");
      setToAccount("");

      if (preselectedAccount) {
        setSelectedAccount(preselectedAccount);
      } else if (activeAccounts.length > 0) {
        setSelectedAccount(activeAccounts[0].name);
      }

      setOperationDate(new Date().toISOString().split("T")[0]);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingExpense, preselectedAccount]);

  if (!open) return null;

  const parseAmount = () => {
    const cleaned = amount.replace(/[\s\u00A0\u202F]/g, "").replace(/[^\d]/g, "");
    const num = parseInt(cleaned, 10);
    return num && num > 0 ? num : 0;
  };

  const handleSave = () => {
    const num = parseAmount();
    if (!num || !selectedAccount) return;

    if (isEditing && editingExpense) {
      onDeleteExpense(editingExpense.id);
    }

    if (tab === "income") {
      const planId =
        expenseType === "planned" && selectedPlanId ? selectedPlanId : undefined;
      onSaveIncome(num, selectedAccount, note || undefined, operationDate, planId);
    } else if (tab === "transfer") {
      if (!toAccount) return;
      const targetAcc = accounts.find((a) => a.name === toAccount);
      const type: ExpenseType =
        targetAcc?.type === "savings" ? "savings" : "transfer";
      onSaveExpense(num, selectedAccount, type, {
        toAccount,
        note,
        date: operationDate,
      });
    } else {
      if (expenseType === "planned" && selectedPlanId) {
        onSaveExpense(num, selectedAccount, "regular", {
          note,
          date: operationDate,
          plannedExpenseId: selectedPlanId,
        });
      } else {
        const type: ExpenseType =
          expenseType === "obligation" ? "obligation" : "regular";
        const opts: {
          obligationId?: string;
          note?: string;
          date?: string;
        } = {
          note,
          date: operationDate,
        };
        if (type === "obligation" && selectedObligId) {
          opts.obligationId = selectedObligId;
        }
        onSaveExpense(num, selectedAccount, type, opts);
      }
    }

    onClose();
  };

  const handleSelectPlan = (planId: string) => {
    setSelectedPlanId(planId);
    const plan = currentMonthPlans.find((p) => p.id === planId);
    if (plan) {
      // Only pre-fill amount if empty or zero
      const currentAmount = parseInt(amount.replace(/[\s\u00A0\u202F\D]/g, ""), 10) || 0;
      if (currentAmount === 0) {
        setAmount(plan.amount.toString());
      }
      setNote(plan.name);
    }
  };

  const tabs: { id: ActionTab; label: string }[] = [
    { id: "expense", label: "Расход" },
    { id: "income", label: "Доход" },
    { id: "transfer", label: "Перевод" },
  ];

  const tabColors: Record<
    ActionTab,
    { accent: string; bg: string; text: string }
  > = {
    expense: {
      accent: "hsl(0 76% 61%)",
      bg: "rgba(255, 69, 58, 0.1)",
      text: "hsl(0 76% 61%)",
    },
    income: {
      accent: "hsl(162 100% 33%)",
      bg: "rgba(0, 166, 118, 0.1)",
      text: "hsl(162 100% 33%)",
    },
    transfer: {
      accent: "hsl(211 100% 50%)",
      bg: "rgba(10, 132, 255, 0.1)",
      text: "hsl(211 100% 50%)",
    },
  };

  const accentColor = tabColors[tab].accent;

  const sourceAccounts =
    tab === "transfer" ? sortByUsage(transferableAccounts) : activeAccounts;
  const targetAccounts = sortByUsage(
    transferableAccounts.filter((a) => a.name !== selectedAccount)
  );

  const relevantPlans = tab === "income" ? incomePlans : expensePlans;

  const handleFieldFocus = () => {
    setIsKeyboardOpen(true);
    setTimeout(() => {
      if (!scrollRef.current || !buttonRef.current) return;
      const scrollEl = scrollRef.current;
      const btnRect = buttonRef.current.getBoundingClientRect();
      const sheetRect = sheetRef.current?.getBoundingClientRect();
      if (!sheetRect) return;

      const bottomVisible = sheetRect.bottom;
      const spaceBelowButton = bottomVisible - btnRect.bottom;

      if (spaceBelowButton < 12) {
        scrollEl.scrollTop += 12 - spaceBelowButton;
      }
    }, 250);
  };

  const handleFieldBlur = () => {
    setTimeout(() => {
      if (
        document.activeElement &&
        (document.activeElement.tagName === "INPUT" ||
          (document.activeElement as HTMLElement).isContentEditable)
      ) {
        return;
      }
      setIsKeyboardOpen(false);
    }, 150);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <button
        className="absolute inset-0 glass-overlay"
        onClick={onClose}
        aria-label="Закрыть"
      />

      <div
          ref={sheetRef}
          className="relative mt-auto w-full glass-sheet rounded-none modal-slide-up flex flex-col max-w-app mx-auto"
          style={{
            maxHeight: "90dvh",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
      >
        {/* Handle + header */}
        <div className="pt-3 pb-3 px-5">
          <div className="flex justify-center pb-1">
            <div
              className="w-10 h-1 rounded-full"
              style={{ background: "hsl(0 0% 30%)" }}
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <h2 className="text-lg font-bold text-foreground">
              {isEditing ? "Редактирование" : "Новая операция"}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors"
              style={{ background: "hsl(0 0% 23%)" }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

          {/* Content + bottom button */}
          <div className="flex-1 flex flex-col pb-4 min-h-0">
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto space-y-4"
              style={{
                paddingBottom: isKeyboardOpen ? 24 : 0,
                overscrollBehavior: "contain",
                WebkitOverflowScrolling: "touch",
              }}
            >
            {/* Tabs */}
            <div className="mb-4 px-5">
              <div
                className="flex p-1 rounded-[12px]"
                style={{ background: "hsl(0 0% 18%)" }}
              >
                {tabs.map((t) => {
                  const isActiveTab = tab === t.id;
                  const colors = tabColors[t.id];
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        setTab(t.id);
                        setExpenseType("regular");
                        setSelectedPlanId("");
                      }}
                      className={`flex-1 py-2 rounded-[10px] text-sm font-semibold transition-all duration-300 ${
                        isActiveTab
                          ? ""
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      style={
                        isActiveTab
                          ? { background: colors.bg, color: colors.text }
                          : {}
                      }
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-1.5 px-5">
              <div className="relative">
                <MoneyInput
                  ref={inputRef as any}
                  value={amount}
                  onChange={setAmount}
                  autoFocus={false}
                  placeholder="0"
                  onFocus={handleFieldFocus}
                  onBlur={handleFieldBlur}
                  className="w-full glass-input px-4 py-3.5 text-3xl font-bold tabular-nums placeholder:text-muted-foreground/40 focus:outline-none"
                  style={
                    amount ? { boxShadow: `0 0 0 2px ${accentColor}` } : {}
                  }
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted-foreground">
                  ₸
                </span>
              </div>
            </div>

              {/* Transfer / Accounts */}
              {tab === "transfer" ? (
                <>
                  {/* строка label Откуда / Куда */}
                  <div className="flex items-center gap-3 px-5 mt-3 ">
                    <label className="flex-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Откуда
                    </label>
                    <label className="flex-1 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">
                      Куда
                    </label>
                  </div>

                  {/* две колонки + стрелка */}
                  <div className="px-5 mt-1">
                    <div className="relative">
                      <div className="flex gap-3">
                        {/* левая колонка (Откуда) */}
                        <div className="flex-1">
                          <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                            {sourceAccounts.map((acc) => {
                              const isActive = selectedAccount === acc.name;
                              const isSavings = acc.type === "savings";

                              return (
                                <button
                                  key={acc.id}
                                  type="button"
                                  onClick={() => setSelectedAccount(acc.name)}
                                  className="w-full px-3 py-2 rounded-[10px] text-left text-xs transition-all"
                                  style={{
                                    background: isActive
                                      ? `${accentColor}22`
                                      : "hsl(0 0% 18%)",
                                    boxShadow: isActive
                                      ? `inset 0 0 0 1.5px ${accentColor}`
                                      : "none",
                                  }}
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-medium text-foreground truncate">
                                      {acc.name}
                                    </span>
                                    {isSavings && (
                                      <span
                                        className="text-[12x] px-1 py-0.5 rounded font-semibold"
                                        style={{
                                          background: "hsl(162 100% 33% / 0.15)",
                                          color: "hsl(162 100% 33%)",
                                        }}
                                      >
                                        SAV
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[12px] text-muted-foreground font-tabular">
                                    {formatAmount(acc.balance)} ₸
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* стрелка между колонками */}
                        <div className="flex items-center justify-center px-1 text-muted-foreground text-lg">
                          →
                        </div>

                        {/* правая колонка (Куда) */}
                        <div className="flex-1">
                          <div className="max-h-36 overflow-y-auto space-y-1 pl-1">
                            {targetAccounts.map((acc) => {
                              const isActive = toAccount === acc.name;
                              const isSavings = acc.type === "savings";

                              return (
                                <button
                                  key={acc.id}
                                  type="button"
                                  onClick={() => setToAccount(acc.name)}
                                  className="w-full px-3 py-2 rounded-[10px] text-left text-xs transition-all"
                                  style={{
                                    background: isActive
                                      ? "hsl(162 100% 33% / 0.15)"
                                      : "hsl(0 0% 18%)",
                                    boxShadow: isActive
                                      ? "inset 0 0 0 1.5px hsl(162 100% 33%)"
                                      : "none",
                                  }}
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-medium text-foreground truncate">
                                      {acc.name}
                                    </span>
                                    {isSavings && (
                                      <span
                                        className="text-[9px] px-1 py-0.5 rounded font-semibold"
                                        style={{
                                          background: "hsl(162 100% 33% / 0.15)",
                                          color: "hsl(162 100% 33%)",
                                        }}
                                      >
                                        SAV
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground font-tabular">
                                    {formatAmount(acc.balance)} ₸
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
              <>
                {/* Account selector для расхода/дохода */}
                <div className="space-y-1.5 px-5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {tab === "income" ? "На какой счёт" : "Откуда"}
                  </label>
                </div>
                <div className="w-full overflow-x-auto scrollbar-hide pb-1">
                  <div className="flex gap-2 px-5">
                    {(tab === "income"
                      ? sortByUsage(
                          nonSystemAccounts.filter(
                            (a) => a.type !== "inactive"
                          )
                        )
                      : sourceAccounts
                    ).map((acc) => {
                      const isActiveAcc = selectedAccount === acc.name;
                      const isSavingsAcc = acc.type === "savings";
                      return (
                        <button
                          key={acc.id}
                          onClick={() => setSelectedAccount(acc.name)}
                          className="flex-shrink-0 px-3 py-2 rounded-[10px] text-left transition-all duration-200 min-w-[140px]"
                          style={{
                            background: isActiveAcc
                              ? `${accentColor}22`
                              : "hsl(0 0% 18%)",
                            boxShadow: isActiveAcc
                              ? `inset 0 0 0 1.5px ${accentColor}`
                              : "none",
                          }}
                        >
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">
                              {isSavingsAcc ? "Сбережения" : "Счёт"}
                            </span>
                            {isSavingsAcc && (
                              <span
                                className="text-[9px] px-1 py-0.5 rounded font-semibold"
                                style={{
                                  background: "hsl(162 100% 33% / 0.15)",
                                  color: "hsl(162 100% 33%)",
                                }}
                              >
                                SAVINGS
                              </span>
                            )}
                          </div>
                          <div className="text-sm font-semibold text-foreground truncate">
                            {acc.name}
                          </div>
                          <div className="text-xs text-muted-foreground font-tabular">
                            {formatAmount(acc.balance)} ₸
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Expense type */}
            {tab !== "transfer" && (
              <div className="space-y-1.5 px-5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Тип
                </label>
                <div className="flex gap-2">
                  {tab === "expense" ? (
                    <>
                      {[
                        { value: "regular" as const, label: "Обычный" },
                        {
                          value: "obligation" as const,
                          label: "Обязательный",
                        },
                        ...(expensePlans.length > 0
                          ? [{ value: "planned" as const, label: "По плану" }]
                          : []),
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setExpenseType(opt.value);
                            setSelectedPlanId("");
                            setSelectedObligId("");
                          }}
                          className="flex-1 py-2.5 rounded-[10px] text-sm font-semibold transition-all duration-200"
                          style={{
                            background:
                              expenseType === opt.value
                                ? "hsl(38 100% 52% / 0.15)"
                                : "hsl(0 0% 18%)",
                            boxShadow:
                              expenseType === opt.value
                                ? "inset 0 0 0 1.5px hsl(38 100% 52%)"
                                : "none",
                            color:
                              expenseType === opt.value
                                ? "hsl(38 100% 52%)"
                                : "hsl(0 0% 60%)",
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </>
                  ) : (
                    <>
                      {[
                        { value: "regular" as const, label: "Обычный" },
                        ...(incomePlans.length > 0
                          ? [{ value: "planned" as const, label: "По плану" }]
                          : []),
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setExpenseType(opt.value);
                            setSelectedPlanId("");
                          }}
                          className="flex-1 py-2.5 rounded-[10px] text-sm font-semibold transition-all duration-200"
                          style={{
                            background:
                              expenseType === opt.value
                                ? "hsl(162 100% 33% / 0.15)"
                                : "hsl(0 0% 18%)",
                            boxShadow:
                              expenseType === opt.value
                                ? "inset 0 0 0 1.5px hsl(162 100% 33%)"
                                : "none",
                            color:
                              expenseType === opt.value
                                ? "hsl(162 100% 33%)"
                                : "hsl(0 0% 60%)",
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}

          {/* Obligation selector (как radio + автоподстановка суммы) */}
          {tab === "expense" &&
            expenseType === "obligation" &&
            unpaidObligations.length > 0 && (
              <div className="space-y-2 animate-fade-in-up px-5">
                {unpaidObligations.map((o) => {
                  const isSelected = selectedObligId === o.id;
                  const activeColor = "hsl(38 100% 52%)"; // тот же, что для расходов

                  return (
                    <button
                      key={o.id}
                      onClick={() => {
                        setSelectedObligId(o.id);
                        // автоподстановка суммы в поле
                        setAmount(o.monthlyPayment.toString());
                        // при желании можно также подставлять имя в note:
                        // setNote(o.name);
                      }}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-[10px] text-left transition-all"
                      style={{
                        background: isSelected
                          ? `${activeColor}26`
                          : "hsl(0 0% 18%)",
                        boxShadow: isSelected
                          ? `inset 0 0 0 1.5px ${activeColor}`
                          : "none",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                          style={{
                            borderColor: isSelected
                              ? activeColor
                              : "hsl(0 0% 40%)",
                          }}
                        >
                          {isSelected && (
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ background: activeColor }}
                            />
                          )}
                        </div>
                        <span className="text-sm font-medium text-foreground">
                          {o.name}
                        </span>
                      </div>
                      <span className="text-sm font-bold font-tabular text-muted-foreground">
                        {formatAmount(o.monthlyPayment)} ₸
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Planned selector */}
            {expenseType === "planned" && relevantPlans.length > 0 && (
              <div className="space-y-2 animate-fade-in-up px-5">
                {relevantPlans.map((p) => {
                  const isSelected = selectedPlanId === p.id;
                  const activeColor =
                    tab === "income"
                      ? "hsl(162 100% 33%)"
                      : "hsl(38 100% 52%)";
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleSelectPlan(p.id)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-[10px] text-left transition-all"
                      style={{
                        background: isSelected
                          ? `${activeColor}26`
                          : "hsl(0 0% 18%)",
                        boxShadow: isSelected
                          ? `inset 0 0 0 1.5px ${activeColor}`
                          : "none",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                          style={{
                            borderColor: isSelected
                              ? activeColor
                              : "hsl(0 0% 40%)",
                          }}
                        >
                          {isSelected && (
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ background: activeColor }}
                            />
                          )}
                        </div>
                        <span className="text-sm font-medium text-foreground">
                          {p.name}
                        </span>
                      </div>
                      <span className="text-sm font-bold font-tabular text-muted-foreground">
                        {formatAmount(p.amount)} ₸
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Дата */}
            <div className="space-y-1.5 px-5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Дата операции
              </label>
              <div className="flex">
                <input
                  type="date"
                  value={operationDate}
                  onChange={(e) => setOperationDate(e.target.value)}
                  className="glass-input px-4 py-3 text-sm placeholder:text-muted-foreground/40 focus:outline-none flex-1 box-border"
                  style={{ maxWidth: "100%" }}
                />
              </div>
            </div>

            {/* Примечание */}
            <div className="space-y-1.5 px-5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Примечание
              </label>
              <input
                type="text"
                value={note}
                onFocus={handleFieldFocus}
                onBlur={handleFieldBlur}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  tab === "income"
                    ? "Зарплата / Бонус"
                    : tab === "transfer"
                    ? "Заметка"
                    : "На что потрачено"
                }
                className="w-full glass-input px-4 py-3 text-sm placeholder:text-muted-foreground/40 focus:outline-none"
              />
            </div>
          </div>

          {/* Кнопка снизу */}
          <button
            ref={buttonRef}
            onClick={handleSave}
            disabled={
              !amount || !selectedAccount || (tab === "transfer" && !toAccount)
            }
            className="mb-10 mt-4 mx-5 w-[calc(100%-40px)] py-4 rounded-[12px] font-bold text-base text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
            style={{ background: accentColor }}
          >
            {isEditing
              ? "Сохранить изменения"
              : tab === "income"
              ? "Добавить доход"
              : tab === "transfer"
              ? "Перевести"
              : "Добавить расход"}
          </button>
        </div>
      </div>
    </div>
  );
}
