import { useState, useRef, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  X,
  Trash2,
  Check,
  ChevronRight as ChevronRightIcon,
  ChevronDown,
  AlertCircle,
} from "lucide-react";
import {
  useFinance,
  PlannedExpense,
  RecurrenceType,
  getPlansForMonth,
  isPlanPaidInMonth,
} from "@/hooks/useFinance";
import { formatAmount } from "@/lib/formatAmount";
import { toast } from "@/hooks/use-toast";
import MoneyInput from "@/components/MoneyInput";

interface PlansProps {
  finance: ReturnType<typeof useFinance>;
  onOverdueChange?: (hasOverdue: boolean) => void;
}

interface PlanRowProps {
  plan: PlannedExpense & { virtualDate: string };
  viewYear: number;
  viewMonth: number;
  todayStr: string;
  monthNames: string[];
  onEdit: (plan: PlannedExpense) => void;
  onDelete: (id: string) => void;
  onTogglePaid: (id: string) => void;
  isSwiped: boolean;
  onSetSwiped: (id: string | null) => void;
}

type PlansByDate = {
  date: string;
  items: (PlannedExpense & { virtualDate: string })[];
};

function PlanRow({
  plan,
  viewYear,
  viewMonth,
  todayStr,
  monthNames, // не используется, но пусть остаётся для совместимости пропсов
  onEdit,
  onDelete,
  onTogglePaid,
  isSwiped,
  onSetSwiped,
}: PlanRowProps) {
  const touchStartX = useRef(0);
  const isPaid = isPlanPaidInMonth(plan, viewYear, viewMonth);
  const isIncome = plan.type === "income";
  const isOverdue = !isPaid && plan.virtualDate < todayStr;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 60) onSetSwiped(plan.id);
    else if (diff < -30) onSetSwiped(null);
  };

  return (
    <div
      className={`relative overflow-hidden ${isPaid ? "opacity-40" : ""}`}
      style={isOverdue ? { background: "hsl(0 76% 61% / 0.06)" } : {}}
    >
      {isSwiped && (
        <button
          onClick={() => onDelete(plan.id)}
          className="absolute right-0 top-0 bottom-0 w-20 bg-destructive flex items-center justify-center animate-swipe-reveal rounded-r-[12px]"
        >
          <Trash2 size={18} className="text-white" />
        </button>
      )}
      <div
        className={`px-4 flex items-center justify-between transition-all duration-200 ${
          isSwiped ? "-translate-x-20" : "translate-x-0"
        }`}
        style={{
          transition: "transform 0.25s ease-out",
          minHeight: 52, // фиксированная высота строки
          height: 52,
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Левая часть: чекбокс + текст (одна строка) */}
        <div className="flex-1 flex items-center gap-3 min-w-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePaid(plan.id);
            }}
            className="flex-shrink-0"
          >
            <div
              className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
              style={{
                borderColor: isPaid
                  ? "hsl(162 100% 33%)"
                  : isOverdue
                  ? "hsl(0 76% 61%)"
                  : "hsl(0 0% 40%)",
                background: isPaid ? "hsl(162 100% 33%)" : "transparent",
              }}
            >
              {isPaid && (
                <Check size={12} className="text-white" strokeWidth={3} />
              )}
            </div>
          </button>

          <button
            className="flex-1 flex items-center gap-1.5 text-left active:scale-[0.98] transition-transform min-w-0"
            onClick={() => {
              if (isSwiped) {
                onSetSwiped(null);
                return;
              }
              onEdit(plan);
            }}
          >
            {/* Имя + recurrence/overdue в одну строку, с обрезкой */}
            <p
              className={`text-sm font-medium truncate ${
                isPaid ? "line-through text-muted-foreground" : "text-foreground"
              }`}
            >
              {plan.name}
            </p>

            {plan.recurrence && plan.recurrence !== "none" && (
              <span className="text-[10px] text-muted-foreground flex-shrink-0">
                {plan.recurrence === "monthly"
                  ? "· ежемесячно"
                  : "· ежегодно"}
              </span>
            )}

            {isOverdue && (
              <span
                className="text-[10px] flex-shrink-0"
                style={{ color: "hsl(0 76% 61%)" }}
              >
                · просрочено
              </span>
            )}
          </button>
        </div>

        {/* Правая часть: сумма + стрелка */}
        <button
          className="flex items-center gap-2 cursor-pointer flex-shrink-0"
          onClick={() => {
            if (isSwiped) {
              onSetSwiped(null);
              return;
            }
            onEdit(plan);
          }}
        >
          <span
            className="font-bold font-tabular text-sm"
            style={{
              color: isPaid
                ? "hsl(0 0% 50%)"
                : isOverdue
                ? "hsl(0 76% 61%)"
                : isIncome
                ? "hsl(162 100% 33%)"
                : "hsl(38 100% 52%)",
            }}
          >
            {isIncome ? "+" : "−"}
            {formatAmount(plan.amount)} ₸
          </span>
          <ChevronRightIcon
            size={14}
            className="text-muted-foreground flex-shrink-0"
          />
        </button>
      </div>
    </div>
  );
}

