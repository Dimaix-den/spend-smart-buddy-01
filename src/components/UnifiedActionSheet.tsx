import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { Account, Obligation, ExpenseType, Expense } from "@/hooks/useFinance";
import { formatAmount } from "@/lib/formatAmount";

type ActionTab = "expense" | "income" | "transfer";

interface UnifiedActionSheetProps {
  open: boolean;
  onClose: () => void;
  onSaveExpense: (
    amount: number,
    account: string,
    type: ExpenseType,
    opts?: { obligationId?: string; toAccount?: string; note?: string }
  ) => void;
  onSaveIncome: (amount: number, account: string, note?: string) => void;
  accounts: Account[];
  obligations: Obligation[];
  editingExpense?: Expense | null;
  onUpdateExpense?: (id: string, amount: number, account: string, note: string) => void;
}

export default function UnifiedActionSheet({
  open,
  onClose,
  onSaveExpense,
  onSaveIncome,
  accounts,
  obligations,
  editingExpense,
  onUpdateExpense,
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

  const [isClosing, setIsClosing] = useState(false); // флаг анимации закрытия

  const inputRef = useRef<HTMLInputElement>(null);

  const activeAccounts = accounts.filter((a) => a.type === "active");
  const allAccounts = accounts;
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

  useEffect(() => {
    if (open) {
      setIsClosing(false);
      if (editingExpense) {
        setTab(initialTab);
        setAmount(editingExpense.amount.toString());
        setSelectedAccount(editingExpense.account);
        setNote(editingExpense.note || "");
      } else {
        setTab("expense");
        setAmount("");
        setNote("");
        setExpenseType("regular");
        setSelectedObligId("");
        setToAccount("");
        if (activeAccounts.length > 0) setSelectedAccount(activeAccounts[0].name);
      }
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open, editingExpense, initialTab, activeAccounts]);

  if (!open) return null;

  const handleSave = () => {
    const num = parseFloat(amount.replace(/[^\d.]/g, ""));
    if (!num || !selectedAccount) return;

    if (isEditing && onUpdateExpense) {
      onUpdateExpense(editingExpense!.id, num, selectedAccount, note);
    } else if (tab === "income") {
      onSaveIncome(num, selectedAccount, note || undefined);
    } else if (tab === "transfer") {
      if (!toAccount) return;
      const targetAcc = accounts.find((a) => a.name === toAccount);
      const type: ExpenseType = targetAcc?.type === "savings" ? "savings" : "transfer";
      onSaveExpense(num, selectedAccount, type, { toAccount, note });
    } else {
      const opts: { obligationId?: string; note?: string } = { note };
      const type: ExpenseType = expenseType === "obligation" ? "obligation" : "regular";
      if (type === "obligation" && selectedObligId) opts.obligationId = selectedObligId;
      onSaveExpense(num, selectedAccount, type, opts);
    }

    triggerClose();
  };

  const triggerClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 250); // 0.25s — как в CSS-анимации
  };

  const tabs: { id: ActionTab; label: string }[] = [
    { id: "expense", label: "Расход" },
    { id: "income", label: "Доход" },
    { id: "transfer", label: "Перевод" },
  ];

  const tabColors: Record<ActionTab, { accent: string; bg: string; text: string }> = {
    expense: { accent: "hsl(0 76% 61%)", bg: "rgba(255, 69, 58, 0.1)", text: "hsl(0 76% 61%)" },
    income: { accent: "hsl(162 100% 33%)", bg: "rgba(0, 166, 118, 0.1)", text: "hsl(162 100% 33%)" },
    transfer: { accent: "hsl(211 100% 50%)", bg: "rgba(10, 132, 255, 0.1)", text: "hsl(211 100% 50%)" },
  };

  const accentColor = tabColors[tab].accent;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 glass-overlay" onClick={triggerClose} />
      <div
        className={`relative w-full max-w-app glass-sheet rounded-t-[20px] pb-8 max-h-[90vh] overflow-y-auto modal-slide-up ${
          isClosing ? "modal-slide-down" : ""
        }`}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: "hsl(0 0% 30%)" }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-3">
          <h2 className="text-lg font-bold text-foreground">
            {isEditing ? "Редактировать" : "Новая операция"}
          </h2>
          <button
            onClick={triggerClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors"
            style={{ background: "hsl(0 0% 23%)" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Segmented control */}
        {!isEditing && (
          <div className="px-5 mb-4">
            <div className="flex p-1 rounded-[12px]" style={{ background: "hsl(0 0% 18%)" }}>
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
        )}

        <div className="px-5 space-y-4" style={{ minHeight: 420 }}>
          {/* Amount */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Сумма
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="number"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full glass-input px-4 py-3.5 text-3xl font-bold tabular-nums placeholder:text-muted-foreground/40 focus:outline-none"
                style={amount ? { boxShadow: `0 0 0 2px ${accentColor}` } : {}}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted-foreground">
                ₸
              </span>
            </div>
          </div>

          {/* Account selector — "Откуда" */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {tab === "income" ? "На какой счёт" : "Откуда"}
            </label>
            <div className="space-y-2">
              {(tab === "income" ? allAccounts.filter((a) => a.type !== "inactive") : activeAccounts).map(
                (acc) => (
                  <button
                    key={acc.id}
                    onClick={() => setSelectedAccount(acc.name)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-[10px] transition-all duration-200"
                    style={{
                      background: selectedAccount === acc.name ? `${accentColor}22` : "hsl(0 0% 18%)",
                      boxShadow:
                        selectedAccount === acc.name ? `inset 0 0 0 1.5px ${accentColor}` : "none",
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                        style={{
                          borderColor: selectedAccount === acc.name ? accentColor : "hsl(0 0% 40%)",
                        }}
                      >
                        {selectedAccount === acc.name && (
                          <div className="w-2 h-2 rounded-full" style={{ background: accentColor }} />
                        )}
                      </div>
                      <span className="font-semibold text-foreground">{acc.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground font-tabular">
                      {formatAmount(acc.balance)} ₸
                    </span>
                  </button>
                )
              )}
            </div>
          </div>

          {/* Transfer target — "Куда" */}
          {tab === "transfer" && !isEditing && (
            <div className="space-y-1.5 animate-fade-in-up">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Куда
              </label>
              <div className="space-y-2">
                {allAccounts
                  .filter((a) => a.name !== selectedAccount)
                  .map((acc) => (
                    <button
                      key={acc.id}
                      onClick={() => setToAccount(acc.name)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-[10px] transition-all duration-200"
                      style={{
                        background:
                          toAccount === acc.name ? "hsl(162 100% 33% / 0.15)" : "hsl(0 0% 18%)",
                        boxShadow:
                          toAccount === acc.name
                            ? "inset 0 0 0 1.5px hsl(162 100% 33%)"
                            : "none",
                      }}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                          style={{
                            borderColor:
                              toAccount === acc.name ? "hsl(162 100% 33%)" : "hsl(0 0% 40%)",
                          }}
                        >
                          {toAccount === acc.name && (
                            <div className="w-2 h-2 rounded-full bg-safe-green" />
                          )}
                        </div>
                        <div>
                          <span className="font-semibold text-foreground">{acc.name}</span>
                          {acc.type === "savings" && (
                            <span className="text-xs text-safe-green ml-2">сбережения</span>
                          )}
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground font-tabular">
                        {formatAmount(acc.balance)} ₸
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Expense-specific: type selector */}
          {tab === "expense" && !isEditing && (
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
                        expenseType === opt.value ? "hsl(38 100% 52% / 0.15)" : "hsl(0 0% 18%)",
                      boxShadow:
                        expenseType === opt.value
                          ? "inset 0 0 0 1.5px hsl(38 100% 52%)"
                          : "none",
                      color:
                        expenseType === opt.value ? "hsl(38 100% 52%)" : "hsl(0 0% 60%)",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Obligation selector */}
          {tab === "expense" && expenseType === "obligation" && unpaidObligations.length > 0 && (
            <div className="flex flex-wrap gap-2 animate-fade-in-up">
              {unpaidObligations.map((o) => (
                <button
                  key={o.id}
                  onClick={() => setSelectedObligId(o.id)}
                  className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
                  style={{
                    background:
                      selectedObligId === o.id ? "hsl(38 100% 52%)" : "hsl(0 0% 18%)",
                    color: selectedObligId === o.id ? "black" : "hsl(0 0% 60%)",
                  }}
                >
                  {o.name} ({formatAmount(o.amount)} ₸)
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

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={!amount || !selectedAccount || (tab === "transfer" && !toAccount && !isEditing)}
            className="w-full py-4 rounded-[12px] font-bold text-base text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
            style={{ background: accentColor }}
          >
            {isEditing
              ? "Сохранить"
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
