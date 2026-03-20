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

  // клавиатура и ограничения скролла
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  // Filter out system accounts
  const nonSystemAccounts = accounts.filter((a) => !a.isSystem);
  const activeAccounts = sortByUsage(
    nonSystemAccounts.filter((a) => a.type === "active")
  );
  const transferableAccounts = sortByUsage(
    nonSystemAccounts.filter(
      (a) => a.type === "active" || a.type === "savings"
    )
  );
  const unpaidObligations = obligations.filter((o) => !o.paid);

  // планы
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

  // Scroll lock body
  useEffect(() => {
    if (open) {
      document.body.classList.add("popup-open");
    } else {
      document.body.classList.remove("popup-open");
    }
    return () => document.body.classList.remove("popup-open");
  }, [open]);

  // заполнение формы
  useEffect(() => {
    if (open) {
      if (editingExpense) {
        const exp = editingExpense;
        const t: ActionTab =
          exp.type === "income"
            ? "income"
            : exp.type === "savings" || exp.type === "transfer"
            ? "transfer"
            : "expense";

        setTab(t);
        setAmount(
          exp.amount > 0 ? exp.amount.toLocaleString("ru-RU") : ""
        );
        setSelectedAccount(exp.account);
        setNote(exp.note || "");
        setOperationDate(
          exp.date || new Date().toISOString().split("T")[0]
        );

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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingExpense, preselectedAccount]);

  if (!open) return null;

  const parseAmount = () => {
    const cleaned = amount
      .replace(/[\s\u00A0\u202F]/g, "")
      .replace(/[^\d]/g, "");
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
        expenseType === "planned" && selectedPlanId
          ? selectedPlanId
          : undefined;
      onSaveIncome(
        num,
        selectedAccount,
        note || undefined,
        operationDate,
        planId
      );
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
      setAmount(plan.amount.toString());
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

  // клавиатура: держим кнопку над ней и ограничиваем скролл
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
        className="relative mt-auto w-full h-full glass-sheet rounded-none modal-slide-up flex flex-col max-w-app mx-auto"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div
            className="w-10 h-1 rounded-full"
            style={{ background: "hsl(0 0% 30%)" }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-3">
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

        {/* Контент + кнопка */}
        <div className="flex-1 flex flex-col pb-4">
          {/* скроллимая часть */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto space-y-4"
            style={{
              paddingBottom: isKeyboardOpen ? 24 : 0,
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
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Сумма
              </label>
              <div className="relative">
                <MoneyInput
                  ref={inputRef as any}
                  value={amount}
                  onChange={setAmount}
                  autoFocus={true}
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

            {/* Account selector – подпись в рамке, список вне */}
            <div className="space-y-1.5 px-5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {tab === "income" ? "На какой счёт" : "Откуда"}
              </label>
            </div>
            <div className="w-full overflow-x-auto scrollbar-hide pb-1">
              <div className="flex gap-2 px-5">
                {(tab === "income"
                  ? sortByUsage(
                      nonSystemAccounts.filter((a) => a.type !== "inactive")
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

            {/* Transfer target – тоже «вне рамки» */}
            {tab === "transfer" && (
              <>
                <div className="space-y-1.5 px-5 animate-fade-in-up">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Куда
                  </label>
                </div>
                <div className="w-full overflow-x-auto scrollbar-hide pb-1">
                  <div className="flex gap-2 px-5">
                    {targetAccounts.map((acc) => {
                      const isActiveAcc = toAccount === acc.name;
                      const isSavingsAcc = acc.type === "savings";
                      return (
                        <button
                          key={acc.id}
                          onClick={() => setToAccount(acc.name)}
                          className="flex-shrink-0 px-3 py-2 rounded-[10px] text-left transition-all duration-200 min-w-[140px]"
                          style={{
                            background: isActiveAcc
                              ? "hsl(162 100% 33% / 0.15)"
                              : "hsl(0 0% 18%)",
                            boxShadow: isActiveAcc
                              ? "inset 0 0 0 1.5px hsl(162 100% 33%)"
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

            {/* Expense type selector */}
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
                          ? [
                              {
                                value: "planned" as const,
                                label: "По плану",
                              },
                            ]
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
                          ? [
                              {
                                value: "planned" as const,
                                label: "По плану",
                              },
                            ]
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

            {/* Obligation selector */}
            {tab === "expense" &&
              expenseType === "obligation" &&
              unpaidObligations.length > 0 && (
                <div className="flex flex-wrap gap-2 animate-fade-in-up px-5">
                  {unpaidObligations.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => setSelectedObligId(o.id)}
                      className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
                      style={{
                        background:
                          selectedObligId === o.id
                            ? "hsl(38 100% 52%)"
                            : "hsl(0 0% 18%)",
                        color:
                          selectedObligId === o.id
                            ? "black"
                            : "hsl(0 0% 60%)",
                      }}
                    >
                      {o.name} ({formatAmount(o.monthlyPayment)} ₸)
                    </button>
                  ))}
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

            {/* Note */}
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

            {/* Date */}
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
          </div>

          {/* Кнопка всегда над клавиатурой / внизу шита */}
          <button
            ref={buttonRef}
            onClick={handleSave}
            disabled={
              !amount || !selectedAccount || (tab === "transfer" && !toAccount)
            }
            className="mt-4 mx-5 w-[calc(100%-40px)] py-4 rounded-[12px] font-bold text-base text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
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
