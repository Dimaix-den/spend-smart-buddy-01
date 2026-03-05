import { useState, useMemo } from "react";
import { Plus, ChevronLeft, ChevronRight, X, Trash2 } from "lucide-react";
import { useFinance, PlannedExpense } from "@/hooks/useFinance";
import { formatAmount } from "@/lib/formatAmount";
import { toast } from "@/hooks/use-toast";
import MoneyInput from "@/components/MoneyInput";

interface PlansProps {
  finance: ReturnType<typeof useFinance>;
}

export default function Plans({ finance }: PlansProps) {
  const {
    state,
    addPlannedExpense,
    updatePlannedExpense,
    deletePlannedExpense,
  } = finance;

  const plans = state.plannedExpenses || [];
  const todayStr = state.currentDate;

  // Month navigation
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

  // Filter plans for this month
  const monthPlans = useMemo(() => {
    return plans
      .filter((p) => {
        const d = new Date(p.date);
        return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [plans, viewYear, viewMonth]);

  // Monthly income / expenses only for current month
  const { incomeForMonth, expensesForMonth } = useMemo(() => {
    const income = monthPlans
      .filter((p) => p.type === "income")
      .reduce((sum, p) => sum + p.amount, 0);

    const expenses = monthPlans
      .filter((p) => p.type === "expense")
      .reduce((sum, p) => sum + p.amount, 0);

    return { incomeForMonth: income, expensesForMonth: expenses };
  }, [monthPlans]);

  // Add modal
  const [showAdd, setShowAdd] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlannedExpense | null>(null);
  const [planType, setPlanType] = useState<"expense" | "income">("expense");
  const [planName, setPlanName] = useState("");
  const [planAmount, setPlanAmount] = useState("");
  const [planDate, setPlanDate] = useState(todayStr);
  const [planRecurring, setPlanRecurring] = useState(false);

  const openAdd = () => {
    setEditingPlan(null);
    setPlanType("expense");
    setPlanName("");
    setPlanAmount("");
    setPlanDate(todayStr);
    setPlanRecurring(false);
    setShowAdd(true);
  };

  const openEdit = (plan: PlannedExpense) => {
    setEditingPlan(plan);
    setPlanType(plan.type);
    setPlanName(plan.name);
    setPlanAmount(plan.amount.toString());
    setPlanDate(plan.date);
    setPlanRecurring(plan.recurring);
    setShowAdd(true);
  };

  const handleSave = () => {
    const amt = parseFloat(planAmount) || 0;
    if (!planName.trim() || !amt) return;

    if (editingPlan) {
      updatePlannedExpense(editingPlan.id, {
        type: planType,
        name: planName.trim(),
        amount: amt,
        date: planDate,
        recurring: planRecurring,
      });
      toast({ description: "✅ План обновлён", duration: 2000 });
    } else {
      addPlannedExpense({
        type: planType,
        name: planName.trim(),
        amount: amt,
        date: planDate,
        recurring: planRecurring,
      });
      toast({ description: "✅ План добавлен", duration: 2000 });
    }
    setShowAdd(false);
  };

  const handleDeletePlan = (id: string) => {
    deletePlannedExpense(id);
    toast({ description: "🗑 План удалён", duration: 2000 });
  };

  return (
    <div className="flex flex-col min-h-screen pb-32">
      {/* Header */}
      <div className="px-5 pt-10 pb-4">
        <h1 className="text-2xl font-bold text-foreground">Планы</h1>
      </div>

      <div className="flex-1 px-4 space-y-4">
        {/* Итого за месяц */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
            Итого за месяц
          </h2>
          <div className="glass-card p-4 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Ожидаемые доходы</span>
              <span className="text-safe-green font-semibold font-tabular">
                +{formatAmount(incomeForMonth)} ₸
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Ожидаемые расходы</span>
              <span className="text-alert-orange font-semibold font-tabular">
                −{formatAmount(expensesForMonth)} ₸
              </span>
            </div>
          </div>
        </div>

        {/* Upcoming plans */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
            Предстоящие
          </h2>

          {monthPlans.length === 0 ? (
            <div className="glass-card p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Нет планов на этот месяц
              </p>
            </div>
          ) : (
            <div className="glass-card overflow-hidden">
              {monthPlans.map((plan, i) => {
                const d = new Date(plan.date);
                const dayLabel = `${d.getDate()} ${monthNames[d.getMonth()]
                  .toLowerCase()
                  .slice(0, 3)}`;
                const isPast = plan.date < todayStr;
                const isToday = plan.date === todayStr;
                const isIncome = plan.type === "income";

                return (
                  <div
                    key={plan.id}
                    className={`px-4 py-3 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform ${
                      i < monthPlans.length - 1
                        ? "border-b border-white/5"
                        : ""
                    } ${isPast ? "opacity-50" : ""}`}
                    onClick={() => openEdit(plan)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-center min-w-[40px]">
                        <span
                          className={`text-xs font-bold ${
                            isToday
                              ? "text-safe-green"
                              : "text-muted-foreground"
                          }`}
                        >
                          {dayLabel}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {plan.name}
                        </p>
                        {plan.recurring && (
                          <p className="text-[10px] text-muted-foreground">
                            Ежемесячно
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-bold font-tabular text-sm ${
                          isIncome ? "text-safe-green" : "text-alert-orange"
                        }`}
                      >
                        {isIncome ? "+" : "−"}
                        {formatAmount(plan.amount)} ₸
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePlan(plan.id);
                        }}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add button */}
        <button
          onClick={openAdd}
          className="w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-safe-green py-3 rounded-[12px] text-sm font-semibold transition-colors"
          style={{ background: "hsl(0 0% 11%)" }}
        >
          <Plus size={16} /> Добавить план
        </button>
      </div>

      {/* Month selector fixed at bottom */}
      <div className="fixed bottom-24 left-0 right-0 z-20 px-4">
        <div className="glass-card px-4 py-2 flex items-center justify-between rounded-[16px]">
          <button
            onClick={() => setMonthOffset((m) => m - 1)}
            className="p-2 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-xs font-semibold text-foreground">
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

      {/* Add/Edit Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 glass-overlay"
            onClick={() => setShowAdd(false)}
          />
          <div className="relative w-full max-w-app glass-sheet rounded-t-[20px] modal-slide-up pb-8 max-h-[85vh] overflow-y-auto">
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
              {/* Type */}
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

              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Название
                </label>
                <input
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="Зарплата / День рождения"
                  className="w-full glass-input px-4 py-3 text-sm placeholder:text-muted-foreground/40 focus:outline-none"
                />
              </div>

              {/* Amount */}
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

              {/* Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Дата
                </label>
                <input
                  type="date"
                  value={planDate}
                  onChange={(e) => setPlanDate(e.target.value)}
                  className="w-full glass-input px-4 py-3 text-sm text-foreground focus:outline-none"
                />
              </div>

              {/* Recurring */}
              <button
                onClick={() => setPlanRecurring(!planRecurring)}
                className="flex items-center gap-3 w-full text-left"
              >
                <div
                  className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0"
                  style={{
                    borderColor: planRecurring
                      ? "hsl(162 100% 33%)"
                      : "hsl(0 0% 40%)",
                    background: planRecurring
                      ? "hsl(162 100% 33%)"
                      : "transparent",
                  }}
                >
                  {planRecurring && (
                    <span className="text-white text-xs font-bold">✓</span>
                  )}
                </div>
                <span className="text-sm text-foreground">
                  Повторять каждый месяц
                </span>
              </button>

              {/* Actions */}
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
      )}
    </div>
  );
}
