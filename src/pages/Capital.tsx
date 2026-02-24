import { useState } from "react";
import { Plus, ChevronDown, ChevronUp, CheckCircle2, Circle, X, Pencil, Check } from "lucide-react";
import { useFinance, AccountType } from "@/hooks/useFinance";
import { formatAmount } from "@/lib/formatAmount";
import { toast } from "@/hooks/use-toast";

interface CapitalProps {
  finance: ReturnType<typeof useFinance>;
  onOpenAccount: (id: string) => void;
}

function ToggleSwitch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      className="relative flex-shrink-0"
      style={{ width: 51, height: 31, borderRadius: 31 }}
    >
      <div
        className="absolute inset-0 rounded-full transition-colors duration-300"
        style={{ background: on ? "hsl(162 100% 33%)" : "hsl(0 0% 23%)" }}
      />
      <div
        className="absolute rounded-full bg-white"
        style={{
          top: 2, left: 2, width: 27, height: 27,
          boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
          transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          transform: on ? "translateX(20px)" : "translateX(0px)",
        }}
      />
    </button>
  );
}

export default function Capital({ finance, onOpenAccount }: CapitalProps) {
  const {
    state,
    activeAccounts,
    savingsAccounts,
    inactiveAccounts,
    activeBalance,
    totalObligations,
    remainingObligations,
    getSavingsForAccount,
    toggleAccount,
    addAccount,
    addObligation,
    updateObligation,
    toggleObligationPaid,
    deleteObligation,
  } = finance;

  const [showInactive, setShowInactive] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAddSavings, setShowAddSavings] = useState(false);
  const [showAddOblig, setShowAddOblig] = useState(false);

  // Add account form
  const [newAccName, setNewAccName] = useState("");
  const [newAccBalance, setNewAccBalance] = useState("");

  // Add savings form
  const [newSavName, setNewSavName] = useState("");
  const [newSavBalance, setNewSavBalance] = useState("");
  const [newSavGoal, setNewSavGoal] = useState("");

  // Add obligation form
  const [newObligName, setNewObligName] = useState("");
  const [newObligAmount, setNewObligAmount] = useState("");

  // Editing obligation
  const [editingOblig, setEditingOblig] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState("");

  const totalAssets = state.accounts.reduce((s, a) => s + a.balance, 0);
  const netWorth = totalAssets - totalObligations;

  const handleAddAccount = () => {
    if (!newAccName.trim()) return;
    const bal = parseFloat(newAccBalance) || 0;
    addAccount(newAccName.trim(), bal, "active");
    setNewAccName(""); setNewAccBalance(""); setShowAddAccount(false);
    toast({ description: "✅ Счёт добавлен", duration: 2000 });
  };

  const handleAddSavings = () => {
    if (!newSavName.trim()) return;
    const bal = parseFloat(newSavBalance) || 0;
    const goal = parseFloat(newSavGoal) || 0;
    addAccount(newSavName.trim(), bal, "savings", goal);
    setNewSavName(""); setNewSavBalance(""); setNewSavGoal(""); setShowAddSavings(false);
    toast({ description: "✅ Сбережение добавлено", duration: 2000 });
  };

  const handleAddObligation = () => {
    if (!newObligName.trim() || !newObligAmount) return;
    const amount = parseFloat(newObligAmount) || 0;
    if (!amount) return;
    addObligation(newObligName.trim(), amount);
    setNewObligName(""); setNewObligAmount(""); setShowAddOblig(false);
    toast({ description: "✅ Обязательство добавлено", duration: 2000 });
  };

  return (
    <div className="flex flex-col min-h-screen pb-28">
      {/* Header */}
      <div className="px-5 pt-10 pb-6">
        <h1 className="text-2xl font-bold text-foreground mb-4">Капитал</h1>
        <div className="glass-card p-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Активы</span>
            <span className="font-bold font-tabular text-foreground">{formatAmount(totalAssets)} ₸</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Обязательства</span>
            <span className="font-bold font-tabular text-alert-orange">{formatAmount(totalObligations)} ₸</span>
          </div>
          <div className="border-t border-white/5 pt-2 flex justify-between items-center">
            <span className="text-sm font-medium text-foreground">Чистый капитал</span>
            <span className="text-xl font-bold font-tabular text-safe-green">{formatAmount(netWorth)} ₸</span>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 space-y-6">
        {/* ─── Active Accounts ──────────────────────────── */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
            Активные счета
          </h2>
          <div className="space-y-2">
            {activeAccounts.map((acc) => (
              <button
                key={acc.id}
                onClick={() => onOpenAccount(acc.id)}
                className="w-full glass-card p-4 flex items-center justify-between active:scale-[0.98] transition-transform"
              >
                <div className="text-left">
                  <p className="font-semibold text-foreground">{acc.name}</p>
                  <p className={`text-lg font-bold font-tabular ${acc.balance < 0 ? "text-destructive" : "text-safe-green"}`}>{acc.balance < 0 ? "−" : ""}{formatAmount(Math.abs(acc.balance))} ₸</p>
                </div>
                <ToggleSwitch on={acc.type === "active"} onToggle={() => toggleAccount(acc.id)} />
              </button>
            ))}
          </div>
          {showAddAccount ? (
            <div className="glass-card-raised p-4 mt-2 space-y-3 animate-fade-in-up">
              <input autoFocus placeholder="Название" value={newAccName} onChange={(e) => setNewAccName(e.target.value)} className="w-full glass-input px-3 py-2.5 text-sm focus:outline-none" />
              <div className="relative">
                <input type="number" placeholder="0" value={newAccBalance} onChange={(e) => setNewAccBalance(e.target.value)} className="w-full glass-input px-3 py-2.5 text-sm focus:outline-none pr-8" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">₸</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAddAccount(false)} className="flex-1 py-2.5 rounded-[10px] text-sm font-semibold text-foreground" style={{ background: "hsl(0 0% 23%)" }}>Отмена</button>
                <button onClick={handleAddAccount} className="flex-1 py-2.5 rounded-[10px] text-sm font-bold text-white" style={{ background: "hsl(162 100% 33%)" }}>Добавить</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAddAccount(true)} className="w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-safe-green py-3 rounded-[12px] text-sm font-semibold transition-colors mt-2" style={{ background: "hsl(0 0% 11%)" }}>
              <Plus size={16} /> Добавить счёт
            </button>
          )}
        </div>

        {/* ─── Savings ──────────────────────────── */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
            Сбережения
          </h2>
          <div className="space-y-2">
            {savingsAccounts.map((acc) => {
              const saved = getSavingsForAccount(acc.name);
              const goal = acc.monthlyGoal || 0;
              const pct = goal > 0 ? Math.min(100, Math.round((saved / goal) * 100)) : 0;
              return (
                <button
                  key={acc.id}
                  onClick={() => onOpenAccount(acc.id)}
                  className="w-full glass-card p-4 text-left active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-foreground">{acc.name}</p>
                    <p className="text-lg font-bold font-tabular text-foreground">{formatAmount(acc.balance)} ₸</p>
                  </div>
                  {goal > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Цель: {formatAmount(goal)} ₸/мес</span>
                        <span className="text-safe-green font-semibold">{pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(0 0% 23%)" }}>
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: "hsl(162 100% 33%)" }} />
                      </div>
                      <p className="text-xs text-muted-foreground">Отложено: <span className="text-safe-green font-semibold">{formatAmount(saved)} ₸</span></p>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          {showAddSavings ? (
            <div className="glass-card-raised p-4 mt-2 space-y-3 animate-fade-in-up">
              <input autoFocus placeholder="Название" value={newSavName} onChange={(e) => setNewSavName(e.target.value)} className="w-full glass-input px-3 py-2.5 text-sm focus:outline-none" />
              <div className="relative">
                <input type="number" placeholder="Текущий баланс" value={newSavBalance} onChange={(e) => setNewSavBalance(e.target.value)} className="w-full glass-input px-3 py-2.5 text-sm focus:outline-none pr-8" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">₸</span>
              </div>
              <div className="relative">
                <input type="number" placeholder="Цель в месяц" value={newSavGoal} onChange={(e) => setNewSavGoal(e.target.value)} className="w-full glass-input px-3 py-2.5 text-sm focus:outline-none pr-12" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₸/мес</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAddSavings(false)} className="flex-1 py-2.5 rounded-[10px] text-sm font-semibold text-foreground" style={{ background: "hsl(0 0% 23%)" }}>Отмена</button>
                <button onClick={handleAddSavings} className="flex-1 py-2.5 rounded-[10px] text-sm font-bold text-white" style={{ background: "hsl(162 100% 33%)" }}>Добавить</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAddSavings(true)} className="w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-safe-green py-3 rounded-[12px] text-sm font-semibold transition-colors mt-2" style={{ background: "hsl(0 0% 11%)" }}>
              <Plus size={16} /> Добавить сбережение
            </button>
          )}
        </div>

        {/* ─── Inactive (collapsible) ──────────────────── */}
        {inactiveAccounts.length > 0 && (
          <div>
            <button onClick={() => setShowInactive(!showInactive)} className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
              Неактивные ({inactiveAccounts.length})
              {showInactive ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showInactive && (
              <div className="space-y-2 animate-fade-in-up">
                {inactiveAccounts.map((acc) => (
                  <button
                    key={acc.id}
                    onClick={() => onOpenAccount(acc.id)}
                    className="w-full glass-card p-4 flex items-center justify-between opacity-60 active:scale-[0.98] transition-transform"
                  >
                    <div className="text-left">
                      <p className="font-semibold text-foreground">{acc.name}</p>
                      <p className="text-lg font-bold font-tabular text-foreground">{formatAmount(acc.balance)} ₸</p>
                    </div>
                    <ToggleSwitch on={false} onToggle={() => toggleAccount(acc.id)} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Obligations ──────────────────────────── */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
            Обязательства
          </h2>
          <div className="glass-card overflow-hidden">
            {state.obligations.map((o, i) => (
              <div key={o.id} className={`px-4 py-3.5 ${i < state.obligations.length - 1 ? "border-b border-white/5" : ""}`}>
                {editingOblig === o.id ? (
                  <div className="flex gap-2">
                    <input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)} className="flex-1 glass-input px-2 py-1.5 text-sm focus:outline-none" />
                    <div className="relative w-28">
                      <input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="w-full glass-input px-2 py-1.5 text-sm focus:outline-none pr-5" />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₸</span>
                    </div>
                    <button onClick={() => { const amt = parseFloat(editAmount) || 0; if (amt && editName.trim()) updateObligation(o.id, editName.trim(), amt); setEditingOblig(null); }} className="px-2 py-1 rounded-lg text-xs font-bold text-white" style={{ background: "hsl(162 100% 33%)" }}>
                      <Check size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <button onClick={(e) => { e.stopPropagation(); toggleObligationPaid(o.id); }} className="mr-3 flex-shrink-0">
                      {o.paid ? <CheckCircle2 size={18} className="text-safe-green" /> : <Circle size={18} className="text-muted-foreground" />}
                    </button>
                    <div
                      className={`flex-1 flex items-center justify-between cursor-pointer ${o.paid ? "opacity-50" : ""}`}
                      onClick={() => { setEditingOblig(o.id); setEditName(o.name); setEditAmount(o.amount.toString()); }}
                    >
                      <div>
                        <span className={`text-sm ${o.paid ? "line-through text-muted-foreground" : "text-foreground"}`}>{o.name}</span>
                        {o.installments && (
                          <p className="text-xs text-muted-foreground">{formatAmount(o.amount)} ₸ × {o.installments.remaining} мес</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold font-tabular text-foreground">{formatAmount(o.amount)} ₸</span>
                        <button onClick={(e) => { e.stopPropagation(); deleteObligation(o.id); }} className="text-muted-foreground hover:text-destructive transition-colors">
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div className="px-4 py-3" style={{ background: "hsl(0 0% 14%)" }}>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Неоплачено</span>
                <span className="font-bold font-tabular text-alert-orange">{formatAmount(remainingObligations)} ₸</span>
              </div>
            </div>
          </div>

          {showAddOblig ? (
            <div className="glass-card-raised p-4 mt-2 space-y-3 animate-fade-in-up">
              <input autoFocus placeholder="Название" value={newObligName} onChange={(e) => setNewObligName(e.target.value)} className="w-full glass-input px-3 py-2.5 text-sm focus:outline-none" />
              <div className="relative">
                <input type="number" placeholder="0" value={newObligAmount} onChange={(e) => setNewObligAmount(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddObligation()} className="w-full glass-input px-3 py-2.5 text-sm focus:outline-none pr-8" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">₸</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAddOblig(false)} className="flex-1 py-2.5 rounded-[10px] text-sm font-semibold text-foreground" style={{ background: "hsl(0 0% 23%)" }}>Отмена</button>
                <button onClick={handleAddObligation} className="flex-1 py-2.5 rounded-[10px] text-sm font-bold text-white" style={{ background: "hsl(162 100% 33%)" }}>Добавить</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAddOblig(true)} className="w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-safe-green py-3 rounded-[12px] text-sm font-semibold transition-colors mt-2" style={{ background: "hsl(0 0% 11%)" }}>
              <Plus size={16} /> Добавить обязательство
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
