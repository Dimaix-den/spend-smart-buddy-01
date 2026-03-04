import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { Account, Obligation, ExpenseType, Expense } from "@/hooks/useFinance";
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
    opts?: { obligationId?: string; toAccount?: string; note?: string; date?: string }
  ) => void;
  onSaveIncome: (amount: number, account: string, note?: string, date?: string) => void;
  onDeleteExpense: (id: string) => void;
  accounts: Account[];
  obligations: Obligation[];
  editingExpense?: Expense | null;
}

// Sort accounts by usage frequency
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
  const [expenseType, setExpenseType] = useState<"regular" | "obligation">("regular");
  const [selectedObligId, setSelectedObligId] = useState("");
  const [toAccount, setToAccount] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Дата операции (YYYY-MM-DD)
  const [operationDate, setOperationDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  // Filter out system accounts, include both active and savings for transfers
  const nonSystemAccounts = accounts.filter((a) => !a.isSystem);
  const activeAccounts = sortByUsage(nonSystemAccounts.filter((a) => a.type === "active"));
  const transferableAccounts = sortByUsage(nonSystemAccounts.filter((a) => a.type === "active" || a.type === "savings"));
  const unpaidObligations = obligations.filter((o) => !o.paid);

  // Scroll lock
  useEffect(() => {
    if (open) {
      document.body.classList.add("popup-open");
    } else {
      document.body.classList.remove("popup-open");
    }
    return () => document.body.classList.remove("popup-open");
  }, [open]);

  // Заполнение формы при открытии / редактировании
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
        setAmount(exp.amount.toString());
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
      } else {
        setTab("expense");
        setAmount("");
        setNote("");
        setExpenseType("regular");
        setSelectedObligId("");
        setToAccount("");
        if (activeAccounts.length > 0) setSelectedAccount(activeAccounts[0].name);
        setOperationDate(new Date().toISOString().split("T")[0]);
      }

      setTimeout(() => inputRef.current?.focus(), 200);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingExpense]);

  if (!open) return null;

  const parseAmount = () => {
    const num = parseFloat(amount.replace(/[^\d.]/g, ""));
    return num && num > 0 ? num : 0;
  };

  const handleSave = () => {
    const num = parseAmount();
    if (!num || !selectedAccount) return;

    if (isEditing && editingExpense) {
      onDeleteExpense(editingExpense.id);
    }

    if (tab === "income") {
      onSaveIncome(num, selectedAccount, note || undefined, operationDate);
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
      const type: ExpenseType =
        expenseType === "obligation" ? "obligation" : "regular";
      const opts: { obligationId?: string; note?: string; date?: string } = {
        note,
        date: operationDate,
      };
      if (type === "obligation" && selectedObligId) {
        opts.obligationId = selectedObligId;
      }
      onSaveExpense(num, selectedAccount, type, opts);
    }

    onClose();
  };

  const tabs: { id: ActionTab; label: string }[] = [
    { id: "expense", label: "Расход" },
    { id: "income", label: "Доход" },
    { id: "transfer", label: "Перевод" },
  ];

  const tabColors: Record<ActionTab, { accent: string; bg: string; text: string }> = {
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

  // Choose which accounts to show based on tab
  const sourceAccounts = tab === "transfer" ? sortByUsage(transferableAccounts) : activeAccounts;
  const targetAccounts = sortByUsage(
    transferableAccounts.filter((a) => a.name !== selectedAccount)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 glass-overlay" onClick={onClose} />
      <div className="relative w-full max-w-app glass-sheet rounded-t-[20px] modal-slide-up pb-8 max-h-[90vh] overflow-y-auto">
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

        {/* Segmented control */}
        <div className="px-5 mb-4">
          <div
            className="flex p-1 rounded-[12px]"
            style={{ background: "hsl(0 0% 18%)" }}
          >
            {tabs.map((t) => {
              const isActive = tab === t.id;
              const colors = tabColors[t.id];
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 py-2 rounded-[10px] text-sm font-semibold transition-all duration-300 ${
                    isActive ? "" : "text-muted-foreground hover:text-foreground"
                  }`}
                  style={isActive ? { background: colors.bg, color: colors.text } : {}}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-5 space-y-4" style={{ minHeight: 420 }}>
          {/* Amount */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Сумма
            </label>
            <div className="relative">
              <MoneyInput
                ref={inputRef as any}
                value={amount}
                onChange={setAmount}
                placeholder="0"
                className="w-full glass-input px-4 py-3.5 text-3xl font-bold tabular-nums placeholder:text-muted-foreground/40 focus:outline-none"
                style={amount ? { boxShadow: `0 0 0 2px ${accentColor}` } : {}}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted-foreground">
                ₸
              </span>
            </div>
          </div>

          {/* Account selector — "Откуда" / "На какой счёт" */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {tab === "income" ? "На какой счёт" : "Откуда"}
            </label>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {(tab === "income"
                ? sortByUsage(nonSystemAccounts.filter((a) => a.type !== "inactive"))
                : sourceAccounts
              ).map((acc) => {
                const isActive = selectedAccount === acc.name;
                const isSavingsAcc = acc.type === "savings";
                return (
                  <button
                    key={acc.id}
                    onClick={() => setSelectedAccount(acc.name)}
                    className="flex-shrink-0 px-3 py-2 rounded-[10px] text-left transition-all duration-200 min-w-[140px]"
                    style={{
                      background: isActive ? `${accentColor}22` : "hsl(0 0% 18%)",
                      boxShadow: isActive
                        ? `inset 0 0 0 1.5px ${accentColor}`
                        : "none",
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">
                        {isSavingsAcc ? "Сбережения" : "Счёт"}
                      </span>
                      {isSavingsAcc && (
                        <span className="text-[9px] px-1 py-0.5 rounded font-semibold" style={{ background: "hsl(162 100% 33% / 0.15)", color: "hsl(162 100% 33%)" }}>
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

          {/* Transfer target — "Куда" */}
          {tab === "transfer" && (
            <div className="space-y-1.5 animate-fade-in-up">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Куда
              </label>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {targetAccounts.map((acc) => {
                  const isActive = toAccount === acc.name;
                  const isSavingsAcc = acc.type === "savings";
                  return (
                    <button
                      key={acc.id}
                      onClick={() => setToAccount(acc.name)}
                      className="flex-shrink-0 px-3 py-2 rounded-[10px] text-left transition-all duration-200 min-w-[140px]"
                      style={{
                        background: isActive
                          ? "hsl(162 100% 33% / 0.15)"
                          : "hsl(0 0% 18%)",
                        boxShadow: isActive
                          ? "inset 0 0 0 1.5px hsl(162 100% 33%)"
                          : "none",
                      }}
                    >
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">
                          {isSavingsAcc ? "Сбережения" : "Счёт"}
                        </span>
                        {isSavingsAcc && (
                          <span className="text-[9px] px-1 py-0.5 rounded font-semibold" style={{ background: "hsl(162 100% 33% / 0.15)", color: "hsl(162 100% 33%)" }}>
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
          )}

          {/* Expense-specific: type selector */}
          {tab === "expense" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Тип
              </label>
              <div className="flex gap-2">
                {[
                  { value: "regular" as const, label: "Обычный" },
                  { value: "obligation" as const, label: "Обязательный" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setExpenseType(opt.value)}
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
              </div>
            </div>
          )}

          {/* Obligation selector */}
          {tab === "expense" &&
            expenseType === "obligation" &&
            unpaidObligations.length > 0 && (
              <div className="flex flex-wrap gap-2 animate-fade-in-up">
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

          {/* Note */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Примечание
            </label>
            <input
              type="text"
              value={note}
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

          {/* Дата операции */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Дата операции
            </label>
            <div className="flex">
              <input
                type="date"
                value={operationDate}
                onChange={(e) => setOperationDate(e.target.value)}
                className="glass-input px-4 py-3 text-sm placeholder:text-muted-foreground/40 focus:outline-none flex-1"
              />
            </div>
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={
              !amount ||
              !selectedAccount ||
              (tab === "transfer" && !toAccount)
            }
            className="w-full py-4 rounded-[12px] font-bold text-base text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
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
