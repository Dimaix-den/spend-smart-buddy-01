import { useState, useRef, useMemo } from "react";
import { ChevronLeft, Pencil } from "lucide-react";
import { useFinance, AccountType, Expense } from "@/hooks/useFinance";
import { formatAmount } from "@/lib/formatAmount";
import { toast } from "@/hooks/use-toast";
import MoneyInput from "@/components/MoneyInput";
import UnifiedActionSheet from "@/components/UnifiedActionSheet";

interface EntityDetailProps {
  finance: ReturnType<typeof useFinance>;
  entityId: string;
  entityType: "account" | "obligation";
  onBack: () => void;
}

import ToggleSwitch from "@/components/ToggleSwitch";

function parseMoney(value: string): number {
  const cleaned = value.replace(/[\s\u00A0\u202F]/g, "").replace(/[^\d]/g, "");
  return parseInt(cleaned, 10) || 0;
}

export default function EntityDetail({
  finance,
  entityId,
  entityType,
  onBack,
}: EntityDetailProps) {
  const {
    state,
    getSavingsForAccount,
    updateAccountBalance,
    updateAccountName,
    updateAccountType,
    updateAccountGoal,
    deleteAccount,
    toggleAccount,
    updateObligation,
    deleteObligation,
    addExpense,
    addIncome,
    deleteExpense,
    updateExpense,
  } = finance;

  const account =
    entityType === "account"
      ? state.accounts.find((a) => a.id === entityId)
      : null;
  const obligation =
    entityType === "obligation"
      ? state.obligations.find((o) => o.id === entityId)
      : null;

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(
    account?.name ?? obligation?.name ?? ""
  );
  const [editBalance, setEditBalance] = useState(
    account?.balance.toString() ?? ""
  );
  const [editType, setEditType] = useState<AccountType>(
    account?.type ?? "active"
  );
  const [editGoal, setEditGoal] = useState(
    account?.monthlyGoal?.toString() ?? ""
  );

  // Obligation fields
  const [editTotalAmount, setEditTotalAmount] = useState(
    obligation?.totalAmount.toString() ?? ""
  );
  const [editMonthlyPayment, setEditMonthlyPayment] = useState(
    obligation?.monthlyPayment.toString() ?? ""
  );
  const [editPaidMonths, setEditPaidMonths] = useState(
    obligation?.paidMonths?.toString() ?? "0"
  );

  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [swipedTxId, setSwipedTxId] = useState<string | null>(null);
  const [showEarlyRepayment, setShowEarlyRepayment] = useState(false);
  const [earlyRepaymentAmount, setEarlyRepaymentAmount] = useState("");
  const [earlyRepaymentAccount, setEarlyRepaymentAccount] = useState("");

  const swipeRef = useRef<{
  startX: number;
  startY: number;
  swiping: boolean;
  dx: number;
}>({
  startX: 0,
  startY: 0,
  swiping: false,
  dx: 0,
});

const handleTouchStart = (e: React.TouchEvent) => {
  const touch = e.touches[0];

  // Если хочешь только «от края» — оставь это условие.
  // Если нужно по всему экрану — убери if полностью.
  if (touch.clientX < 40) {
    swipeRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      swiping: true,
      dx: 0,
    };
  }
};

const handleTouchMove = (e: React.TouchEvent) => {
  if (!swipeRef.current.swiping) return;

  const touch = e.touches[0];
  const dx = touch.clientX - swipeRef.current.startX;
  const dy = Math.abs(touch.clientY - swipeRef.current.startY);

  // Более строгий отсев вертикального скролла:
  // если сильно уехали по вертикали и горизонтальный сдвиг маленький — считаем, что это скролл, а не свайп назад.
  if (dy > 20 && dx < 30) {
    swipeRef.current.swiping = false;
    swipeRef.current.dx = 0;
    return;
  }

  if (dx > 0) {
    swipeRef.current.dx = dx;

    // Очень быстрый свайп — срабатывание прямо в move
    if (dx > 120) {
      swipeRef.current.swiping = false;
      swipeRef.current.dx = 0;
      onBack();
    }
  }
};

