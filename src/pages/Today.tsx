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
  Flame,
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
        className="relative w-full max-w-app glass-sheet rounded-t-[24px] p-5 modal-slide-up mb-20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 rounded-full bg-border" />
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
          <div className="border-t border-border pt-2 flex justify-between text-foreground">
            <span>÷ Дней осталось</span>
            <span className="font-tabular font-semibold">{daysLeft} дн.</span>
          </div>
          <div className="rounded-2xl p-3 mt-1 space-y-1.5 bg-card">
            <div className="flex justify-between">
              <span className="text-foreground/80">= Дневной лимит</span>
              <span className="text-foreground font-semibold font-tabular">{formatAmount(dailyBudget)} ₸</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground/80">− Потрачено сегодня</span>
              <span className="text-alert-orange font-semibold font-tabular">{formatAmount(spentToday)} ₸</span>
            </div>
            <div className="flex justify-between items-center border-t border-border pt-1.5">
              <span className="text-foreground font-medium">= Можно потратить</span>
              <span className="text-primary font-bold font-tabular text-lg">
                {formatAmount(Math.max(0, safeToSpend))} ₸
              </span>
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

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 60) setSwiped(true);
    else if (diff < -30) setSwiped(false);
  };

  const Icon = isIncome ? TrendingUp : isTransfer ? ArrowRightLeft : TrendingDown;
  const color = isIncome ? "text-safe-green" : isTransfer ? "text-income-blue" : "text-alert-orange";
  const bgColor = isIncome ? "bg-safe-green/10" : isTransfer ? "bg-income-blue/10" : "bg-alert-orange/10";

  return (
    <div className="relative overflow-hidden rounded-xl">
      {swiped && (
        <button
          onClick={() => onDelete(expense.id)}
          className="absolute right-0 top-0 bottom-0 w-20 bg-destructive flex items-center justify-center animate-swipe-reveal rounded-r-xl"
        >
          <Trash2 size={18} className="text-white" />
        </button>
      )}
      <div
        className={`bg-card px-4 py-3 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all duration-200 ${
          swiped ? "-translate-x-20" : "translate-x-0"
        }`}
        style={{ transition: "transform 0.25s ease-out" }}
        onClick={() => !swiped && onEdit(expense)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center ${bgColor}`}>
            <Icon size={14} className={color} />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground">{expense.account}</p>
          </div>
        </div>
        <span className={`font-bold font-tabular text-sm ${color}`}>
          {isIncome ? "+" : "−"}
          {formatAmount(expense.amount)} ₸
        </span>
      </div>
    </div>
  );
}

// Week selector component
function WeekSelector({ expenses, dailyBudget }: { expenses: Expense[]; dailyBudget: number }) {
  const weekDays = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const days = [];
  for (let i = -3; i <= 3; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    const spent = expenses
      .filter((e) => e.type === "regular" && e.date === dateStr)
      .reduce((sum, e) => sum + e.amount, 0);
    const isToday = dateStr === todayStr;
    const isPast = dateStr < todayStr;
    const withinBudget = spent <= dailyBudget;
    const hasData = spent > 0 || isPast;

    days.push({
      date: d,
      dateStr,
      dayNum: d.getDate(),
      weekDay: weekDays[d.getDay()],
      isToday,
      isPast,
      spent,
      withinBudget,
      hasData,
    });
  }

  return (
    <div className="flex justify-center gap-2 px-5">
      {days.map((d) => (
        <div
          key={d.dateStr}
          className="week-day-pill"
          style={{
            background: d.isToday ? "hsl(var(--foreground))" : "hsl(var(--card))",
          }}
        >
          <span
            className="text-[10px] font-semibold uppercase"
            style={{
              color: d.isToday ? "hsl(var(--background))" : "hsl(var(--muted-foreground))",
            }}
          >
            {d.weekDay}
          </span>
          <span
            className="text-base font-bold"
            style={{
              color: d.isToday ? "hsl(var(--background))" : "hsl(var(--foreground))",
            }}
          >
            {d.dayNum}
          </span>
          {d.hasData && d.isPast && (
            <div
              className="w-[5px] h-[5px] rounded-full mt-0.5"
              style={{
                background: d.withinBudget
                  ? "hsl(var(--safe-green))"
                  : "hsl(var(--destructive))",
              }}
            />
          )}
          {d.isToday && <div className="w-[5px] h-[5px] rounded-full mt-0.5 bg-white/60" />}
        </div>
      ))}
    </div>
  );
}

export default function Today({ finance, onShowHistory }: TodayProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [activeSwipeCard, setActiveSwipeCard] = useState(0);

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

  const displayAmount = Math.max(0, safeToSpend);
  const isOverspent = safeToSpend < 0;
  const overspendAmount = Math.abs(safeToSpend);

  const heroLabel =
    isOverspent
      ? "ДНЕВНОЙ ЛИМИТ ИСЧЕРПАН"
      : safeToSpendStatus === "warning"
      ? "ПОЧТИ ИСЧЕРПАН ЛИМИТ"
      : "МОЖЕШЬ ПОТРАТИТЬ СЕГОДНЯ";

  const sortedByDateDesc = [...state.expenses].sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : 0
  );
  const recentExpenses = sortedByDateDesc.slice(0, 6);

  const groupedRecent = new Map<string, Expense[]>();
  recentExpenses.forEach((e) => {
    const arr = groupedRecent.get(e.date) || [];
    arr.push(e);
    groupedRecent.set(e.date, arr);
  });

  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [goalInput, setGoalInput] = useState("");

  // Swipeable cards scroll handler
  const swipeRef = useRef<HTMLDivElement>(null);
  const handleSwipeScroll = () => {
    if (swipeRef.current) {
      const scrollLeft = swipeRef.current.scrollLeft;
      const cardWidth = swipeRef.current.offsetWidth - 40;
      setActiveSwipeCard(Math.round(scrollLeft / (cardWidth + 12)));
    }
  };

  // Budget discipline data for streak badge
  const { currentStreak } = (() => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    let streak = 0;
    for (let i = 0; i <= 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const spent = state.expenses
        .filter((e) => e.type === "regular" && e.date === dateStr)
        .reduce((sum, e) => sum + e.amount, 0);
      if (dateStr <= todayStr && spent <= dailyBudget) streak++;
      else break;
    }
    return { currentStreak: streak };
  })();

  return (
    <div className="flex flex-col min-h-screen pb-40">
      {/* Header */}
      <div className="px-5 pt-10 pb-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground tracking-tight">₸ Sanda</h1>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card">
          <Flame size={14} className="text-alert-orange" />
          <span className="text-sm font-bold text-foreground">{currentStreak}</span>
        </div>
      </div>

      {/* Week Selector */}
      <div className="py-3">
        <WeekSelector expenses={state.expenses} dailyBudget={dailyBudget} />
      </div>

      {/* Hero Card */}
      <div className="px-5 py-3">
        <div className="hero-gradient relative">
          <button
            onClick={() => setShowInfo(true)}
            className="absolute top-4 right-4 text-white/50 hover:text-white/80 transition-colors"
          >
            <HelpCircle size={18} />
          </button>
          <p className="text-[11px] font-semibold tracking-widest uppercase text-white/70 mb-2">
            {heroLabel}
          </p>
          <div className="flex items-end gap-2 mb-2">
            <span className="safe-number font-tabular text-white">
              <AnimatedNumber value={displayAmount} />
            </span>
            <span className="text-3xl font-bold text-white/80 mb-1">₸</span>
          </div>
          {isOverspent && (
            <p className="text-sm font-semibold text-white/90 animate-fade-in-up">
              Перерасход: {formatAmount(overspendAmount)} ₸
            </p>
          )}
          <div className="flex items-center gap-3 mt-1 text-xs text-white/70 font-tabular">
            <span>
              Лимит: <span className="text-white font-semibold">{formatAmount(effectiveDailyBudget)} ₸</span>
            </span>
            <span style={{ opacity: 0.4 }}>•</span>
            <span>
              Потрачено: <span className="text-white font-semibold">{formatAmount(spentToday)} ₸</span>
            </span>
          </div>
        </div>
      </div>

      {/* Swipeable Cards */}
      <div className="px-5 py-2">
        <div
          ref={swipeRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide swipe-container"
          onScroll={handleSwipeScroll}
        >
          {/* Discipline Card */}
          <div className="swipe-card bg-card rounded-2xl p-5" style={{ width: "calc(100% - 40px)", minWidth: "calc(100% - 40px)" }}>
            <BudgetDiscipline
              expenses={state.expenses}
              dailyBudget={dailyBudget}
              activeBalance={activeBalance}
              remainingObligations={remainingObligations}
              stillNeedToSave={stillNeedToSave}
            />
          </div>
        </div>
        {/* Dots */}
        <div className="flex justify-center gap-1.5 mt-3">
          {[0].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full transition-colors"
              style={{
                background: activeSwipeCard === i ? "hsl(var(--foreground))" : "hsl(var(--border))",
              }}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 space-y-6 mt-2">
        {/* Savings progress */}
        {savingsAccounts.length > 0 && (
          <div className="animate-fade-in-up" style={{ animationDelay: "0.08s" }}>
            <div className="flex items-center gap-2 mb-3">
              <PiggyBank size={14} className="text-primary" />
              <h3 className="section-header">Цель сбережений</h3>
            </div>
            <div className="space-y-2">
              {savingsAccounts.map((acc) => {
                const saved = getSavingsForAccount(acc.name);
                const goal = acc.monthlyGoal || 0;
                const pct = goal > 0 ? Math.min(100, Math.round((saved / goal) * 100)) : 0;
                return (
                  <div key={acc.id} className="bg-card rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground">{acc.name}</span>
                      {editingGoalId === acc.id ? (
                        <div className="flex items-center gap-2">
                          <MoneyInput
                            autoFocus
                            value={goalInput}
                            onChange={setGoalInput}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                updateAccountGoal(acc.id, parseFloat(goalInput) || 0);
                                setEditingGoalId(null);
                              }
                            }}
                            className="w-24 glass-input px-2 py-1 text-xs font-tabular text-right focus:outline-none"
                          />
                          <button
                            onClick={() => {
                              updateAccountGoal(acc.id, parseFloat(goalInput) || 0);
                              setEditingGoalId(null);
                            }}
                            className="text-xs text-primary font-bold"
                          >
                            OK
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingGoalId(acc.id);
                            setGoalInput((acc.monthlyGoal || 0).toString());
                          }}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {goal > 0
                            ? `${formatAmount(goal)} ₸/мес ✎`
                            : "Задать цель ✎"}
                        </button>
                      )}
                    </div>
                    {goal > 0 && (
                      <>
                        <div className="h-1.5 rounded-full overflow-hidden bg-border mt-2">
                          <div
                            className="h-full rounded-full transition-all duration-500 bg-primary"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
                          <span>
                            Отложено:{" "}
                            <span className="text-primary font-semibold">
                              {formatAmount(saved)} ₸
                            </span>
                          </span>
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
          <div className="animate-fade-in-up" style={{ animationDelay: "0.12s" }}>
            <h3 className="section-header mb-3 px-1">
              📜 Последние операции
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
                      <span
                        className={`text-xs font-bold font-tabular ${
                          dayTotal >= 0 ? "text-safe-green" : "text-alert-orange"
                        }`}
                      >
                        {dayTotal >= 0 ? "+" : ""}
                        {formatAmount(dayTotal)} ₸
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {txns.map((expense) => {
                        const isIncome = expense.type === "income";
                        const isTransfer =
                          expense.type === "transfer" || expense.type === "savings";
                        const isObligation = expense.type === "obligation";

                        const txLabel = isIncome
                          ? expense.note || "Доход"
                          : isTransfer
                          ? expense.toAccount
                            ? `→ ${expense.toAccount}`
                            : "Перевод"
                          : isObligation
                          ? state.obligations.find(
                              (o) => o.id === expense.obligationId
                            )?.name ?? "Обязательство"
                          : expense.note || expense.account;

                        return (
                          <TransactionRow
                            key={expense.id}
                            expense={expense}
                            label={txLabel}
                            onDelete={(id) => {
                              deleteExpense(id);
                              toast({ description: "🗑 Операция удалена", duration: 2000 });
                            }}
                            onEdit={(exp) => {
                              setEditingExpense(exp);
                              setSheetOpen(true);
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              onClick={onShowHistory}
              className="w-full flex items-center justify-center gap-2 py-3 mt-3 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors bg-card"
            >
              Показать всю историю <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => {
          setEditingExpense(null);
          setSheetOpen(true);
        }}
        className="fixed bottom-28 right-5 z-30 w-14 h-14 rounded-full flex items-center justify-center active:scale-90 transition-all duration-200"
        style={{
          background: "hsl(var(--foreground))",
          boxShadow: "0 8px 24px rgba(29,29,31,0.25)",
        }}
      >
        <Plus
          size={28}
          strokeWidth={2.5}
          className="text-white transition-transform duration-300"
          style={{ transform: sheetOpen ? "rotate(45deg)" : "rotate(0deg)" }}
        />
      </button>

      {/* Unified Action Sheet */}
      <UnifiedActionSheet
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          setEditingExpense(null);
        }}
        onSaveExpense={(amount, account, type, opts) => {
          addExpense(amount, account, type, opts);
          const label =
            type === "savings" || type === "transfer"
              ? "💰 Переведено"
              : type === "obligation"
              ? "✅ Платёж"
              : "✅ Расход";
          toast({
            description: `${label}: ${formatAmount(amount)} ₸`,
            duration: 2000,
          });
        }}
        onSaveIncome={(amount, account, note, date) => {
          addIncome(amount, account, note, date);
          toast({
            description: `💰 Доход: +${formatAmount(amount)} ₸`,
            duration: 2000,
          });
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