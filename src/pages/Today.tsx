import { useState, useEffect, useRef } from "react";
import { HelpCircle, Plus, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { useFinance } from "@/hooks/useFinance";
import { formatAmount } from "@/lib/formatAmount";
import AddExpenseModal from "@/components/AddExpenseModal";
import { toast } from "@/hooks/use-toast";

interface TodayProps {
  finance: ReturnType<typeof useFinance>;
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
      {formatAmount(display)}
    </span>
  );
}

function InfoPanel({ onClose, activeBalance, totalObligations, savingsGoal, daysLeft, safeToSpend }: {
  onClose: () => void;
  activeBalance: number;
  totalObligations: number;
  savingsGoal: number;
  daysLeft: number;
  safeToSpend: number;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-app bg-card rounded-t-2xl p-5 modal-slide-up border-t border-border/60 mb-20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 bg-muted-foreground/40 rounded-full" />
        </div>
        <h3 className="text-sm font-bold text-foreground mb-3">Как рассчитывается?</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-foreground/80">
            <span>Доступно на счетах</span>
            <span className="font-tabular font-semibold">{formatAmount(activeBalance)} ₸</span>
          </div>
          <div className="flex justify-between text-alert-orange">
            <span>− Обязательства</span>
            <span className="font-tabular font-semibold">−{formatAmount(totalObligations)} ₸</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>− Цель сбережений</span>
            <span className="font-tabular font-semibold">−{formatAmount(savingsGoal)} ₸</span>
          </div>
          <div className="border-t border-border pt-2 flex justify-between text-foreground">
            <span>÷ Дней осталось</span>
            <span className="font-tabular font-semibold">{daysLeft} дн.</span>
          </div>
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-3 flex justify-between items-center mt-1">
            <span className="text-foreground font-medium">= Можно тратить в день</span>
            <span className="text-safe-green font-bold font-tabular text-lg">
              {formatAmount(safeToSpend)} ₸
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Today({ finance }: TodayProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const {
    state,
    safeToSpend,
    safeToSpendStatus,
    activeBalance,
    totalObligations,
    daysLeft,
    monthlyBudget,
    spentThisMonth,
    budgetRemaining,
    budgetStatus,
    monthProgress,
    addExpense,
  } = finance;

  const budgetColor =
    budgetStatus === "critical"
      ? "text-destructive"
      : budgetStatus === "warning"
      ? "text-alert-orange"
      : "text-safe-green";

  const recentExpenses = state.expenses.filter((e) => !e.isObligation).slice(0, 5);

  return (
    <div className="flex flex-col min-h-screen pb-24">
      {/* Hero section */}
      <div className="px-5 pt-10 pb-6 text-center">
        <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-3">
          Можешь потратить сегодня
        </p>
        <div className="flex items-end justify-center gap-2 mb-2">
          <span
            className={`safe-number font-tabular ${
              safeToSpendStatus === "deficit" ? "text-destructive" : "text-safe-green"
            }`}
          >
            <AnimatedNumber value={safeToSpend} />
          </span>
          <span className="text-4xl font-bold text-safe-green mb-1 opacity-80">₸</span>
        </div>
        <p className="text-xs text-muted-foreground font-tabular">
          ({formatAmount(activeBalance)} − {formatAmount(totalObligations)} − {formatAmount(state.savingsGoal)}) ÷ {daysLeft} дн.
        </p>
        <button
          onClick={() => setShowInfo(true)}
          className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <HelpCircle size={12} />
          Как считается?
        </button>
      </div>

      <div className="flex-1 px-4 space-y-3">
        {/* Month progress */}
        <div className="bg-card border border-border/60 rounded-2xl p-4 animate-fade-in-up">
          <div className="flex justify-between items-center mb-2.5">
            <span className="text-xs font-medium text-muted-foreground">Прогресс месяца</span>
            <span className="text-xs font-bold text-foreground">{monthProgress}%</span>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full animate-grow"
              style={{
                width: `${monthProgress}%`,
                background: "linear-gradient(90deg, hsl(162 100% 28%), hsl(162 100% 40%))",
              }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-muted-foreground">{monthProgress}% месяца пройдено</span>
            <span className="text-xs text-muted-foreground">{daysLeft} дней осталось</span>
          </div>
        </div>

        {/* Budget summary card */}
        <div className="bg-card border border-border/60 rounded-2xl p-4 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Бюджет месяца
          </h3>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground/80">Бюджет на месяц</span>
              <span className="font-bold font-tabular text-foreground">{formatAmount(monthlyBudget)} ₸</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground/80">Потрачено</span>
              <span className="font-semibold font-tabular text-alert-orange">
                {formatAmount(spentThisMonth)} ₸
              </span>
            </div>
            {/* Mini progress */}
            {monthlyBudget > 0 && (
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
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
            <div className="flex items-center justify-between pt-1 border-t border-border/60">
              <span className="text-sm font-medium text-foreground">Остаток бюджета</span>
              <span className={`font-bold font-tabular text-lg ${budgetColor}`}>
                <AnimatedNumber value={Math.max(0, budgetRemaining)} />
                {" "}₸
              </span>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-3 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          <div className="bg-card border border-border/60 rounded-2xl p-4">
            <div className="text-2xl mb-1">💳</div>
            <p className="text-xs text-muted-foreground mb-1">Обязательства</p>
            <p className="font-bold font-tabular text-alert-orange text-sm">{formatAmount(totalObligations)} ₸/мес</p>
          </div>
          <div className="bg-card border border-border/60 rounded-2xl p-4">
            <div className="text-2xl mb-1">💰</div>
            <p className="text-xs text-muted-foreground mb-1">Цель сбережений</p>
            <p className="font-bold font-tabular text-safe-green text-sm">{formatAmount(state.savingsGoal)} ₸</p>
          </div>
        </div>

        {/* Add expense button */}
        <button
          onClick={() => setModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 bg-safe-green text-primary-foreground font-bold text-base py-4 rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all animate-fade-in-up shadow-lg shadow-safe-green/20"
          style={{ animationDelay: "0.15s" }}
        >
          <Plus size={20} strokeWidth={2.5} />
          Добавить расход
        </button>

        {/* Recent expenses */}
        {recentExpenses.length > 0 && (
          <div className="animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
              Последние расходы
            </h3>
            <div className="space-y-2">
              {recentExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="bg-card border border-border/60 rounded-xl px-4 py-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                      <TrendingDown size={14} className="text-destructive" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{expense.account}</p>
                      <p className="text-xs text-muted-foreground">{expense.date}</p>
                    </div>
                  </div>
                  <span className="font-bold font-tabular text-alert-orange text-sm">
                    −{formatAmount(expense.amount)} ₸
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <AddExpenseModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={(amount, account, isObl, oblName) => {
          addExpense(amount, account, isObl, oblName);
          toast({ description: "✅ Расход добавлен", duration: 2000 });
        }}
        accounts={state.accounts}
        obligations={state.obligations}
      />

      {/* Info panel */}
      {showInfo && (
        <InfoPanel
          onClose={() => setShowInfo(false)}
          activeBalance={activeBalance}
          totalObligations={totalObligations}
          savingsGoal={state.savingsGoal}
          daysLeft={daysLeft}
          safeToSpend={safeToSpend}
        />
      )}
    </div>
  );
}
