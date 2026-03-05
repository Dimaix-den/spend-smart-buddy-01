import { useState } from "react";
import { Plus, ChevronDown, ChevronUp, ChevronRight } from "lucide-react";
import { useFinance } from "@/hooks/useFinance";
import { formatAmount } from "@/lib/formatAmount";
import { toast } from "@/hooks/use-toast";
import MoneyInput from "@/components/MoneyInput";

interface CapitalProps {
  finance: ReturnType<typeof useFinance>;
  onOpenAccount: (id: string) => void;
  onOpenObligation: (id: string) => void;
}

export default function Capital({ finance, onOpenAccount, onOpenObligation }: CapitalProps) {
  const {
    state,
    activeAccounts,
    savingsAccounts,
    inactiveAccounts,
    totalDebt,
    getSavingsForAccount,
    addAccount,
    addObligation,
  } = finance;

  const [showInactive, setShowInactive] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAddSavings, setShowAddSavings] = useState(false);
  const [showAddOblig, setShowAddOblig] = useState(false);

  const [newAccName, setNewAccName] = useState("");
  const [newAccBalance, setNewAccBalance] = useState("");
  const [newSavName, setNewSavName] = useState("");
  const [newSavBalance, setNewSavBalance] = useState("");
  const [newSavGoal, setNewSavGoal] = useState("");
  const [newObligName, setNewObligName] = useState("");
  const [newObligTotal, setNewObligTotal] = useState("");
  const [newObligMonthly, setNewObligMonthly] = useState("");

  const totalAssets = state.accounts
    .filter(a => (a.type === "active" || a.type === "savings") && !a.isSystem)
    .reduce((s, a) => s + a.balance, 0);
  const netWorth = totalAssets - totalDebt;

  const handleAddAccount = () => {
    if (!newAccName.trim()) return;
    addAccount(newAccName.trim(), parseFloat(newAccBalance) || 0, "active");
    setNewAccName(""); setNewAccBalance(""); setShowAddAccount(false);
    toast({ description: "✅ Счёт добавлен", duration: 2000 });
  };

  const handleAddSavings = () => {
    if (!newSavName.trim()) return;
    addAccount(newSavName.trim(), parseFloat(newSavBalance) || 0, "savings", parseFloat(newSavGoal) || 0);
    setNewSavName(""); setNewSavBalance(""); setNewSavGoal(""); setShowAddSavings(false);
    toast({ description: "✅ Сбережение добавлено", duration: 2000 });
  };

  const handleAddObligation = () => {
    if (!newObligName.trim()) return;
    const total = parseFloat(newObligTotal) || 0;
    const monthly = parseFloat(newObligMonthly) || 0;
    if (!monthly) return;
    addObligation(newObligName.trim(), total || monthly, monthly);
    setNewObligName(""); setNewObligTotal(""); setNewObligMonthly(""); setShowAddOblig(false);
    toast({ description: "✅ Обязательство добавлено", duration: 2000 });
  };

  const autoMonths = (() => {
    const total = parseFloat(newObligTotal) || 0;
    const monthly = parseFloat(newObligMonthly) || 0;
    if (total > 0 && monthly > 0 && total > monthly) return Math.ceil(total / monthly);
    return null;
  })();

  return (
    <div className="flex flex-col min-h-screen pb-28">
      {/* Header */}
      <div className="px-5 pt-10 pb-6">
        <h1 className="text-2xl font-bold text-foreground mb-4">Капитал</h1>

        {/* Summary Card */}
        <div className="bg-card rounded-2xl p-5 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Активы</span>
            <span className="font-bold font-tabular text-foreground">{formatAmount(totalAssets)} ₸</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Обязательства</span>
            <span className="font-bold font-tabular text-alert-orange">{formatAmount(totalDebt)} ₸</span>
          </div>
          <div className="border-t border-border pt-3 flex justify-between items-center">
            <span className="text-sm font-semibold text-foreground">Чистый капитал</span>
            <span className={`text-xl font-bold font-tabular ${netWorth >= 0 ? "text-primary" : "text-destructive"}`}>
              {netWorth < 0 ? "−" : ""}{formatAmount(Math.abs(netWorth))} ₸
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 px-5 space-y-6">
        {/* Active Accounts */}
        <div>
          <h2 className="section-header mb-3 px-1">💳 Активные счета</h2>
          <div className="space-y-2">
            {activeAccounts.map((acc) => (
              <button
                key={acc.id}
                onClick={() => onOpenAccount(acc.id)}
                className="w-full rounded-2xl p-4 flex items-center justify-between active:scale-[0.98] transition-transform bg-card"
                style={{ borderLeft: "3px solid hsl(var(--primary))" }}
              >
                <div className="text-left">
                  <p className="font-semibold text-foreground text-sm">{acc.name}</p>
                  <p className={`text-xl font-bold font-tabular mt-0.5 ${acc.balance < 0 ? "text-destructive" : "text-foreground"}`}>
                    {acc.balance < 0 ? "−" : ""}{formatAmount(Math.abs(acc.balance))} ₸
                  </p>
                </div>
                <ChevronRight size={18} className="text-muted-foreground" />
              </button>
            ))}
          </div>
          {showAddAccount ? (
            <div className="bg-background rounded-2xl p-4 mt-2 space-y-3 animate-fade-in-up shadow-sm border border-border">
              <input autoFocus placeholder="Название" value={newAccName} onChange={(e) => setNewAccName(e.target.value)} className="w-full glass-input px-3 py-2.5 text-sm" />
              <div className="relative">
                <MoneyInput placeholder="0" value={newAccBalance} onChange={setNewAccBalance} className="w-full glass-input px-3 py-2.5 text-sm pr-8" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">₸</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAddAccount(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-foreground bg-card">Отмена</button>
                <button onClick={handleAddAccount} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-primary">Добавить</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAddAccount(true)} className="w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-primary py-3 rounded-xl text-sm font-semibold transition-colors mt-2 bg-card">
              <Plus size={16} /> Добавить счёт
            </button>
          )}
        </div>

        {/* Inactive */}
        {inactiveAccounts.length > 0 && (
          <div className="-mt-2">
            <button onClick={() => setShowInactive(!showInactive)} className="flex items-center gap-2 section-header mb-2 px-1">
              Неактивные ({inactiveAccounts.length})
              {showInactive ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showInactive && (
              <div className="space-y-2 animate-fade-in-up">
                {inactiveAccounts.map((acc) => (
                  <button key={acc.id} onClick={() => onOpenAccount(acc.id)}
                    className="w-full rounded-2xl p-4 flex items-center justify-between opacity-60 active:scale-[0.98] transition-transform bg-card"
                    style={{ borderLeft: "3px solid hsl(var(--border))" }}>
                    <div className="text-left">
                      <p className="font-semibold text-foreground text-sm">{acc.name}</p>
                      <p className="text-lg font-bold font-tabular text-foreground">{formatAmount(acc.balance)} ₸</p>
                    </div>
                    <ChevronRight size={18} className="text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Savings */}
        <div>
          <h2 className="section-header mb-3 px-1">💎 Сбережения</h2>
          <div className="space-y-2">
            {savingsAccounts.map((acc) => {
              const saved = getSavingsForAccount(acc.name);
              const goal = acc.monthlyGoal || 0;
              const pct = goal > 0 ? Math.min(100, Math.round((saved / goal) * 100)) : 0;
              return (
                <button key={acc.id} onClick={() => onOpenAccount(acc.id)}
                  className="w-full rounded-2xl p-4 text-left active:scale-[0.98] transition-transform bg-card"
                  style={{ borderLeft: "3px solid hsl(var(--primary))" }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-foreground text-sm">{acc.name}</p>
                    <p className="text-lg font-bold font-tabular text-foreground">{formatAmount(acc.balance)} ₸</p>
                  </div>
                  {goal > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Цель: {formatAmount(goal)} ₸/мес</span>
                        <span className="text-primary font-semibold">{pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden bg-border">
                        <div className="h-full rounded-full transition-all duration-500 bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-muted-foreground">Отложено: <span className="text-primary font-semibold">{formatAmount(saved)} ₸</span></p>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          {showAddSavings ? (
            <div className="bg-background rounded-2xl p-4 mt-2 space-y-3 animate-fade-in-up shadow-sm border border-border">
              <input autoFocus placeholder="Название" value={newSavName} onChange={(e) => setNewSavName(e.target.value)} className="w-full glass-input px-3 py-2.5 text-sm" />
              <div className="relative">
                <MoneyInput placeholder="Текущий баланс" value={newSavBalance} onChange={setNewSavBalance} className="w-full glass-input px-3 py-2.5 text-sm pr-8" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">₸</span>
              </div>
              <div className="relative">
                <MoneyInput placeholder="Цель в месяц" value={newSavGoal} onChange={setNewSavGoal} className="w-full glass-input px-3 py-2.5 text-sm pr-12" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₸/мес</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAddSavings(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-foreground bg-card">Отмена</button>
                <button onClick={handleAddSavings} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-primary">Добавить</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAddSavings(true)} className="w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-primary py-3 rounded-xl text-sm font-semibold transition-colors mt-2 bg-card">
              <Plus size={16} /> Добавить сбережение
            </button>
          )}
        </div>

        {/* Obligations */}
        <div>
          <h2 className="section-header mb-3 px-1">⚠️ Обязательства</h2>
          <div className="space-y-2">
            {state.obligations.map((o) => {
              const isInstallment = o.totalAmount > o.monthlyPayment;
              const totalMonths = isInstallment ? Math.ceil(o.totalAmount / o.monthlyPayment) : 1;
              const pct = isInstallment ? Math.min(100, Math.round((o.paidMonths / totalMonths) * 100)) : 0;
              const remainingAmount = Math.max(0, o.totalAmount - o.monthlyPayment * o.paidMonths);

              return (
                <button
                  key={o.id}
                  onClick={() => onOpenObligation(o.id)}
                  className="w-full rounded-2xl p-4 text-left active:scale-[0.98] transition-transform bg-card"
                  style={{ borderLeft: "3px solid hsl(var(--warning))" }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${o.paid ? "text-muted-foreground" : "text-foreground"}`}>
                        {o.name}
                      </span>
                      {o.paid && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-primary/10 text-primary">
                          Оплачено
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold font-tabular text-foreground">{formatAmount(o.totalAmount)} ₸</span>
                      <ChevronRight size={16} className="text-muted-foreground" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatAmount(o.monthlyPayment)} ₸ в месяц
                  </p>

                  {isInstallment && (
                    <div className="mt-2 space-y-1">
                      <div className="h-1.5 rounded-full overflow-hidden bg-border">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: "hsl(var(--warning))" }} />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Осталось: {formatAmount(remainingAmount)} ₸</span>
                        <span>{pct}%</span>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {showAddOblig ? (
            <div className="bg-background rounded-2xl p-4 mt-2 space-y-3 animate-fade-in-up shadow-sm border border-border">
              <input autoFocus placeholder="Название" value={newObligName} onChange={(e) => setNewObligName(e.target.value)}
                className="w-full glass-input px-3 py-2.5 text-sm" />
              <div className="relative">
                <MoneyInput placeholder="Общая сумма" value={newObligTotal} onChange={setNewObligTotal}
                  className="w-full glass-input px-3 py-2.5 text-sm pr-8" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">₸</span>
              </div>
              <div className="relative">
                <MoneyInput placeholder="Месячный платёж" value={newObligMonthly} onChange={setNewObligMonthly}
                  onKeyDown={(e) => e.key === "Enter" && handleAddObligation()}
                  className="w-full glass-input px-3 py-2.5 text-sm pr-8" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">₸</span>
              </div>
              {autoMonths && (
                <p className="text-xs text-muted-foreground px-1">
                  Авто: {autoMonths} месяцев
                </p>
              )}
              <div className="flex gap-2">
                <button onClick={() => setShowAddOblig(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-foreground bg-card">Отмена</button>
                <button onClick={handleAddObligation} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-primary">Добавить</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAddOblig(true)} className="w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-primary py-3 rounded-xl text-sm font-semibold transition-colors mt-2 bg-card">
              <Plus size={16} /> Добавить обязательство
            </button>
          )}
        </div>
      </div>
    </div>
  );
}