const handleTouchEnd = () => {
  if (swipeRef.current.swiping && swipeRef.current.dx > 80) {
    onBack();
  }
  swipeRef.current.swiping = false;
  swipeRef.current.dx = 0;
};


  // Account logic
  if (account) {
    const accountTransactions = state.expenses
      .filter((e) => e.account === account.name || e.toAccount === account.name)
      .sort((a, b) => b.date.localeCompare(a.date));

    const saved = getSavingsForAccount(account.name);
    const goal = account.monthlyGoal || 0;
    const pct =
      goal > 0 ? Math.min(100, Math.round((saved / goal) * 100)) : 0;

    const grouped = new Map<string, typeof accountTransactions>();
    accountTransactions.forEach((t) => {
      const arr = grouped.get(t.date) || [];
      arr.push(t);
      grouped.set(t.date, arr);
    });

    const handleSave = () => {
      if (editName.trim()) updateAccountName(entityId, editName.trim());
      const bal = parseMoney(editBalance);
      updateAccountBalance(entityId, bal);
      updateAccountType(entityId, editType);
      if (editType === "savings")
        updateAccountGoal(entityId, parseMoney(editGoal));
      setEditing(false);
      toast({ description: "✅ Счёт обновлён", duration: 2000 });
    };

    const handleDelete = () => {
      deleteAccount(entityId);
      onBack();
      toast({ description: "🗑 Счёт удалён", duration: 2000 });
    };

    const typeBadge =
      account.type === "active"
        ? "Активный счёт"
        : account.type === "savings"
        ? "Сбережения"
        : "Неактивный";
    const isActiveAccount = account.type === "active";

    return (
      <div
        className="flex flex-col min-h-screen pb-8"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="px-5 pt-10 pb-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-safe-green text-sm font-medium"
          >
            <ChevronLeft size={20} /> Назад
          </button>
          <button
            onClick={() => {
              setEditing(!editing);
              setEditName(account.name);
              setEditBalance(
                account.balance > 0
                  ? account.balance.toLocaleString("ru-RU")
                  : "0"
              );
              setEditType(account.type);
              setEditGoal(
                account.monthlyGoal
                  ? account.monthlyGoal.toLocaleString("ru-RU")
                  : ""
              );
            }}
            className="text-safe-green text-sm font-medium flex items-center gap-1"
          >
            <Pencil size={14} /> {editing ? "Отмена" : "Изменить"}
          </button>
        </div>

        <div className="px-5 space-y-6">
          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Название
                </label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full glass-input px-4 py-3 text-foreground font-semibold focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Баланс
                </label>
                <div className="relative">
                  <MoneyInput
                    value={editBalance}
                    onChange={setEditBalance}
                    className="w-full glass-input px-4 py-3 text-foreground font-bold font-tabular focus:outline-none pr-8"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">
                    ₸
                  </span>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Тип
                </label>
                <div className="flex gap-2">
                  {(["active", "savings", "inactive"] as AccountType[]).map(
                    (t) => (
                      <button
                        key={t}
                        onClick={() => setEditType(t)}
                        className={`flex-1 py-2.5 rounded-[10px] text-sm font-semibold transition-colors ${
                          editType === t
                            ? "text-white"
                            : "text-muted-foreground"
                        }`}
                        style={{
                          background:
                            editType === t
                              ? "hsl(162 100% 33%)"
                              : "hsl(0 0% 23%)",
                        }}
                      >
                        {t === "active"
                          ? "Активный"
                          : t === "savings"
                          ? "Сбережения"
                          : "Неактивный"}
                      </button>
                    )
                  )}
                </div>
              </div>
              {editType === "savings" && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Цель в месяц
                  </label>
                  <div className="relative">
                    <MoneyInput
                      value={editGoal}
                      onChange={setEditGoal}
                      className="w-full glass-input px-4 py-3 text-foreground font-bold font-tabular focus:outline-none pr-12"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      ₸/мес
                    </span>
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleDelete}
                  className="flex-1 py-3 rounded-[10px] text-sm font-bold text-destructive"
                  style={{ background: "hsl(0 0% 18%)" }}
                >
                  Удалить
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
          ) : (
            <>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">
                  {typeBadge}
                </p>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  {account.name}
                </h2>
                <p
                  className={`text-4xl font-bold font-tabular ${
                    account.balance < 0 ? "text-destructive" : "text-foreground"
                  }`}
                >
                  {account.balance < 0 ? "−" : ""}
                  {formatAmount(Math.abs(account.balance))} ₸
                </p>
              </div>

              {account.type === "savings" && goal > 0 && (
                <div className="glass-card p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Цель на месяц</span>
                    <span className="font-bold font-tabular text-foreground">
                      {formatAmount(goal)} ₸
                    </span>
                  </div>
                  <div
                    className="h-2 rounded-full overflow-hidden"
                    style={{ background: "hsl(0 0% 23%)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background: "hsl(162 100% 33%)",
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      Отложено:{" "}
                      <span className="text-safe-green font-semibold">
                        {formatAmount(saved)} ₸
                      </span>
                    </span>
                    <span>{pct}%</span>
                  </div>
                </div>
              )}

              {account.type === "active" && (
                <div className="glass-card p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Использовать в расчётах
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Если выключить, этот счёт не будет учитываться в цифре
                        «Можешь потратить сегодня»
                      </p>
                    </div>
                    <ToggleSwitch
                      on={isActiveAccount}
                      onToggle={() => toggleAccount(entityId)}
                    />
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Операции по счёту
                </h3>
                {accountTransactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Нет операций
                  </p>
                ) : (
                  <div className="space-y-4">
                    {[...grouped.entries()].slice(0, 5).map(([date, txns]) => (
                      <div key={date}>
                        <p className="text-xs text-muted-foreground mb-1.5 px-1">
                          {date}
                        </p>
                        <div className="glass-card overflow-hidden">
                        {txns.map((t, i) => {
                            const isIncoming =
                              t.type === "income" ||
                              t.toAccount === account.name;
                            const isTransfer =
                              t.type === "transfer" || t.type === "savings";
                            const isObligation = t.type === "obligation";

                            const label = t.type === "income"
                              ? t.note || "Доход"
                              : isTransfer
                              ? t.toAccount
                                ? `→ ${t.toAccount}`
                                : t.note || "Перевод"
                              : isObligation
                              ? state.obligations.find((o) => o.id === t.obligationId)?.name ?? t.note ?? "Обязательство"
                              : t.note || "Расход";

                            const subtitle = isTransfer && t.toAccount === account.name
                              ? `← ${t.account}`
                              : t.account;

                            const isSwiped = swipedTxId === t.id;

                            return (
                              <div
                                key={t.id}
                                className={`relative overflow-hidden ${i < txns.length - 1 ? "border-b border-white/5" : ""}`}
                              >
                                {isSwiped && (
                                  <button
                                    onClick={() => {
                                      deleteExpense(t.id);
                                      setSwipedTxId(null);
                                      toast({ description: "🗑 Операция удалена", duration: 2000 });
                                    }}
                                    className="absolute right-0 top-0 bottom-0 w-20 flex items-center justify-center bg-destructive"
                                  >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                                  </button>
                                )}
                                <div
                                  className="px-4 py-3 flex items-center justify-between cursor-pointer active:opacity-70 transition-all"
                                  style={{
                                    transform: isSwiped ? "translateX(-80px)" : "translateX(0)",
                                    transition: "transform 0.25s ease-out",
                                  }}
                                  onClick={() => {
                                    if (isSwiped) { setSwipedTxId(null); return; }
                                    setEditingExpense(t);
                                    setActionSheetOpen(true);
                                  }}
                                  onTouchStart={(e) => { (e.currentTarget as any)._touchStartX = e.touches[0].clientX; }}
                                  onTouchEnd={(e) => {
                                    const dx = (e.currentTarget as any)._touchStartX - e.changedTouches[0].clientX;
                                    if (dx > 50) setSwipedTxId(t.id);
                                    else if (dx < -30) setSwipedTxId(null);
                                  }}
                                >
                                  <div>
                                    <span className="text-sm text-foreground">{label}</span>
                                    <p className="text-xs text-muted-foreground">{subtitle}</p>
                                  </div>
                                  <span
                                    className={`font-bold font-tabular text-sm ${
                                      isIncoming ? "text-safe-green" : "text-alert-orange"
                                    }`}
                                  >
                                    {isIncoming ? "+" : "−"}
                                    {formatAmount(t.amount)} ₸
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {!editing && (
          <button
            onClick={() => setActionSheetOpen(true)}
            className="fixed bottom-24 right-5 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl font-light hover:scale-105 active:scale-95 transition-transform z-40"
            style={{
              background: "hsl(0 0% 15%)",
              color: "hsl(0 0% 100%)",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
            }}
          >
            +
          </button>
        )}

        <UnifiedActionSheet
          open={actionSheetOpen}
          onClose={() => {
            setActionSheetOpen(false);
            setEditingExpense(null);
          }}
          onSaveExpense={(amount, account_, type, opts) => {
            if (editingExpense) {
              updateExpense(editingExpense.id, amount, account_, opts?.note ?? editingExpense.note ?? "");
            } else {
              addExpense(amount, account_, type, opts);
            }
            setActionSheetOpen(false);
            setEditingExpense(null);
          }}
          onSaveIncome={(amount, account_, note, date, plannedExpenseId) => {
            if (editingExpense) {
              updateExpense(editingExpense.id, amount, account_, note ?? editingExpense.note ?? "");
            } else {
              addIncome(amount, account_, note, date, plannedExpenseId);
            }
            setActionSheetOpen(false);
            setEditingExpense(null);
          }}
          onDeleteExpense={(id) => {
            deleteExpense(id);
            setActionSheetOpen(false);
            setEditingExpense(null);
          }}
          accounts={state.accounts}
          obligations={state.obligations}
          plannedExpenses={state.plannedExpenses}
          preselectedAccount={account.name}
          editingExpense={editingExpense}
        />
      </div>
    );
  }

  // Obligation logic
  if (obligation) {
    const totalMonths =
      obligation.monthlyPayment > 0
        ? Math.ceil(obligation.totalAmount / obligation.monthlyPayment)
        : 0;
    const paidMonths = obligation.paidMonths || 0;
    const remainingAmount =
      obligation.totalAmount - paidMonths * obligation.monthlyPayment;
    const pct =
      totalMonths > 0 ? Math.round((paidMonths / totalMonths) * 100) : 0;

    const obligationPayments = state.expenses
      .filter((e) => e.type === "obligation" && e.obligationId === obligation.id)
      .sort((a, b) => b.date.localeCompare(a.date));

    const handleSave = () => {
      updateObligation(entityId, {
        name: editName.trim(),
        totalAmount: parseMoney(editTotalAmount),
        monthlyPayment: parseMoney(editMonthlyPayment),
      });
      setEditing(false);
      toast({ description: "✅ Обязательство обновлено", duration: 2000 });
    };

    const handleDelete = () => {
      deleteObligation(entityId);
      onBack();
      toast({ description: "🗑 Обязательство удалено", duration: 2000 });
    };

    const remainingMonths = totalMonths - paidMonths;
    const activeAccounts = state.accounts.filter(
      (a) => (a.type === "active" || a.type === "savings") && a.balance > 0
    );

    const earlyAmount = parseMoney(earlyRepaymentAmount);
    const earlyMonthsCovered = obligation.monthlyPayment > 0
      ? Math.min(Math.floor(earlyAmount / obligation.monthlyPayment), remainingMonths)
      : 0;

    const handleEarlyRepayment = () => {
      if (earlyAmount <= 0 || earlyMonthsCovered <= 0) return;
      if (!earlyRepaymentAccount) {
        toast({ description: "⚠️ Выберите счёт", duration: 2000 });
        return;
      }

      const selectedAccount = state.accounts.find(a => a.name === earlyRepaymentAccount);
      if (selectedAccount && selectedAccount.balance < earlyAmount) {
        toast({ description: "⚠️ Недостаточно средств", duration: 2000 });
        return;
      }

      // Record expense
      addExpense(earlyAmount, earlyRepaymentAccount, "obligation", {
        obligationId: obligation.id,
        note: `Досрочное погашение (${earlyMonthsCovered} мес.)`,
      });

      // Update paid months
      updateObligation(entityId, {
        paidMonths: paidMonths + earlyMonthsCovered,
      });

      setShowEarlyRepayment(false);
      setEarlyRepaymentAmount("");
      setEarlyRepaymentAccount("");
      toast({
        description: `✅ Досрочное погашение: ${earlyMonthsCovered} мес.`,
        duration: 2000,
      });
    };

    return (
      <div
        className="flex flex-col min-h-screen pb-8"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="px-5 pt-10 pb-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-safe-green text-sm font-medium"
          >
            <ChevronLeft size={20} /> Назад
          </button>
          <button
            onClick={() => {
              setEditing(!editing);
              setEditName(obligation.name);
              setEditTotalAmount(
                obligation.totalAmount.toLocaleString("ru-RU")
              );
              setEditMonthlyPayment(
                obligation.monthlyPayment.toLocaleString("ru-RU")
              );
            }}
            className="text-safe-green text-sm font-medium flex items-center gap-1"
          >
            <Pencil size={14} /> {editing ? "Отмена" : "Изменить"}
          </button>
        </div>

        <div className="px-5 space-y-6">
          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Название
                </label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full glass-input px-4 py-3 text-foreground font-semibold focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Общая сумма
                </label>
                <div className="relative">
                  <MoneyInput
                    value={editTotalAmount}
                    onChange={setEditTotalAmount}
                    className="w-full glass-input px-4 py-3 text-foreground font-bold font-tabular focus:outline-none pr-8"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">
                    ₸
                  </span>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Месячный платёж
                </label>
                <div className="relative">
                  <MoneyInput
                    value={editMonthlyPayment}
                    onChange={setEditMonthlyPayment}
                    className="w-full glass-input px-4 py-3 text-foreground font-bold font-tabular focus:outline-none pr-12"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    ₸/мес
                  </span>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleDelete}
                  className="flex-1 py-3 rounded-[10px] text-sm font-bold text-destructive"
                  style={{ background: "hsl(0 0% 18%)" }}
                >
                  Удалить
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
          ) : (
            <>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">
                  Обязательство
                </p>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  {obligation.name}
                </h2>
                <p className="text-4xl font-bold font-tabular text-alert-orange">
                  {formatAmount(remainingAmount)} ₸
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Осталось выплатить
                </p>
              </div>

              <div className="glass-card p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Месячный платёж</span>
                  <span className="font-bold font-tabular text-foreground">
                    {formatAmount(obligation.monthlyPayment)} ₸
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Общая сумма</span>
                  <span className="font-bold font-tabular text-foreground">
                    {formatAmount(obligation.totalAmount)} ₸
                  </span>
                </div>
                <div
                  className="h-2 rounded-full overflow-hidden"
                  style={{ background: "hsl(0 0% 23%)" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      background: "hsl(38 100% 52%)",
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    Выплачено: {paidMonths} из {totalMonths} мес.
                  </span>
                  <span>{pct}%</span>
                </div>
              </div>

              {/* Early repayment section */}
              {remainingMonths > 1 && (
                <div>
                  {!showEarlyRepayment ? (
                    <button
                      onClick={() => {
                        setShowEarlyRepayment(true);
                        if (activeAccounts.length > 0 && !earlyRepaymentAccount) {
                          setEarlyRepaymentAccount(activeAccounts[0].name);
                        }
                      }}
                      className="w-full py-3 rounded-[12px] text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                      style={{
                        background: "linear-gradient(135deg, hsl(38 80% 10%) 0%, hsl(38 60% 15%) 100%)",
                        border: "1px solid hsl(38 100% 52% / 0.3)",
                        color: "hsl(38 100% 52%)",
                      }}
                    >
                      ⚡ Досрочное погашение
                    </button>
                  ) : (
                    <div className="glass-card-raised p-4 space-y-3 animate-fade-in-up">
                      <p className="text-sm font-semibold text-foreground">
                        Досрочное погашение
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Внесите сумму, кратную месячному платежу ({formatAmount(obligation.monthlyPayment)} ₸), чтобы закрыть несколько месяцев сразу
                      </p>

                      <div className="relative">
                        <MoneyInput
                          placeholder="Сумма"
                          value={earlyRepaymentAmount}
                          onChange={setEarlyRepaymentAmount}
                          className="w-full glass-input px-3 py-2.5 text-sm focus:outline-none pr-8"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          ₸
                        </span>
                      </div>

                      {earlyAmount > 0 && (
                        <div
                          className="rounded-[10px] p-3 space-y-1"
                          style={{ background: "hsl(0 0% 10%)" }}
                        >
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Закроет месяцев</span>
                            <span className="font-bold text-foreground">
                              {earlyMonthsCovered} из {remainingMonths}
                            </span>
                          </div>
                          {earlyAmount % obligation.monthlyPayment !== 0 && earlyMonthsCovered > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Остаток {formatAmount(earlyAmount - earlyMonthsCovered * obligation.monthlyPayment)} ₸ не покрывает полный месяц
                            </p>
                          )}
                          {earlyMonthsCovered >= remainingMonths && (
                            <p className="text-xs font-semibold" style={{ color: "hsl(162 100% 45%)" }}>
                              🎉 Полное досрочное закрытие!
                            </p>
                          )}
                        </div>
                      )}

                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">
                          Со счёта
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {activeAccounts.map((acc) => (
                            <button
                              key={acc.id}
                              onClick={() => setEarlyRepaymentAccount(acc.name)}
                              className={`px-3 py-2 rounded-[8px] text-xs font-semibold transition-colors ${
                                earlyRepaymentAccount === acc.name
                                  ? "text-white"
                                  : "text-muted-foreground"
                              }`}
                              style={{
                                background:
                                  earlyRepaymentAccount === acc.name
                                    ? "hsl(162 100% 33%)"
                                    : "hsl(0 0% 18%)",
                              }}
                            >
                              {acc.name}
                              <span className="ml-1 opacity-60">
                                {formatAmount(acc.balance)} ₸
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => {
                            setShowEarlyRepayment(false);
                            setEarlyRepaymentAmount("");
                          }}
                          className="flex-1 py-2.5 rounded-[10px] text-sm font-semibold text-foreground"
                          style={{ background: "hsl(0 0% 23%)" }}
                        >
                          Отмена
                        </button>
                        <button
                          onClick={handleEarlyRepayment}
                          disabled={earlyMonthsCovered <= 0}
                          className="flex-1 py-2.5 rounded-[10px] text-sm font-bold text-white disabled:opacity-40"
                          style={{ background: "hsl(38 100% 52%)" }}
                        >
                          Погасить
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  История платежей
                </h3>
                {obligationPayments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Нет платежей
                  </p>
                ) : (
                  <div className="glass-card overflow-hidden">
                    {obligationPayments.slice(0, 5).map((p, i) => {
                      const isSwiped = swipedTxId === p.id;
                      return (
                        <div
                          key={p.id}
                          className={`relative overflow-hidden ${i < obligationPayments.length - 1 ? "border-b border-white/5" : ""}`}
                        >
                          {isSwiped && (
                            <button
                              onClick={() => {
                                // Уменьшаем paidMonths при удалении платежа по обязательству
                                const monthsCovered = obligation.monthlyPayment > 0
                                  ? Math.round(p.amount / obligation.monthlyPayment)
                                  : 1;
                                updateObligation(entityId, {
                                  paidMonths: Math.max(0, (obligation.paidMonths || 0) - monthsCovered),
                                });
                                deleteExpense(p.id);
                                setSwipedTxId(null);
                                toast({ description: "🗑 Платёж удалён", duration: 2000 });
                              }}
                              className="absolute right-0 top-0 bottom-0 w-20 flex items-center justify-center bg-destructive"
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                            </button>
                          )}
                          <div
                            className="px-4 py-3 flex items-center justify-between cursor-pointer active:opacity-70 transition-all"
                            style={{
                              transform: isSwiped ? "translateX(-80px)" : "translateX(0)",
                              transition: "transform 0.25s ease-out",
                            }}
                            onClick={() => {
                              if (isSwiped) { setSwipedTxId(null); return; }
                              setEditingExpense(p);
                              setActionSheetOpen(true);
                            }}
                            onTouchStart={(e) => { (e.currentTarget as any)._touchStartX = e.touches[0].clientX; }}
                            onTouchEnd={(e) => {
                              const dx = (e.currentTarget as any)._touchStartX - e.changedTouches[0].clientX;
                              if (dx > 50) setSwipedTxId(p.id);
                              else if (dx < -30) setSwipedTxId(null);
                            }}
                          >
                            <div>
                              <span className="text-sm text-foreground">
                                {p.note || obligation.name}
                              </span>
                              <p className="text-xs text-muted-foreground">
                                {p.account} · {p.date}
                              </p>
                            </div>
                            <span className="font-bold font-tabular text-sm text-alert-orange">
                              −{formatAmount(p.amount)} ₸
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <UnifiedActionSheet
          open={actionSheetOpen}
          onClose={() => {
            setActionSheetOpen(false);
            setEditingExpense(null);
          }}
          onSaveExpense={(amount, account_, type, opts) => {
            if (editingExpense) {
              updateExpense(editingExpense.id, amount, account_, opts?.note ?? editingExpense.note ?? "");
            } else {
              addExpense(amount, account_, type, { ...opts, obligationId: obligation.id });
            }
            setActionSheetOpen(false);
            setEditingExpense(null);
          }}
          onSaveIncome={(amount, account_, note, date) => {
            addIncome(amount, account_, note, date);
            setActionSheetOpen(false);
            setEditingExpense(null);
          }}
          onDeleteExpense={(id) => {
            deleteExpense(id);
            setActionSheetOpen(false);
            setEditingExpense(null);
          }}
          accounts={state.accounts}
          obligations={state.obligations}
          editingExpense={editingExpense}
        />
      </div>
    );
  }

  return null;
}
