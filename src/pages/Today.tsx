import { useState, useRef, useEffect, useMemo, memo } from "react";
import {
  HelpCircle,
  Plus,
  TrendingDown,
  TrendingUp,
  ArrowRightLeft,
  Trash2,
  ChevronRight,
} from "lucide-react";
import { useFinance, Expense } from "@/hooks/useFinance";
import { formatAmount } from "@/lib/formatAmount";
import BudgetDiscipline from "@/components/BudgetDiscipline";
import SavingsCarousel from "@/components/SavingsCarousel";
import { toast } from "@/hooks/use-toast";
import { useStreak } from "@/hooks/usestreak";

interface TodayProps {
  finance: ReturnType<typeof useFinance>;
  onShowHistory: () => void;
  onOpenSheet: (expense?: Expense) => void;
}

function AnimatedNumber({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
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
  effectiveDailyBudget,
  spentToday,
  safeToSpend,
  upcomingPlannedIncome,
  upcomingPlannedExpenses,
  includePlans,
  onTogglePlans,
}: {
  onClose: () => void;
  activeBalance: number;
  remainingObligations: number;
  stillNeedToSave: number;
  daysLeft: number;
  dailyBudget: number;
  effectiveDailyBudget: number;
  spentToday: number;
  safeToSpend: number;
  upcomingPlannedIncome: number;
  upcomingPlannedExpenses: number;
  includePlans: boolean;
  onTogglePlans: () => void;
}) {
  useEffect(() => {
    document.body.classList.add("popup-open");
    return () => document.body.classList.remove("popup-open");
  }, []);

  const netPlans = upcomingPlannedIncome - upcomingPlannedExpenses;

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col"
      onClick={onClose}
    >
      <div className="absolute inset-0 glass-overlay" />

      <div
        className="relative mt-auto w-full max-w-app mx-auto glass-sheet rounded-t-[20px] modal-slide-up px-4 pt-4"
        // больше «подушки» снизу, чтобы не упираться в навбар
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 140px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center mb-4">
          <div
            className="w-10 h-1 rounded-full"
            style={{ background: "hsl(0 0% 30%)" }}
          />
        </div>

        <h3 className="text-lg font-bold text-foreground mb-3">
          Как рассчитывается?
        </h3>

        <div className="space-y-4 text-sm">
          <div className="flex justify-between text-foreground/80">
            <span>Доступно на счетах</span>
            <span className="font-tabular font-semibold">
              {formatAmount(activeBalance)} ₸
            </span>
          </div>

          <div className="flex justify-between text-alert-orange">
            <span>− Неоплаченные обязательства</span>
            <span className="font-tabular font-semibold">
              −{formatAmount(remainingObligations)} ₸
            </span>
          </div>

          <div className="flex justify-between text-muted-foreground">
            <span>− Осталось сберечь</span>
            <span className="font-tabular font-semibold">
              −{formatAmount(stillNeedToSave)} ₸
            </span>
          </div>

          {/* Блок с планами */}
          <div
            className="rounded-[12px] p-3 mt-1 space-y-3"
            style={{
              background: "hsl(0 0% 18%)",
              opacity: includePlans ? 1 : 0.45, // серим весь блок, если выкл
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground">
                  Планы до конца периода
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Включать ли их в расчёт «Можешь потратить»
                </p>
              </div>

              <button
                onClick={onTogglePlans}
                className="relative flex-shrink-0"
                style={{
                  width: 51,
                  height: 31,
                  borderRadius: 31,
                }}
              >
                <div
                  className="absolute inset-0 rounded-full transition-colors duration-300"
                  style={{
                    background: includePlans
                      ? "hsl(162 100% 33%)"
                      : "hsl(0 0% 23%)",
                  }}
                />
                <div
                  className="absolute rounded-full bg-white"
                  style={{
                    top: 2,
                    left: 2,
                    width: 27,
                    height: 27,
                    boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                    transition:
                      "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    transform: includePlans
                      ? "translateX(20px)"
                      : "translateX(0px)",
                  }}
                />
              </button>
            </div>

            <div className="flex justify-between text-safe-green">
              <span>+ Планируемый доход</span>
              <span className="font-tabular font-semibold">
                +{formatAmount(upcomingPlannedIncome)} ₸
              </span>
            </div>

            <div className="flex justify-between text-alert-orange">
              <span>− Планируемые расходы</span>
              <span className="font-tabular font-semibold">
                −{formatAmount(upcomingPlannedExpenses)} ₸
              </span>
            </div>

            <div className="flex justify-between border-t border-white/5 pt-2 text-foreground/90">
              <span>= Чистый эффект планов</span>
              <span className="font-tabular font-semibold">
                {netPlans >= 0 ? "+" : "−"}
                {formatAmount(Math.abs(netPlans))} ₸
              </span>
            </div>
          </div>

          <div className="border-t border-white/5 pt-4 flex justify-between text-foreground">
            <span>÷ Дней осталось</span>
            <span className="font-tabular font-semibold">
              {daysLeft} дн.
            </span>
          </div>

          <div
            className="rounded-[12px] p-3 mt-1 space-y-4"
            style={{ background: "hsl(0 0% 18%)" }}
          >
            <div className="flex justify-between">
              <span className="text-foreground/80">
                = Дневной лимит{includePlans ? " с учётом планов" : ""}
              </span>
              <span className="text-foreground font-semibold font-tabular">
                {formatAmount(
                  includePlans ? effectiveDailyBudget : dailyBudget
                )}{" "}
                ₸
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-foreground/80">− Потрачено сегодня</span>
              <span className="text-alert-orange font-semibold font-tabular">
                {formatAmount(spentToday)} ₸
              </span>
            </div>

            <div className="flex justify-between items-center border-t border-white/5 pt-1.5">
              <span className="text-foreground font-medium">
                = Можно потратить
              </span>
              <span className="text-safe-green font-bold font-tabular text-lg">
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
  const color = isIncome
    ? "text-safe-green"
    : isTransfer
    ? "text-income-blue"
    : "text-alert-orange";
  const bgColor = isIncome
    ? "bg-safe-green/15"
    : isTransfer
    ? "bg-income-blue/15"
    : "bg-alert-orange/15";

  return (
    <div className="relative overflow-hidden rounded-[12px]">
      {swiped && (
        <button
          onClick={() => onDelete(expense.id)}
          className="absolute right-0 top-0 bottom-0 w-20 bg-destructive flex items-center justify-center animate-swipe-reveal rounded-r-[12px]"
        >
          <Trash2 size={18} className="text-white" />
        </button>
      )}
      <div
        className={`glass-card px-4 py-3 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all duration-200 ${
          swiped ? "-translate-x-20" : "translate-x-0"
        }`}
        style={{ transition: "transform 0.25s ease-out" }}
        onClick={() => !swiped && onEdit(expense)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${bgColor}`}
          >
            <Icon size={14} className={color} />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground">
              {expense.account}
            </p>
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

function StreakInfoPanel({ streakCount, onClose }: { streakCount: number; onClose: () => void }) {
  useEffect(() => {
    document.body.classList.add("popup-open");
    return () => document.body.classList.remove("popup-open");
  }, []);

  const isOnTrack = streakCount > 0;

  return (
    <div className="fixed inset-0 z-40 flex flex-col" onClick={onClose}>
      <div className="absolute inset-0 glass-overlay" />
      <div
        className="relative mt-auto w-full max-w-app mx-auto glass-sheet rounded-t-[20px] modal-slide-up px-5 pt-4"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 40px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 rounded-full" style={{ background: "hsl(0 0% 30%)" }} />
        </div>

        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🔥</div>
          <div
            className="text-4xl font-bold font-tabular"
            style={{ color: isOnTrack ? "hsl(162 100% 45%)" : "hsl(0 0% 50%)" }}
          >
            {streakCount}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {streakCount === 1 ? "день подряд" : streakCount >= 2 && streakCount <= 4 ? "дня подряд" : "дней подряд"}
          </div>
        </div>

        <div className="glass-card rounded-[16px] p-4 mb-4 space-y-2">
          <p className="text-sm font-semibold text-foreground">
            {streakCount === 0
              ? "Начни сегодня 💪"
              : streakCount < 3
              ? "Хорошее начало!"
              : streakCount < 7
              ? "Ты в ритме!"
              : streakCount < 14
              ? "Неделя контроля — это уже привычка 🎯"
              : streakCount < 30
              ? "Две недели — это серьёзно! 🏆"
              : "Ты машина финансовой дисциплины 🚀"}
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {streakCount === 0
              ? "Стрик растёт каждый день, когда ты укладываешься в дневной лимит или просто заходишь в приложение."
              : "Стрик продолжается каждый день, когда ты не превышаешь дневной лимит."}
          </p>
        </div>

        <div className="glass-card rounded-[16px] p-4 space-y-3 mb-20">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Как начисляется стрик
          </p>
          {[
            { icon: "✅", text: "Уложился в дневной лимит" },
            { icon: "✅", text: "Зашёл в приложение и ничего не потратил" },
            { icon: "❌", text: "Превысил дневной лимит — стрик сбрасывается" },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="text-base flex-shrink-0">{item.icon}</span>
              <p className="text-sm text-foreground/80">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Today({
  finance,
  onShowHistory,
  onOpenSheet,
}: TodayProps) {
  const [showInfo, setShowInfo] = useState(false);
  const [showStreakInfo, setShowStreakInfo] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

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
    spentToday,
    upcomingPlannedIncome,
    upcomingPlannedExpenses,
    savingsAccounts,
    getSavingsForAccount,
    deleteExpense,
    updateSettings,
  } = finance;

  const { streak, days: disciplineDays } = useStreak({
    expenses: state.expenses,
    dailyBudget,
    activeBalance,
    remainingObligations,
    stillNeedToSave,
    lastOpenedDates: state.lastOpenedDates ?? [],
    dayHistory: state.dayHistory ?? {},
    weekOffset,
  });

  const streakCount = streak;
  const isOnTrack = streakCount > 0;

  const includePlans = state.includePlansInCalculation ?? true;

  const safeToSpendColor =
    safeToSpendStatus === "overspent"
      ? "text-destructive"
      : safeToSpendStatus === "warning"
      ? "text-alert-orange"
      : "text-safe-green";

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

  const displayAmount = Math.max(0, safeToSpend);
  const isOverspent = safeToSpend < 0;
  const overspendAmount = Math.abs(safeToSpend);

  const heroLabel =
    isOverspent
      ? "Лимит исчерпан"
      : safeToSpendStatus === "warning"
      ? "Лимит почти исчерпан"
      : "Можешь потратить";

  return (
    <div className="flex flex-col min-h-screen pb-40">
      {/* Header + hero */}
      <div className="px-4 pt-5 pb-2">
        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <h1 className="text-4xl font-bold tracking-tight text-white px-2">
              Sanda
            </h1>
          </div>

          {/* Streak badge */}
          <button
            onClick={() => setShowStreakInfo(true)}
            className="flex items-center gap-1.5 px-2.5 py-3 rounded-full active:scale-95 transition-transform"
            style={{
              background:
                streakCount > 0
                  ? isOnTrack
                    ? "rgba(22,163,74,0.18)"
                    : "rgba(220,38,38,0.12)"
                  : "rgba(140, 146, 172,0.18)",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <span className="text-base leading-none">🔥</span>
            <span
              className="font-bold leading-none"
              style={{
                fontSize: 14,
                color:
                  streakCount > 0
                    ? isOnTrack ? "#bbf7d0" : "#fecaca"
                    : "#9ca3af",
              }}
            >
              {streakCount}
            </span>
            <span
              className="font-medium leading-none"
              style={{
                fontSize: 11,
                color:
                  streakCount > 0
                    ? isOnTrack ? "#bbf7d0" : "#fecaca"
                    : "#9ca3af",
              }}
            >
              {streakCount === 1 ? "день" : streakCount >= 2 && streakCount <= 4 ? "дня" : "дней"}
            </span>
          </button>
        </div>

        {/* Hero: сначала дисциплина, потом карточка */}
        <div className="pt-4">
          <BudgetDiscipline
            days={disciplineDays}
            weekOffset={weekOffset}
            onWeekOffsetChange={setWeekOffset}
          />

          {/* Карточка hero */}
          <div className="mt-3 glass-card rounded-[20px] px-4 py-8">
            <div className="text-center">
              <button
                onClick={() => setShowInfo(true)}
                className="inline-flex items-center justify-center gap-1 mb-2 text-white/80 hover:text-white transition-colors active:scale-[0.98]"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                <span className="text-xs font-semibold tracking-widest uppercase">
                  {heroLabel}
                </span>
                <HelpCircle size={12} />
              </button>

              <div className="flex items-end justify-center gap-2 mb-3">
                <span
                  className={`safe-number font-tabular ${
                    isOverspent ? "text-destructive" : safeToSpendColor
                  }`}
                >
                  <AnimatedNumber value={displayAmount} />
                </span>
                <span
                  className={`text-4xl font-bold mb-1 opacity-80 ${
                    isOverspent ? "text-destructive" : safeToSpendColor
                  }`}
                >
                  ₸
                </span>
              </div>

              {isOverspent && (
                <p className="text-sm font-semibold text-alert-orange mt-1 animate-fade-in-up">
                  Перерасход: {formatAmount(overspendAmount)} ₸
                </p>
              )}

              <div className="flex items-center justify-center gap-3 mt-2 text-xs text-muted-foreground font-tabular">
                <span>
                  Лимит:{" "}
                  <span className="text-foreground font-semibold">
                    {formatAmount(effectiveDailyBudget)} ₸
                  </span>
                </span>
                <span style={{ opacity: 0.3 }}>•</span>
                <span>
                  Потрачено:{" "}
                  <span className="text-alert-orange font-semibold">
                    {formatAmount(spentToday)} ₸
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 space-y-10 mt-2">
        {(savingsAccounts.length > 0 || state.obligations.length > 0) && (
          <SavingsCarousel
            savingsAccounts={savingsAccounts}
            getSavingsForAccount={getSavingsForAccount}
            obligations={state.obligations}
          />
        )}

        {recentExpenses.length > 0 && (
          <div
            className="animate-fade-in-up"
            style={{ animationDelay: "0.12s" }}
          >
            <h3 className="text-lg font-semibold tracking-wider text-white mb-4 px-1">
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
                      <span className="text-xs text-muted-foreground">
                        {date}
                      </span>
                      <span
                        className={`text-xs font-bold font-tabular ${
                          dayTotal >= 0
                            ? "text-safe-green"
                            : "text-alert-orange"
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
                          expense.type === "transfer" ||
                          expense.type === "savings";
                        const isObligation = expense.type === "obligation";

                        const label = isIncome
                          ? expense.note || "Доход"
                          : isTransfer
                          ? expense.toAccount
                            ? `→ ${expense.toAccount}`
                            : expense.note || "Перевод"
                          : isObligation
                          ? state.obligations.find(
                              (o) => o.id === expense.obligationId
                            )?.name ?? expense.note ?? "Обязательство"
                          : expense.note || "Расход";

                        return (
                          <TransactionRow
                            key={expense.id}
                            expense={expense}
                            label={label}
                            onDelete={(id) => {
                              deleteExpense(id);
                              toast({
                                description: "🗑 Операция удалена",
                                duration: 2000,
                              });
                            }}
                            onEdit={(exp) => {
                              onOpenSheet(exp);
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
              className="w-full flex items-center justify-center gap-2 py-3 mt-3 rounded-[12px] text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
              style={{ background: "hsl(0 0% 6%)" }}
            >
              Показать всю историю <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {showInfo && (
        <InfoPanel
          onClose={() => setShowInfo(false)}
          activeBalance={activeBalance}
          remainingObligations={remainingObligations}
          stillNeedToSave={stillNeedToSave}
          daysLeft={daysLeft}
          dailyBudget={dailyBudget}
          effectiveDailyBudget={effectiveDailyBudget}
          spentToday={spentToday}
          safeToSpend={safeToSpend}
          upcomingPlannedIncome={upcomingPlannedIncome}
          upcomingPlannedExpenses={upcomingPlannedExpenses}
          includePlans={includePlans}
          onTogglePlans={() =>
            updateSettings({
              includePlansInCalculation: !includePlans,
            })
          }
        />
      )}

      {showStreakInfo && (
        <StreakInfoPanel
          streakCount={streakCount}
          onClose={() => setShowStreakInfo(false)}
        />
      )}
    </div>
  );
}

export function TodayFAB({
  onClick,
  isOpen,
}: {
  onClick: () => void;
  isOpen: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-28 left-1/2 -translate-x-1/2 z-30 w-16 h-16 rounded-full flex items-center justify-center active:scale-90 transition-all duration-200"
      style={{
        background: "hsl(162 100% 33%)",
        boxShadow: "0 4px 16px rgba(0, 166, 118, 0.4)",
      }}
    >
      <Plus
        size={28}
        strokeWidth={2.5}
        className="text-white transition-transform duration-300"
        style={{ transform: isOpen ? "rotate(45deg)" : "rotate(0deg)" }}
      />
    </button>
  );
}
