import { useState, useRef, useEffect } from "react";
import {
  HelpCircle,
  Plus,
  TrendingDown,
  TrendingUp,
  ArrowRightLeft,
  PiggyBank,
  Trash2,
  ChevronRight,
} from "lucide-react";
import { useFinance, Expense } from "@/hooks/useFinance";
import { formatAmount } from "@/lib/formatAmount";
import UnifiedActionSheet from "@/components/UnifiedActionSheet";
import BudgetDiscipline from "@/components/BudgetDiscipline";
import { toast } from "@/hooks/use-toast";
import MoneyInput from "@/components/MoneyInput";

interface TodayProps {
  finance: ReturnType<typeof useFinance>;
  onShowHistory: () => void;
}

function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(value);
  const [flash, setFlash] = useState(false);
  const prevRef = useRef(value);

  useEffect(() => {
    if (prevRef.current === value) return;
    setFlash(true);
    const start = prevRef.current;
    const end = value;
    const duration = 600;
    const startTime = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (progress < 1) requestAnimationFrame(step);
      else {
        setDisplay(end);
        prevRef.current = end;
      }
    };
    requestAnimationFrame(step);
    setTimeout(() => setFlash(false), 500);
  }, [value]);

  return (
    <span className={`${className} ${flash ? "number-flash" : ""}`}>
      {formatAmount(Math.abs(display))}
    </span>
  );
}

