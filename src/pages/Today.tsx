import { useState, useRef, useEffect } from "react";
import { HelpCircle, Plus, TrendingDown, TrendingUp, PiggyBank } from "lucide-react";
import { useFinance } from "@/hooks/useFinance";
import { formatAmount } from "@/lib/formatAmount";
import AddExpenseModal from "@/components/AddExpenseModal";
import AddIncomeModal from "@/components/AddIncomeModal";
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
      {formatAmount(Math.abs(display))}
    </span>
  );
}

function InfoPanel({ onClose, activeBalance, remainingObligations, stillNeedToSave, daysLeft, dailyBudget, spentToday, safeToSpend }: {
  onClose: () => void;
  activeBalance: number;
  remainingObligations: number;
  stillNeedToSave: number;
  daysLeft: number;
  dailyBudget: number;
  spentToday: number;
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
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-3 mt-1 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-foreground/80">= Дневной лимит</span>
              <span className="text-foreground font-semibold font-tabular">{formatAmount(dailyBudget)} ₸</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground/80">− Потрачено сегодня</span>
              <span className="text-alert-orange font-semibold font-tabular">{formatAmount(spentToday)} ₸</span>
            </div>
            <div className="flex justify-between items-center border-t border-border/60 pt-1.5">
              <span className="text-foreground font-medium">= Можно потратить</span>
              <span className="text-safe-green font-bold font-tabular text-lg">
                {safeToSpend >= 0 ? "" : "−"}{formatAmount(Math.abs(safeToSpend))} ₸
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Today({ finance }: TodayProps) {
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [incomeModalOpen, setIncomeModalOpen] = useState(false);
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
    spentToday,
    monthlyBudget,
    spentThisMonth,
    budgetRemaining,
    budgetStatus,
    monthProgress,
    alreadySaved,
    savingsProgress,
    addExpense,
    addIncome,
  } = finance;

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

  const recentExpenses = state.expenses.slice(0, 5);

  const heroLabel =
    safeToSpendStatus === "overspent"
      ? "ПРЕВЫШЕН ДНЕВНОЙ ЛИМИТ"
      : safeToSpendStatus === "warning"
      ? "ПОЧТИ ИСЧЕРПАН ЛИМИТ"
      : "МОЖЕШЬ ПОТРАТИТЬ СЕГОДНЯ";

  return (
    <div className="flex flex-col min-h-screen pb-24">
      {/* Hero section */}
      <div className="px-5 pt-10 pb-6 text-center">
        <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-3">
          {heroLabel}
        </p>
        <div className="flex items-end justify-center gap-2 mb-1">
          {safeToSpend < 0 && (
            <span className={`text-4xl font-bold mb-1 ${safeToSpendColor}`}>−</span>
          )}
          <span className={`safe-number font-tabular ${safeToSpendColor}`}>
            <AnimatedNumber value={Math.abs(safeToSpend)} />
          </span>
          <span className={`text-4xl font-bold mb-1 opacity-80 ${safeToSpendColor}`}>₸</span>
        </div>

        {/* Daily budget + spent today */}
        <div className="flex items-center justify-center gap-3 mt-2 text-xs text-muted-foreground font-tabular">
          <span>Лимит: <span className="text-foreground font-semibold">{formatAmount(dailyBudget)} ₸</span></span>
          <span className="text-muted-foreground/40">•</span>
          <span>Потрачено: <span className="text-alert-orange font-semibold">{formatAmount(spentToday)} ₸</span></span>
        </div>

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
              className="h-full rounded-full animate-grow transition-all duration-500"
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

        {/* Monthly budget card */}
        <div className="bg-card border border-border/60 rounded-2xl p-4 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
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
              <span className="text-sm font-medium text-foreground">Остаток</span>
              <span className={`font-bold font-tabular text-lg ${budgetColor}`}>
                <AnimatedNumber value={Math.max(0, budgetRemaining)} />
                {" "}₸
              </span>
            </div>
          </div>
        </div>

        {/* Savings progress card */}
        {state.savingsGoal > 0 && (
          <div className="bg-card border border-border/60 rounded-2xl p-4 animate-fade-in-up" style={{ animationDelay: "0.08s" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <PiggyBank size={14} className="text-safe-green" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Цель сбережений
                </h3>
              </div>
              <span className="text-xs font-bold text-safe-green">{savingsProgress}%</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-foreground/80">Уже отложено</span>
                <span className="font-bold font-tabular text-safe-green">{formatAmount(alreadySaved)} ₸</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${savingsProgress}%`,
                    background: "linear-gradient(90deg, hsl(162 100% 28%), hsl(162 100% 40%))",
                  }}
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-foreground/80">Цель</span>
                <span className="font-tabular text-muted-foreground">{formatAmount(state.savingsGoal)} ₸</span>
              </div>
            </div>
            <button
              onClick={() => {
                setExpenseModalOpen(true);
              }}
              className="mt-3 w-full py-2.5 rounded-xl border border-safe-green text-safe-green text-sm font-semibold hover:bg-safe-green/10 transition-colors"
            >
              Отложить сейчас
            </button>
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-2 animate-fade-in-up" style={{ animationDelay: "0.12s" }}>
          <button
            onClick={() => setExpenseModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 bg-alert-orange text-white font-bold text-base py-4 rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-alert-orange/20"
          >
            <TrendingDown size={20} strokeWidth={2.5} />
            + Добавить расход
          </button>
          <button
            onClick={() => setIncomeModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 font-bold text-base py-4 rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all border border-primary/40 text-primary bg-primary/10"
          >
            <TrendingUp size={20} strokeWidth={2.5} />
            + Добавить доход
          </button>
        </div>

        {/* Recent transactions */}
        {recentExpenses.length > 0 && (
          <div className="animate-fade-in-up" style={{ animationDelay: "0.16s" }}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
              Последние операции
            </h3>
            <div className="space-y-2">
              {recentExpenses.map((expense) => {
                const isIncome = expense.type === "income";
                const isSavings = expense.type === "savings";
                const isObligation = expense.type === "obligation";
                const label = isIncome
                  ? expense.note || "Доход"
                  : isSavings
                  ? "Сбережения"
                  : isObligation
                  ? (state.obligations.find((o) => o.id === expense.obligationId)?.name ?? "Обязательство")
                  : expense.account;

                return (
                  <div
                    key={expense.id}
                    className="bg-card border border-border/60 rounded-xl px-4 py-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isIncome ? "bg-income-blue/10" : isSavings ? "bg-safe-green/10" : "bg-destructive/10"
                      }`}>
                        {isIncome ? (
                          <TrendingUp size={14} className="text-income-blue" />
                        ) : isSavings ? (
                          <PiggyBank size={14} className="text-safe-green" />
                        ) : (
                          <TrendingDown size={14} className="text-destructive" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{label}</p>
                        <p className="text-xs text-muted-foreground">{expense.account} · {expense.date}</p>
                      </div>
                    </div>
                    <span className={`font-bold font-tabular text-sm ${
                      isIncome ? "text-income-blue" : isSavings ? "text-safe-green" : "text-alert-orange"
                    }`}>
                      {isIncome ? "+" : "−"}{formatAmount(expense.amount)} ₸
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Expense Modal */}
      <AddExpenseModal
        open={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        onSave={(amount, account, type, opts) => {
          addExpense(amount, account, type, opts);
          toast({ description: `✅ Расход добавлен: ${formatAmount(amount)} ₸`, duration: 2000 });
        }}
        accounts={state.accounts}
        obligations={state.obligations}
      />

      {/* Income Modal */}
      <AddIncomeModal
        open={incomeModalOpen}
        onClose={() => setIncomeModalOpen(false)}
        onSave={(amount, account, note) => {
          addIncome(amount, account, note);
          toast({ description: `💰 Доход добавлен: +${formatAmount(amount)} ₸`, duration: 2000 });
        }}
        accounts={state.accounts}
      />

      {/* Info panel */}
      {showInfo && (
        <InfoPanel
          onClose={() => setShowInfo(false)}
          activeBalance={activeBalance}
          remainingObligations={remainingObligations}
          stillNeedToSave={stillNeedToSave}
          daysLeft={daysLeft}
          dailyBudget={dailyBudget}
          spentToday={spentToday}
          safeToSpend={safeToSpend}
        />
      )}
    </div>
  );
}
