import { useState } from "react";
import { Plus, X, RefreshCw, AlertTriangle, CheckCircle2, Circle } from "lucide-react";
import { useFinance } from "@/hooks/useFinance";
import { formatAmount } from "@/lib/formatAmount";
import { toast } from "@/hooks/use-toast";

interface SettingsProps {
  finance: ReturnType<typeof useFinance>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">{title}</h2>
      {children}
    </div>
  );
}

export default function Settings({ finance }: SettingsProps) {
  const {
    state,
    totalObligations,
    remainingObligations,
    monthlyBudget,
    spentThisMonth,
    budgetRemaining,
    budgetStatus,
    alreadySaved,
    addObligation,
    updateObligation,
    toggleObligationPaid,
    deleteObligation,
    setSavingsGoal,
    updateBudgetPeriod,
    startNewMonth,
  } = finance;

  const [newObligName, setNewObligName] = useState("");
  const [newObligAmount, setNewObligAmount] = useState("");
  const [showAddOblig, setShowAddOblig] = useState(false);
  const [showNewMonthDialog, setShowNewMonthDialog] = useState(false);
  const [editingOblig, setEditingOblig] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState("");

  const daysLeft = Math.max(0, state.budgetPeriod.totalDays - state.budgetPeriod.currentDay);

  const budgetColor =
    budgetStatus === "critical"
      ? "text-destructive"
      : budgetStatus === "warning"
      ? "text-alert-orange"
      : "text-safe-green";

  const handleAddObligation = () => {
    if (!newObligName.trim() || !newObligAmount) return;
    const amount = parseFloat(newObligAmount.replace(/[^\d.]/g, ""));
    if (isNaN(amount)) return;
    addObligation(newObligName.trim(), amount);
    setNewObligName("");
    setNewObligAmount("");
    setShowAddOblig(false);
    toast({ description: "✅ Обязательство добавлено", duration: 2000 });
  };

  const handleNewMonth = () => {
    startNewMonth();
    setShowNewMonthDialog(false);
    toast({ description: "🔄 Новый месяц начат", duration: 2000 });
  };

  const goalAchieved = alreadySaved >= state.savingsGoal;

  return (
    <div className="flex flex-col min-h-screen pb-28">
      {/* Header */}
      <div className="px-5 pt-10 pb-6">
        <h1 className="text-2xl font-bold text-foreground">Настройки</h1>
        <p className="text-sm text-muted-foreground mt-1">Бюджет и обязательства</p>
      </div>

      <div className="flex-1 px-4 space-y-6">

        {/* ─── Section 1: Obligations ─────────────────────────────── */}
        <Section title="Обязательства (в месяц)">
          <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
            {state.obligations.map((o, i) => (
              <div
                key={o.id}
                className={`px-4 py-3.5 ${i < state.obligations.length - 1 ? "border-b border-border/50" : ""}`}
              >
                {editingOblig === o.id ? (
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 bg-surface-raised border border-safe-green rounded-lg px-2 py-1.5 text-sm text-foreground focus:outline-none"
                    />
                    <div className="relative w-28">
                      <input
                        type="number"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="w-full bg-surface-raised border border-safe-green rounded-lg px-2 py-1.5 text-sm text-foreground focus:outline-none pr-5"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₸</span>
                    </div>
                    <button
                      onClick={() => {
                        const amt = parseFloat(editAmount.replace(/[^\d.]/g, ""));
                        if (!isNaN(amt) && editName.trim()) {
                          updateObligation(o.id, editName.trim(), amt);
                        }
                        setEditingOblig(null);
                      }}
                      className="px-2 py-1 bg-safe-green text-primary-foreground rounded-lg text-xs font-bold"
                    >
                      ОК
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    {/* Paid toggle */}
                    <button
                      onClick={() => toggleObligationPaid(o.id)}
                      className="mr-2 flex-shrink-0"
                      title={o.paid ? "Отметить неоплаченным" : "Отметить оплаченным"}
                    >
                      {o.paid
                        ? <CheckCircle2 size={18} className="text-safe-green" />
                        : <Circle size={18} className="text-muted-foreground" />
                      }
                    </button>
                    <div
                      className={`flex-1 flex items-center justify-between cursor-pointer group ${o.paid ? "opacity-50" : ""}`}
                      onClick={() => { setEditingOblig(o.id); setEditName(o.name); setEditAmount(o.amount.toString()); }}
                    >
                      <span className={`text-sm group-hover:text-safe-green transition-colors ${o.paid ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {o.name}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold font-tabular text-foreground">{formatAmount(o.amount)} ₸</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteObligation(o.id); }}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Total rows */}
            <div className="px-4 py-3 bg-muted/30 border-t border-border/60 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Всего</span>
                <span className="font-semibold font-tabular text-foreground text-sm">{formatAmount(totalObligations)} ₸</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Неоплачено</span>
                <span className="font-bold font-tabular text-alert-orange">{formatAmount(remainingObligations)} ₸</span>
              </div>
            </div>
          </div>

          {/* Add obligation */}
          {showAddOblig ? (
            <div className="bg-card border border-safe-green/30 rounded-2xl p-4 space-y-3 animate-fade-in-up">
              <input
                autoFocus
                placeholder="Название (напр. Аренда)"
                value={newObligName}
                onChange={(e) => setNewObligName(e.target.value)}
                className="w-full bg-surface-raised border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-safe-green focus:outline-none"
              />
              <div className="relative">
                <input
                  type="number"
                  placeholder="0"
                  value={newObligAmount}
                  onChange={(e) => setNewObligAmount(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddObligation()}
                  className="w-full bg-surface-raised border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-safe-green focus:outline-none pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">₸</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAddOblig(false)} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors">Отмена</button>
                <button onClick={handleAddObligation} className="flex-1 py-2.5 rounded-xl bg-safe-green text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity">Добавить</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddOblig(true)}
              className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-border text-muted-foreground hover:border-safe-green hover:text-safe-green py-3 rounded-2xl text-sm font-semibold transition-colors"
            >
              <Plus size={16} />
              Добавить обязательство
            </button>
          )}
        </Section>

        {/* ─── Section 2: Savings goal ─────────────────────────────── */}
        <Section title="Цель сбережений">
          <div className="bg-card border border-border/60 rounded-2xl p-4">
            <label className="text-xs text-muted-foreground mb-2 block">
              Хочу отложить в этом месяце
            </label>
            <div className="relative">
              <input
                type="number"
                value={state.savingsGoal || ""}
                onChange={(e) => setSavingsGoal(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full bg-surface-raised border border-border rounded-xl px-4 py-3 text-xl font-bold text-safe-green font-tabular focus:border-safe-green focus:outline-none transition-colors pr-8"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">₸</span>
            </div>
            {state.savingsGoal > 0 && (
              <div className="mt-3 space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Уже отложено: <span className="text-safe-green font-semibold">{formatAmount(alreadySaved)} ₸</span></span>
                  <span>Осталось: <span className="text-foreground font-semibold">{formatAmount(Math.max(0, state.savingsGoal - alreadySaved))} ₸</span></span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-safe-green rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (alreadySaved / state.savingsGoal) * 100)}%` }}
                  />
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Можно оставить 0, если не планируешь откладывать
            </p>
          </div>
        </Section>

        {/* ─── Section 3: Budget period ─────────────────────────────── */}
        <Section title="Период бюджета">
          <div className="bg-card border border-border/60 rounded-2xl p-4 space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Длительность периода (дни)</label>
              <div className="relative">
                <input
                  type="number"
                  value={state.budgetPeriod.totalDays || ""}
                  onChange={(e) => updateBudgetPeriod({ totalDays: parseInt(e.target.value) || 30 })}
                  className="w-full bg-surface-raised border border-border rounded-xl px-4 py-3 text-lg font-bold text-foreground font-tabular focus:border-safe-green focus:outline-none pr-16"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">дней</span>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Сегодня день №</label>
              <div className="relative">
                <input
                  type="number"
                  value={state.budgetPeriod.currentDay || ""}
                  onChange={(e) => updateBudgetPeriod({ currentDay: Math.min(parseInt(e.target.value) || 1, state.budgetPeriod.totalDays) })}
                  className="w-full bg-surface-raised border border-border rounded-xl px-4 py-3 text-lg font-bold text-foreground font-tabular focus:border-safe-green focus:outline-none pr-16"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">/ {state.budgetPeriod.totalDays}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">Осталось: <span className="font-semibold text-foreground">{daysLeft} дней</span></p>
            </div>
          </div>
        </Section>

        {/* ─── Section 4: Budget tracking ──────────────────────────── */}
        <Section title="Остаток бюджета">
          <div className="bg-card border border-border/60 rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-foreground/80">Бюджет на месяц</span>
              <span className="font-bold font-tabular text-foreground">{formatAmount(monthlyBudget)} ₸</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-foreground/80">Уже потрачено</span>
              <span className="font-bold font-tabular text-alert-orange">{formatAmount(spentThisMonth)} ₸</span>
            </div>
            {monthlyBudget > 0 && (
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (spentThisMonth / monthlyBudget) * 100)}%`,
                    background:
                      budgetStatus === "critical"
                        ? "hsl(0 84% 60%)"
                        : budgetStatus === "warning"
                        ? "hsl(22 82% 51%)"
                        : "hsl(162 100% 33%)",
                  }}
                />
              </div>
            )}
            <div className="border-t border-border/60 pt-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-foreground">Остаток бюджета</span>
                <span className={`text-2xl font-bold font-tabular ${budgetColor}`}>
                  {formatAmount(Math.max(0, budgetRemaining))} ₸
                </span>
              </div>
            </div>
          </div>
        </Section>

        {/* ─── New month button ─────────────────────────────────────── */}
        <button
          onClick={() => setShowNewMonthDialog(true)}
          className="w-full flex items-center justify-center gap-2 border border-border text-muted-foreground hover:border-safe-green hover:text-safe-green py-4 rounded-2xl font-semibold text-sm transition-colors"
        >
          <RefreshCw size={16} />
          Начать новый месяц
        </button>
      </div>

      {/* New Month Confirmation Dialog */}
      {showNewMonthDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowNewMonthDialog(false)} />
          <div className="relative bg-card border border-border rounded-2xl p-6 w-full max-w-sm animate-fade-in-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-alert-orange/10 flex items-center justify-center">
                <AlertTriangle size={20} className="text-alert-orange" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Начать новый месяц?</h3>
            </div>

            {/* Summary */}
            <div className="bg-surface-raised rounded-xl p-3 mb-4 space-y-2 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Итоги месяца</p>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Отложено в сбережения</span>
                <span className="font-bold font-tabular text-safe-green">{formatAmount(alreadySaved)} ₸</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Цель</span>
                <span className="font-tabular text-foreground">{formatAmount(state.savingsGoal)} ₸</span>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-border/60">
                {goalAchieved
                  ? <><CheckCircle2 size={14} className="text-safe-green" /><span className="text-safe-green font-medium">Цель достигнута! 🎉</span></>
                  : <><AlertTriangle size={14} className="text-alert-orange" /><span className="text-alert-orange font-medium">Цель не достигнута</span></>
                }
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-5">
              Счётчик дней сбросится до 1, история расходов очистится. Обязательства станут неоплаченными.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowNewMonthDialog(false)}
                className="flex-1 py-3 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleNewMonth}
                className="flex-1 py-3 rounded-xl bg-safe-green text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity"
              >
                Начать
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