function InfoPanel({
  onClose,
  activeBalance,
  remainingObligations,
  stillNeedToSave,
  daysLeft,
  dailyBudget,
  spentToday,
  safeToSpend,
}: {
  onClose: () => void;
  activeBalance: number;
  remainingObligations: number;
  stillNeedToSave: number;
  daysLeft: number;
  dailyBudget: number;
  spentToday: number;
  safeToSpend: number;
}) {
  useEffect(() => {
    document.body.classList.add("popup-open");
    return () => document.body.classList.remove("popup-open");
  }, []);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 glass-overlay" />
      <div
        className="relative w-full max-w-app glass-sheet rounded-t-[20px] p-5 modal-slide-up mb-20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 rounded-full" style={{ background: "hsl(0 0% 30%)" }} />
        </div>
        <h3 className="text-sm font-bold text-foreground mb-3">Как рассчитывается?</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-foreground/80">
            <span>Доступно на счетах</span>
            <span className="font-tabular font-semibold">{formatAmount(activeBalance)} ₸</span>
          </div>
          <div className="flex justify-between text-alert-orange">
            <span>− Неоплаченные обязательства</span>
            <span className="font-tabular font-semibold">−{formatAmount(remainingObligations)} ₸</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>− Осталось сберечь</span>
            <span className="font-tabular font-semibold">−{formatAmount(stillNeedToSave)} ₸</span>
          </div>
          <div className="border-t border-white/5 pt-2 flex justify-between text-foreground">
            <span>÷ Дней осталось</span>
            <span className="font-tabular font-semibold">{daysLeft} дн.</span>
          </div>
          <div className="rounded-[12px] p-3 mt-1 space-y-1.5" style={{ background: "hsl(0 0% 18%)" }}>
            <div className="flex justify-between">
              <span className="text-foreground/80">= Дневной лимит</span>
              <span className="text-foreground font-semibold font-tabular">{formatAmount(dailyBudget)} ₸</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground/80">− Потрачено сегодня</span>
              <span className="text-alert-orange font-semibold font-tabular">{formatAmount(spentToday)} ₸</span>
            </div>
            <div className="flex justify-between items-center border-t border-white/5 pt-1.5">
              <span className="text-foreground font-medium">= Можно потратить</span>
              <span className="text-safe-green font-bold font-tabular text-lg">{formatAmount(Math.max(0, safeToSpend))} ₸</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TransactionRow({
  expense,
  label,
  onDelete,
  onEdit,
}: {
  expense: Expense;
  label: string;
  onDelete: (id: string) => void;
  onEdit: (expense: Expense) => void;
}) {
  const [swiped, setSwiped] = useState(false);
  const touchStartX = useRef(0);
  const isIncome = expense.type === "income";
  const isTransfer = expense.type === "transfer" || expense.type === "savings";

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 60) setSwiped(true);
    else if (diff < -30) setSwiped(false);
  };

  const Icon = isIncome ? TrendingUp : isTransfer ? ArrowRightLeft : TrendingDown;
  const color = isIncome ? "text-safe-green" : isTransfer ? "text-income-blue" : "text-alert-orange";
  const bgColor = isIncome ? "bg-safe-green/15" : isTransfer ? "bg-income-blue/15" : "bg-alert-orange/15";

  return (
    <div className="relative overflow-hidden rounded-[12px]">
      {swiped && (
        <button onClick={() => onDelete(expense.id)}
          className="absolute right-0 top-0 bottom-0 w-20 bg-destructive flex items-center justify-center animate-swipe-reveal rounded-r-[12px]">
          <Trash2 size={18} className="text-white" />
        </button>
      )}
      <div
        className={`glass-card px-4 py-3 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all duration-200 ${swiped ? "-translate-x-20" : "translate-x-0"}`}
        style={{ transition: "transform 0.25s ease-out" }}
        onClick={() => !swiped && onEdit(expense)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${bgColor}`}>
            <Icon size={14} className={color} />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground">{expense.account}</p>
          </div>
        </div>
        <span className={`font-bold font-tabular text-sm ${color}`}>
          {isIncome ? "+" : "−"}{formatAmount(expense.amount)} ₸
        </span>
      </div>
    </div>
  );
}

export default function Today({ finance, onShowHistory }: TodayProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  const {
    state,
    safeToSpend,
    safeToSpendStatus,
    activeBalance,
    remainingObligations,
    stillNeedToSave,
    daysLeft,
    dailyBudget,
    effectiveDailyBudget,
    adjustedDailyBudget,
    spentToday,
    monthlyBudget,
    spentThisMonth,
    budgetRemaining,
    budgetStatus,
    alreadySaved,
    savingsProgress,
    plannedSavings,
    savingsAccounts,
    getSavingsForAccount,
    updateAccountGoal,
    addExpense,
    addIncome,
    deleteExpense,
    updateExpense,
  } = finance;

  const usePlans = state.includePlansInCalculation ?? true;

  const safeToSpendColor =
    safeToSpendStatus === "overspent"
      ? "text-destructive"
      : safeToSpendStatus === "warning"
      ? "text-alert-orange"
      : "text-safe-green";

  const budgetColor =
    budgetStatus === "critical"
      ? "text-destructive"
      : budgetStatus === "warning"
      ? "text-alert-orange"
      : "text-safe-green";

  const sortedByDateDesc = [...state.expenses].sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
  const recentExpenses = sortedByDateDesc.slice(0, 6);

  const groupedRecent = new Map<string, Expense[]>();
  recentExpenses.forEach((e) => {
    const arr = groupedRecent.get(e.date) || [];
    arr.push(e);
    groupedRecent.set(e.date, arr);
  });

  const displayAmount = Math.max(0, safeToSpend);
  const isOverspent = safeToSpend < 0;
  const overspendAmount = Math.abs(safeToSpend);

  const heroLabel =
    isOverspent
      ? "ДНЕВНОЙ ЛИМИТ ИСЧЕРПАН"
      : safeToSpendStatus === "warning"
      ? "ПОЧТИ ИСЧЕРПАН ЛИМИТ"
      : "МОЖЕШЬ ПОТРАТИТЬ СЕГОДНЯ";

  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [goalInput, setGoalInput] = useState("");

  return (
    <div className="flex flex-col min-h-screen pb-40">
      {/* Hero section */}
      <div className="px-5 pt-10 pb-6 text-center">
        <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-3">
          {heroLabel}
        </p>
        <div className="flex items-end justify-center gap-2 mb-1">
          <span className={`safe-number font-tabular ${isOverspent ? "text-destructive" : safeToSpendColor}`}>
            <AnimatedNumber value={displayAmount} />
          </span>
          <span className={`text-4xl font-bold mb-1 opacity-80 ${isOverspent ? "text-destructive" : safeToSpendColor}`}>₸</span>
        </div>

        {isOverspent && (
          <p className="text-sm font-semibold text-alert-orange mt-1 animate-fade-in-up">
            Перерасход: {formatAmount(overspendAmount)} ₸
          </p>
        )}

        {/* Plans indicator */}
        {usePlans && dailyBudget !== adjustedDailyBudget && (
          <p className="text-xs text-muted-foreground mt-1 font-tabular">
            (без планов: {formatAmount(Math.max(0, dailyBudget - spentToday))} ₸)
          </p>
        )}

        <div className="flex items-center justify-center gap-3 mt-2 text-xs text-muted-foreground font-tabular">
          <span>Лимит: <span className="text-foreground font-semibold">{formatAmount(effectiveDailyBudget)} ₸</span></span>
          <span style={{ opacity: 0.3 }}>•</span>
          <span>Потрачено: <span className="text-alert-orange font-semibold">{formatAmount(spentToday)} ₸</span></span>
        </div>

        <button onClick={() => setShowInfo(true)} className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <HelpCircle size={12} /> Как считается?
        </button>
      </div>

      <div className="flex-1 px-4 space-y-3">
        {/* Budget discipline chart */}
        <BudgetDiscipline
          expenses={state.expenses}
          dailyBudget={dailyBudget}
          activeBalance={activeBalance}
          remainingObligations={remainingObligations}
          stillNeedToSave={stillNeedToSave}
        />

        {/* Monthly budget card */}
        <div className="glass-card p-4 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Бюджет на месяц
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground/80">Выделено</span>
              <span className="font-bold font-tabular text-foreground">{formatAmount(monthlyBudget)} ₸</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground/80">Потрачено</span>
              <span className="font-semibold font-tabular text-alert-orange">{formatAmount(spentThisMonth)} ₸</span>
            </div>
            {monthlyBudget > 0 && (
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(0 0% 23%)" }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (spentThisMonth / monthlyBudget) * 100)}%`,
                    background: budgetStatus === "critical" ? "hsl(0 76% 61%)" : budgetStatus === "warning" ? "hsl(38 100% 52%)" : "hsl(162 100% 33%)",
                  }} />
              </div>
            )}
            <div className="flex items-center justify-between pt-1 border-t border-white/5">
              <span className="text-sm font-medium text-foreground">Остаток</span>
              <span className={`font-bold font-tabular text-lg ${budgetColor}`}>
                <AnimatedNumber value={Math.max(0, budgetRemaining)} /> ₸
              </span>
            </div>
          </div>
        </div>

        {/* Savings progress */}
        {savingsAccounts.length > 0 && (
          <div className="glass-card p-4 animate-fade-in-up" style={{ animationDelay: "0.08s" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <PiggyBank size={14} className="text-safe-green" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Цель сбережений</h3>
              </div>
              <span className="text-xs font-bold text-safe-green">{savingsProgress}%</span>
            </div>
            <div className="space-y-3">
              {savingsAccounts.map((acc) => {
                const saved = getSavingsForAccount(acc.name);
                const goal = acc.monthlyGoal || 0;
                const pct = goal > 0 ? Math.min(100, Math.round((saved / goal) * 100)) : 0;
                return (
                  <div key={acc.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-foreground">{acc.name}</span>
                      {editingGoalId === acc.id ? (
                        <div className="flex items-center gap-2">
                          <MoneyInput autoFocus value={goalInput} onChange={setGoalInput}
                            onKeyDown={(e) => { if (e.key === "Enter") { updateAccountGoal(acc.id, parseFloat(goalInput) || 0); setEditingGoalId(null); } }}
                            className="w-24 glass-input px-2 py-1 text-xs font-tabular text-right focus:outline-none" />
                          <button onClick={() => { updateAccountGoal(acc.id, parseFloat(goalInput) || 0); setEditingGoalId(null); }}
                            className="text-xs text-safe-green font-bold">OK</button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditingGoalId(acc.id); setGoalInput((acc.monthlyGoal || 0).toString()); }}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                          {goal > 0 ? `${formatAmount(goal)} ₸/мес ✎` : "Задать цель ✎"}
                        </button>
                      )}
                    </div>
                    {goal > 0 && (
                      <>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(0 0% 23%)" }}>
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, background: "hsl(162 100% 33%)" }} />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>Отложено: <span className="text-safe-green font-semibold">{formatAmount(saved)} ₸</span></span>
                          <span>{pct}%</span>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent transactions */}
        {recentExpenses.length > 0 && (
          <div className="animate-fade-in-up mt-8" style={{ animationDelay: "0.12s" }}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
              Последние операции
            </h3>
            <div className="space-y-3">
              {[...groupedRecent.entries()].map(([date, txns]) => {
                const dayTotal = txns.reduce((sum, e) => {
                  if (e.type === "income") return sum + e.amount;
                  if (e.type === "transfer") return sum;
                  return sum - e.amount;
                }, 0);
                return (
                  <div key={date}>
                    <div className="flex items-center justify-between mb-1 px-1">
                      <span className="text-xs text-muted-foreground">{date}</span>
                      <span className={`text-xs font-bold font-tabular ${dayTotal >= 0 ? "text-safe-green" : "text-alert-orange"}`}>
                        {dayTotal >= 0 ? "+" : ""}{formatAmount(dayTotal)} ₸
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {txns.map((expense) => {
                        const isIncome = expense.type === "income";
                        const isTransfer = expense.type === "transfer" || expense.type === "savings";
                        const isObligation = expense.type === "obligation";
                        const label = isIncome
                          ? expense.note || "Доход"
                          : isTransfer
                          ? expense.toAccount ? `→ ${expense.toAccount}` : "Перевод"
                          : isObligation
                          ? state.obligations.find((o) => o.id === expense.obligationId)?.name ?? "Обязательство"
                          : expense.note || expense.account;
                        return (
                          <TransactionRow
                            key={expense.id}
                            expense={expense}
                            label={label}
                            onDelete={(id) => { deleteExpense(id); toast({ description: "🗑 Операция удалена", duration: 2000 }); }}
                            onEdit={(exp) => { setEditingExpense(exp); setSheetOpen(true); }}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={onShowHistory}
              className="w-full flex items-center justify-center gap-2 py-3 mt-3 rounded-[12px] text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
              style={{ background: "hsl(0 0% 11%)" }}>
              Показать всю историю <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => { setEditingExpense(null); setSheetOpen(true); }}
        className="fixed bottom-28 left-1/2 -translate-x-1/2 z-30 w-16 h-16 rounded-full flex items-center justify-center active:scale-90 transition-all duration-200"
        style={{ background: "hsl(162 100% 33%)", boxShadow: "0 4px 16px rgba(0, 166, 118, 0.4)" }}>
        <Plus size={28} strokeWidth={2.5} className="text-white transition-transform duration-300"
          style={{ transform: sheetOpen ? "rotate(45deg)" : "rotate(0deg)" }} />
      </button>

      {/* Unified Action Sheet */}
      <UnifiedActionSheet
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setEditingExpense(null); }}
        onSaveExpense={(amount, account, type, opts) => {
          addExpense(amount, account, type, opts);
          const label = type === "savings" || type === "transfer" ? "💰 Переведено" : type === "obligation" ? "✅ Платёж" : "✅ Расход";
          toast({ description: `${label}: ${formatAmount(amount)} ₸`, duration: 2000 });
        }}
        onSaveIncome={(amount, account, note, date) => {
          addIncome(amount, account, note, date);
          toast({ description: `💰 Доход: +${formatAmount(amount)} ₸`, duration: 2000 });
        }}
        onDeleteExpense={(id) => deleteExpense(id)}
        accounts={state.accounts}
        obligations={state.obligations}
        editingExpense={editingExpense}
      />

      {showInfo && (
        <InfoPanel
          onClose={() => setShowInfo(false)}
          activeBalance={activeBalance}
          remainingObligations={remainingObligations}
          stillNeedToSave={stillNeedToSave}
          daysLeft={daysLeft}
          dailyBudget={effectiveDailyBudget}
          spentToday={spentToday}
          safeToSpend={safeToSpend}
        />
      )}
    </div>
  );
}
