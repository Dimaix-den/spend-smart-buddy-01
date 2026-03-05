import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { Account, Obligation, ExpenseType, Expense } from "@/hooks/useFinance";
import { formatAmount } from "@/lib/formatAmount";
import MoneyInput from "@/components/MoneyInput";

type ActionTab = "expense" | "income" | "transfer";

interface UnifiedActionSheetProps {
  open: boolean;
  onClose: () => void;
  onSaveExpense: (amount: number, account: string, type: ExpenseType, opts?: { obligationId?: string; toAccount?: string; note?: string; date?: string }) => void;
  onSaveIncome: (amount: number, account: string, note?: string, date?: string) => void;
  onDeleteExpense: (id: string) => void;
  accounts: Account[];
  obligations: Obligation[];
  editingExpense?: Expense | null;
}

function sortByUsage(accounts: Account[]): Account[] {
  return [...accounts].sort((a, b) => {
    const aCount = a.usageCount || 0;
    const bCount = b.usageCount || 0;
    if (bCount !== aCount) return bCount - aCount;
    return (b.lastUsed || "").localeCompare(a.lastUsed || "");
  });
}

export default function UnifiedActionSheet({
  open, onClose, onSaveExpense, onSaveIncome, onDeleteExpense,
  accounts, obligations, editingExpense,
}: UnifiedActionSheetProps) {
  const isEditing = !!editingExpense;
  const initialTab: ActionTab = editingExpense
    ? editingExpense.type === "income" ? "income"
    : editingExpense.type === "savings" || editingExpense.type === "transfer" ? "transfer"
    : "expense"
    : "expense";

  const [tab, setTab] = useState<ActionTab>(initialTab);
  const [amount, setAmount] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [note, setNote] = useState("");
  const [expenseType, setExpenseType] = useState<"regular" | "obligation">("regular");
  const [selectedObligId, setSelectedObligId] = useState("");
  const [toAccount, setToAccount] = useState("");
  const [operationDate, setOperationDate] = useState(new Date().toISOString().split("T")[0]);
  const inputRef = useRef<HTMLInputElement>(null);

  const nonSystemAccounts = accounts.filter((a) => !a.isSystem);
  const activeAccounts = sortByUsage(nonSystemAccounts.filter((a) => a.type === "active"));
  const transferableAccounts = sortByUsage(nonSystemAccounts.filter((a) => a.type === "active" || a.type === "savings"));
  const unpaidObligations = obligations.filter((o) => !o.paid);

  useEffect(() => {
    if (open) { document.body.classList.add("popup-open"); } else { document.body.classList.remove("popup-open"); }
    return () => document.body.classList.remove("popup-open");
  }, [open]);

  useEffect(() => {
    if (open) {
      if (editingExpense) {
        const exp = editingExpense;
        const t: ActionTab = exp.type === "income" ? "income" : exp.type === "savings" || exp.type === "transfer" ? "transfer" : "expense";
        setTab(t); setAmount(exp.amount.toString()); setSelectedAccount(exp.account); setNote(exp.note || "");
        setOperationDate(exp.date || new Date().toISOString().split("T")[0]);
        if (t === "expense") {
          if (exp.type === "obligation" && exp.obligationId) { setExpenseType("obligation"); setSelectedObligId(exp.obligationId); }
          else { setExpenseType("regular"); setSelectedObligId(""); }
        } else { setExpenseType("regular"); setSelectedObligId(""); }
        setToAccount(t === "transfer" ? (exp.toAccount || "") : "");
      } else {
        setTab("expense"); setAmount(""); setNote(""); setExpenseType("regular"); setSelectedObligId(""); setToAccount("");
        if (activeAccounts.length > 0) setSelectedAccount(activeAccounts[0].name);
        setOperationDate(new Date().toISOString().split("T")[0]);
      }
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open, editingExpense]);

  if (!open) return null;

  const parseAmount = () => { const num = parseFloat(amount.replace(/[^\d.]/g, "")); return num && num > 0 ? num : 0; };

  const handleSave = () => {
    const num = parseAmount();
    if (!num || !selectedAccount) return;
    if (isEditing && editingExpense) onDeleteExpense(editingExpense.id);
    if (tab === "income") {
      onSaveIncome(num, selectedAccount, note || undefined, operationDate);
    } else if (tab === "transfer") {
      if (!toAccount) return;
      const targetAcc = accounts.find((a) => a.name === toAccount);
      const type: ExpenseType = targetAcc?.type === "savings" ? "savings" : "transfer";
      onSaveExpense(num, selectedAccount, type, { toAccount, note, date: operationDate });
    } else {
      const type: ExpenseType = expenseType === "obligation" ? "obligation" : "regular";
      const opts: { obligationId?: string; note?: string; date?: string } = { note, date: operationDate };
      if (type === "obligation" && selectedObligId) opts.obligationId = selectedObligId;
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
    expense: { accent: "hsl(0 76% 61%)", bg: "rgba(255, 69, 58, 0.08)", text: "hsl(0 76% 61%)" },
    income: { accent: "hsl(var(--primary))", bg: "hsl(var(--primary) / 0.08)", text: "hsl(var(--primary))" },
    transfer: { accent: "hsl(211 100% 50%)", bg: "rgba(10, 132, 255, 0.08)", text: "hsl(211 100% 50%)" },
  };

  const accentColor = tabColors[tab].accent;
  const sourceAccounts = tab === "transfer" ? sortByUsage(transferableAccounts) : activeAccounts;
  const targetAccounts = sortByUsage(transferableAccounts.filter((a) => a.name !== selectedAccount));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 glass-overlay" onClick={onClose} />
      <div className="relative w-full max-w-app glass-sheet rounded-t-[24px] modal-slide-up pb-8 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        <div className="flex items-center justify-between px-5 pt-2 pb-3">
          <h2 className="text-lg font-bold text-foreground">{isEditing ? "Редактирование" : "Новая операция"}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground bg-card">
            <X size={16} />
          </button>
        </div>

        {/* Segmented control */}
        <div className="px-5 mb-4">
          <div className="flex p-1 rounded-xl bg-card">
            {tabs.map((t) => {
              const isActive = tab === t.id;
              const colors = tabColors[t.id];
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${isActive ? "" : "text-muted-foreground"}`}
                  style={isActive ? { background: colors.bg, color: colors.text } : {}}>
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-5 space-y-4" style={{ minHeight: 420 }}>
          {/* Amount */}
          <div className="space-y-1.5">
            <label className="section-header">Сумма</label>
            <div className="relative">
              <MoneyInput ref={inputRef as any} value={amount} onChange={setAmount} placeholder="0"
                className="w-full glass-input px-4 py-3.5 text-3xl font-bold tabular-nums"
                style={amount ? { boxShadow: `0 0 0 2px ${accentColor}` } : {}} />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted-foreground">₸</span>
            </div>
          </div>

          {/* Account selector */}
          <div className="space-y-1.5">
            <label className="section-header">{tab === "income" ? "На какой счёт" : "Откуда"}</label>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {(tab === "income" ? sortByUsage(nonSystemAccounts.filter((a) => a.type !== "inactive")) : sourceAccounts).map((acc) => {
                const isActive = selectedAccount === acc.name;
                const isSavingsAcc = acc.type === "savings";
                return (
                  <button key={acc.id} onClick={() => setSelectedAccount(acc.name)}
                    className="flex-shrink-0 px-3 py-2 rounded-xl text-left transition-all duration-200 min-w-[140px]"
                    style={{
                      background: isActive ? `${accentColor}11` : "hsl(var(--card))",
                      boxShadow: isActive ? `inset 0 0 0 1.5px ${accentColor}` : "none",
                    }}>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">{isSavingsAcc ? "Сбережения" : "Счёт"}</span>
                      {isSavingsAcc && <span className="text-[9px] px-1 py-0.5 rounded font-semibold bg-primary/10 text-primary">SAVINGS</span>}
                    </div>
                    <div className="text-sm font-semibold text-foreground truncate">{acc.name}</div>
                    <div className="text-xs text-muted-foreground font-tabular">{formatAmount(acc.balance)} ₸</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Transfer target */}
          {tab === "transfer" && (
            <div className="space-y-1.5 animate-fade-in-up">
              <label className="section-header">Куда</label>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {targetAccounts.map((acc) => {
                  const isActive = toAccount === acc.name;
                  const isSavingsAcc = acc.type === "savings";
                  return (
                    <button key={acc.id} onClick={() => setToAccount(acc.name)}
                      className="flex-shrink-0 px-3 py-2 rounded-xl text-left transition-all duration-200 min-w-[140px]"
                      style={{
                        background: isActive ? "hsl(var(--primary) / 0.08)" : "hsl(var(--card))",
                        boxShadow: isActive ? "inset 0 0 0 1.5px hsl(var(--primary))" : "none",
                      }}>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">{isSavingsAcc ? "Сбережения" : "Счёт"}</span>
                        {isSavingsAcc && <span className="text-[9px] px-1 py-0.5 rounded font-semibold bg-primary/10 text-primary">SAVINGS</span>}
                      </div>
                      <div className="text-sm font-semibold text-foreground truncate">{acc.name}</div>
                      <div className="text-xs text-muted-foreground font-tabular">{formatAmount(acc.balance)} ₸</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Expense type */}
          {tab === "expense" && (
            <div className="space-y-1.5">
              <label className="section-header">Тип</label>
              <div className="flex gap-2">
                {[{ value: "regular" as const, label: "Обычный" }, { value: "obligation" as const, label: "Обязательный" }].map((opt) => (
                  <button key={opt.value} onClick={() => setExpenseType(opt.value)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      expenseType === opt.value ? "bg-alert-orange/10 text-alert-orange ring-1 ring-alert-orange" : "bg-card text-muted-foreground"
                    }`}>
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
                <button key={o.id} onClick={() => setSelectedObligId(o.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedObligId === o.id ? "bg-alert-orange text-white" : "bg-card text-muted-foreground"
                  }`}>
                  {o.name} ({formatAmount(o.monthlyPayment)} ₸)
                </button>
              ))}
            </div>
          )}

          {/* Note */}
          <div className="space-y-1.5">
            <label className="section-header">Примечание</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
              placeholder={tab === "income" ? "Зарплата / Бонус" : tab === "transfer" ? "Заметка" : "На что потрачено"}
              className="w-full glass-input px-4 py-3 text-sm" />
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label className="section-header">Дата операции</label>
            <input type="date" value={operationDate} onChange={(e) => setOperationDate(e.target.value)}
              className="glass-input px-4 py-3 text-sm flex-1 w-full" />
          </div>

          {/* Save */}
          <button onClick={handleSave}
            disabled={!amount || !selectedAccount || (tab === "transfer" && !toAccount)}
            className="w-full py-4 rounded-xl font-bold text-base text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
            style={{ background: accentColor }}>
            {isEditing ? "Сохранить изменения" : tab === "income" ? "Добавить доход" : tab === "transfer" ? "Перевести" : "Добавить расход"}
          </button>
        </div>
      </div>
    </div>
  );
}