export default function Plans({ finance, onOverdueChange }: PlansProps) {
  const {
    state,
    addPlannedExpense,
    updatePlannedExpense,
    deletePlannedExpense,
    togglePlanPaidInMonth,
  } = finance;

  const plans = state.plannedExpenses || [];
  const todayStr = state.currentDate;

  const [monthOffset, setMonthOffset] = useState(0);
  const viewDate = new Date();
  viewDate.setMonth(viewDate.getMonth() + monthOffset);
  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  const monthNames = [
    "Январь",
    "Февраль",
    "Март",
    "Апрель",
    "Май",
    "Июнь",
    "Июль",
    "Август",
    "Сентябрь",
    "Октябрь",
    "Ноябрь",
    "Декабрь",
  ];

  const monthPlans = useMemo(
    () => getPlansForMonth(plans, viewYear, viewMonth),
    [plans, viewYear, viewMonth],
  );

  const { incomeForMonth, expensesForMonth } = useMemo(() => {
    const income = monthPlans
      .filter(
        (p) => p.type === "income" && !isPlanPaidInMonth(p, viewYear, viewMonth),
      )
      .reduce((sum, p) => sum + p.amount, 0);
    const expenses = monthPlans
      .filter(
        (p) => p.type === "expense" && !isPlanPaidInMonth(p, viewYear, viewMonth),
      )
      .reduce((sum, p) => sum + p.amount, 0);
    return { incomeForMonth: income, expensesForMonth: expenses };
  }, [monthPlans, viewYear, viewMonth]);

  const [swipedId, setSwipedId] = useState<string | null>(null);
  const [showPaid, setShowPaid] = useState(false);

  const unpaidPlans = useMemo(
    () =>
      monthPlans
        .filter((p) => !isPlanPaidInMonth(p, viewYear, viewMonth))
        .sort((a, b) => a.virtualDate.localeCompare(b.virtualDate)),
    [monthPlans, viewYear, viewMonth],
  );

  const paidPlans = useMemo(
    () =>
      monthPlans
        .filter((p) => isPlanPaidInMonth(p, viewYear, viewMonth))
        .sort((a, b) => a.virtualDate.localeCompare(b.virtualDate)),
    [monthPlans, viewYear, viewMonth],
  );

  const overdueCount = unpaidPlans.filter((p) => p.virtualDate < todayStr).length;

  useEffect(() => {
    onOverdueChange?.(overdueCount > 0);
  }, [overdueCount, onOverdueChange]);

  const unpaidByDate: PlansByDate[] = useMemo(() => {
    const map = new Map<string, (PlannedExpense & { virtualDate: string })[]>();
    for (const p of unpaidPlans) {
      const arr = map.get(p.virtualDate) || [];
      arr.push(p);
      map.set(p.virtualDate, arr);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, items]) => ({ date, items }));
  }, [unpaidPlans]);

  const paidByDate: PlansByDate[] = useMemo(() => {
    const map = new Map<string, (PlannedExpense & { virtualDate: string })[]>();
    for (const p of paidPlans) {
      const arr = map.get(p.virtualDate) || [];
      arr.push(p);
      map.set(p.virtualDate, arr);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, items]) => ({ date, items }));
  }, [paidPlans]);

  const [showAdd, setShowAdd] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlannedExpense | null>(null);
  const [planType, setPlanType] = useState<"expense" | "income">("expense");
  const [planName, setPlanName] = useState("");
  const [planAmount, setPlanAmount] = useState("");
  const [planDate, setPlanDate] = useState(todayStr);
  const [planRecurrence, setPlanRecurrence] =
    useState<RecurrenceType>("none");

  const openAdd = () => {
    setEditingPlan(null);
    setPlanType("expense");
    setPlanName("");
    setPlanAmount("");
    setPlanDate(todayStr);
    setPlanRecurrence("none");
    setShowAdd(true);
  };

  const openEdit = (plan: PlannedExpense) => {
    setEditingPlan(plan);
    setPlanType(plan.type);
    setPlanName(plan.name);
    setPlanAmount(Number(plan.amount).toLocaleString("ru-RU"));
    setPlanDate(plan.date);
    setPlanRecurrence(plan.recurrence || "none");
    setShowAdd(true);
  };

  const handleSave = () => {
    const amt =
      parseFloat(planAmount.replace(/\s/g, "").replace(/[^\d]/g, "")) || 0;
    if (!planName.trim() || !amt) return;
    if (editingPlan) {
      updatePlannedExpense(editingPlan.id, {
        type: planType,
        name: planName.trim(),
        amount: amt,
        date: planDate,
        recurring: planRecurrence !== "none",
        recurrence: planRecurrence,
      });
      toast({ description: "✅ План обновлён", duration: 2000 });
    } else {
      addPlannedExpense({
        type: planType,
        name: planName.trim(),
        amount: amt,
        date: planDate,
        recurring: planRecurrence !== "none",
        recurrence: planRecurrence,
        paidInMonths: [],
      });
      toast({ description: "✅ План добавлен", duration: 2000 });
    }
    setShowAdd(false);
  };

  const handleDeletePlan = (id: string) => {
    deletePlannedExpense(id);
    setSwipedId(null);
    toast({ description: "🗑 План удалён", duration: 2000 });
  };

  const recurrenceOptions: { value: RecurrenceType; label: string }[] = [
    { value: "none", label: "Не повторять" },
    { value: "monthly", label: "Каждый месяц" },
    { value: "yearly", label: "Каждый год" },
  ];

  const modal = showAdd ? (
    <div className="fixed inset-0 z-[999] flex items-end justify-center">
      <div
        className="absolute inset-0"
        style={{
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
        }}
        onClick={() => setShowAdd(false)}
      />
      <div className="relative w-full max-w-app glass-sheet rounded-t-[20px] modal-slide-up pb-8 maxHeight-[85vh] max-h-[85vh] overflow-y-auto">
        <div className="flex justify-center pt-3 pb-1">
          <div
            className="w-10 h-1 rounded-full"
            style={{ background: "hsl(0 0% 30%)" }}
          />
        </div>
        <div className="flex items-center justify-between px-5 pt-2 pb-3">
          <h2 className="text-lg font-bold text-foreground">
            {editingPlan ? "Редактировать план" : "Новый план"}
          </h2>
          <button
            onClick={() => setShowAdd(false)}
            className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground"
            style={{ background: "hsl(0 0% 23%)" }}
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Тип
            </label>
            <div className="flex gap-2">
              {(
                [
                  { value: "expense" as const, label: "Расход" },
                  { value: "income" as const, label: "Доход" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPlanType(opt.value)}
                  className="flex-1 py-2.5 rounded-[10px] text-sm font-semibold transition-all"
                  style={{
                    background:
                      planType === opt.value
                        ? opt.value === "income"
                          ? "hsl(162 100% 33% / 0.15)"
                          : "hsl(38 100% 52% / 0.15)"
                        : "hsl(0 0% 18%)",
                    color:
                      planType === opt.value
                        ? opt.value === "income"
                          ? "hsl(162 100% 33%)"
                          : "hsl(38 100% 52%)"
                        : "hsl(0 0% 60%)",
                    boxShadow:
                      planType === opt.value
                        ? `inset 0 0 0 1.5px ${
                            opt.value === "income"
                              ? "hsl(162 100% 33%)"
                              : "hsl(38 100% 52%)"
                          }`
                        : "none",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Название
            </label>
            <input
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              placeholder="Зарплата / Аренда"
              className="w-full glass-input px-4 py-3 text-sm placeholder:text-muted-foreground/40 focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Сумма
            </label>
            <div className="relative">
              <MoneyInput
                value={planAmount}
                onChange={setPlanAmount}
                placeholder="0"
                className="w-full glass-input px-4 py-3 text-xl font-bold font-tabular placeholder:text-muted-foreground/40 focus:outline-none pr-8"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-bold text-muted-foreground">
                ₸
              </span>
            </div>
          </div>
                    <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Дата
            </label>
            <input
              type="date"
              value={planDate}
              onChange={(e) => setPlanDate(e.target.value)}
              className="block w-full glass-input px-3 py-3 text-sm text-foreground focus:outline-none"
              style={{
                minWidth: 0,
                boxSizing: "border-box",
                WebkitAppearance: "none",
              }}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Повторять
            </label>
            <select
              value={planRecurrence}
              onChange={(e) =>
                setPlanRecurrence(e.target.value as RecurrenceType)
              }
              className="w-full glass-input px-4 py-3 text-sm text-foreground focus:outline-none appearance-none"
              style={{
                background: "hsl(0 0% 18%)",
                borderRadius: "10px",
                border: "1px solid hsl(0 0% 25%)",
              }}
            >
              {recurrenceOptions.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  style={{ background: "hsl(0 0% 12%)" }}
                >
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setShowAdd(false)}
              className="flex-1 py-3 rounded-[10px] text-sm font-semibold text-foreground"
              style={{ background: "hsl(0 0% 23%)" }}
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-3 rounded-[10px] text-sm font-bold text-white"
              style={{ background: "hsl(162 100% 33%)" }}
            >
              Сохранить
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="flex flex-col min-h-screen pb-52">
      <div className="px-5 pt-10 pb-4">
        <h1 className="text-2xl font-bold text-foreground">Планы</h1>
      </div>

      <div className="flex-1 px-4 space-y-4">
        {/* Summary */}
        <div className="flex gap-3">
          <div
            className="flex-1 rounded-[16px] p-4 flex flex-col gap-1"
            style={{
              background: "hsl(162 100% 33% / 0.1)",
              border: "1px solid hsl(162 100% 33% / 0.25)",
            }}
          >
            <span
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: "hsl(162 100% 33% / 0.7)" }}
            >
              Запланированные доходы
            </span>
            <span
              className="text-2xl font-bold font-tabular"
              style={{ color: "hsl(162 100% 33%)" }}
            >
              +{formatAmount(incomeForMonth)} ₸
            </span>
          </div>
          <div
            className="flex-1 rounded-[16px] p-4 flex flex-col gap-1"
            style={{
              background: "hsl(38 100% 52% / 0.1)",
              border: "1px solid hsl(38 100% 52% / 0.25)",
            }}
          >
            <span
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: "hsl(38 100% 52% / 0.7)" }}
            >
              Ожидаемые расходы
            </span>
            <span
              className="text-2xl font-bold font-tabular"
              style={{ color: "hsl(38 100% 52%)" }}
            >
              −{formatAmount(expensesForMonth)} ₸
            </span>
          </div>
        </div>

        {/* Overdue banner */}
        {overdueCount > 0 && (
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-[12px]"
            style={{
              background: "hsl(0 76% 61% / 0.1)",
              border: "1px solid hsl(0 76% 61% / 0.3)",
            }}
          >
            <AlertCircle
              size={14}
              style={{ color: "hsl(0 76% 61%)", flexShrink: 0 }}
            />
            <p
              className="text-xs font-medium"
              style={{ color: "hsl(0 76% 61%)" }}
            >
              {overdueCount}{" "}
              {overdueCount === 1
                ? "позиция просрочена"
                : overdueCount < 5
                ? "позиции просрочены"
                : "позиций просрочено"}{" "}
              — закройте или измените дату
            </p>
          </div>
        )}

      {/* Unpaid list grouped by date */}
      {unpaidByDate.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider px-1 text-muted-foreground">
            Запланировано
          </h3>

          {unpaidByDate.map(({ date, items }) => {
            const d = new Date(date);
            const dayLabel = `${d.getDate()} ${monthNames[d.getMonth()]
              .toLowerCase()
              .slice(0, 3)}`;
            const isTodayGroup = date === todayStr;

            return (
              <div
                key={date}
                className="glass-card rounded-[16px] overflow-hidden"
              >
                <div className="flex">
                  {/* Левая колонка с датой — как раньше, но внутри карточки */}
                  <div className="w-[64px] flex items-center justify-center border-r border-white/5 py-3">
                    <span
                      className="text-xs font-bold text-center"
                      style={{
                        color: isTodayGroup
                          ? "hsl(162 100% 33%)"
                          : "hsl(0 0% 50%)",
                      }}
                    >
                      {dayLabel}
                    </span>
                  </div>

                  {/* Правая колонка — все планы этого дня */}
                  <div className="flex-1">
                    {items.map((plan, idx) => (
                      <div
                        key={`${plan.id}-${plan.virtualDate}-${idx}`}
                        className={idx > 0 ? "border-t border-white/5" : ""}
                      >
                        <PlanRow
                          plan={plan}
                          viewYear={viewYear}
                          viewMonth={viewMonth}
                          todayStr={todayStr}
                          monthNames={monthNames}
                          onEdit={openEdit}
                          onDelete={handleDeletePlan}
                          onTogglePaid={(id) =>
                            togglePlanPaidInMonth(id, viewYear, viewMonth)
                          }
                          isSwiped={swipedId === plan.id}
                          onSetSwiped={setSwipedId}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

        {/* Add button */}
        <button
          onClick={openAdd}
          className="w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-safe-green py-3 rounded-[12px] text-sm font-semibold transition-colors"
          style={{ background: "hsl(0 0% 5%)" }}
        >
          <Plus size={16} /> Добавить план
        </button>

        {/* Empty state */}
        {unpaidPlans.length === 0 && paidPlans.length === 0 && (
          <div className="glass-card p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Нет планов на этот месяц
            </p>
          </div>
        )}

        {/* Paid — collapsible, тоже сгруппировано по дате */}
        {paidByDate.length > 0 && (
          <div>
            <button
              onClick={() => setShowPaid((v) => !v)}
              className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-2"
            >
              {showPaid ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRightIcon size={14} />
              )}
              Выполнено (
              {paidPlans.length}
              )
            </button>
            {showPaid && (
              <div className="space-y-3">
  {paidByDate.map(({ date, items }) => {
    const d = new Date(date);
    const dayLabel = `${d.getDate()} ${monthNames[d.getMonth()]
      .toLowerCase()
      .slice(0, 3)}`;
    const isTodayGroup = date === todayStr;

    return (
      <div
        key={date}
                    className="glass-card rounded-[16px] overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
                      <span
                        className="text-xs font-bold"
                        style={{
                          color: isTodayGroup
                            ? "hsl(162 100% 33%)"
                            : "hsl(0 0% 70%)",
                        }}
                      >
                        {dayLabel}
                      </span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        Выполнено
                      </span>
                    </div>

                    <div className="divide-y divide-white/5">
                      {items.map((plan, idx) => (
                        <PlanRow
                          key={`${plan.id}-${plan.virtualDate}-${idx}`}
                          plan={plan}
                          viewYear={viewYear}
                          viewMonth={viewMonth}
                          todayStr={todayStr}
                          monthNames={monthNames}
                          onEdit={openEdit}
                          onDelete={handleDeletePlan}
                          onTogglePaid={(id) =>
                            togglePlanPaidInMonth(id, viewYear, viewMonth)
                          }
                          isSwiped={swipedId === plan.id}
                          onSetSwiped={setSwipedId}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </div>
        )}
      </div>

      {/* Month selector */}
      <div className="fixed bottom-28 left-0 right-0 z-20 px-4">
        <div className="glass-card px-4 py-2 flex items-center justify-between rounded-[16px]">
          <button
            onClick={() => setMonthOffset((m) => m - 1)}
            className="p-2 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-s font-semibold text-foreground">
            {monthNames[viewMonth]} {viewYear}
          </span>
          <button
            onClick={() => setMonthOffset((m) => m + 1)}
            className="p-2 text-muted-foreground hover:text-foreground"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {createPortal(modal, document.body)}
    </div>
  );
}
