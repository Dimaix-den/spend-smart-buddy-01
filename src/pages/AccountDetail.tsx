import { useState, useRef } from "react";
import { ChevronLeft, Pencil } from "lucide-react";
import { useFinance, AccountType } from "@/hooks/useFinance";
import { formatAmount } from "@/lib/formatAmount";
import { toast } from "@/hooks/use-toast";
import MoneyInput from "@/components/MoneyInput";

interface AccountDetailProps {
  finance: ReturnType<typeof useFinance>;
  accountId: string;
  onBack: () => void;
}

function ToggleSwitch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
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

export default function AccountDetail({ finance, accountId, onBack }: AccountDetailProps) {
  const {
    state,
    getSavingsForAccount,
    updateAccountBalance,
    updateAccountName,
    updateAccountType,
    updateAccountGoal,
    deleteAccount,
    toggleAccount,
  } = finance;

  const account = state.accounts.find((a) => a.id === accountId);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(account?.name ?? "");
  const [editBalance, setEditBalance] = useState(account?.balance.toString() ?? "");
  const [editType, setEditType] = useState<AccountType>(account?.type ?? "active");
  const [editGoal, setEditGoal] = useState(account?.monthlyGoal?.toString() ?? "");

  // Swipe-to-go-back
  const swipeRef = useRef<{ startX: number; startY: number; swiping: boolean; dx: number }>({
    startX: 0, startY: 0, swiping: false, dx: 0,
  });
  const [swipeDx, setSwipeDx] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch.clientX < 30) {
      swipeRef.current = { startX: touch.clientX, startY: touch.clientY, swiping: true, dx: 0 };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swipeRef.current.swiping) return;
    const dx = e.touches[0].clientX - swipeRef.current.startX;
    const dy = Math.abs(e.touches[0].clientY - swipeRef.current.startY);
    if (dy > 50) { swipeRef.current.swiping = false; setSwipeDx(0); return; }
    if (dx > 0) {
      setSwipeDx(dx);
      swipeRef.current.dx = dx;
    }
  };

  const handleTouchEnd = () => {
    if (swipeRef.current.swiping && swipeRef.current.dx > 100) {
      onBack();
    }
    swipeRef.current.swiping = false;
    setSwipeDx(0);
  };

  if (!account) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Счёт не найден</p>
        <button onClick={onBack} className="mt-4 text-safe-green">← Назад</button>
      </div>
    );
  }

  const accountTransactions = state.expenses
    .filter((e) => e.account === account.name || e.toAccount === account.name)
    .sort((a, b) => b.date.localeCompare(a.date));

  const saved = getSavingsForAccount(account.name);
  const goal = account.monthlyGoal || 0;
  const pct = goal > 0 ? Math.min(100, Math.round((saved / goal) * 100)) : 0;

  // Group transactions by date
  const grouped = new Map<string, typeof accountTransactions>();
  accountTransactions.forEach((t) => {
    const arr = grouped.get(t.date) || [];
    arr.push(t);
    grouped.set(t.date, arr);
  });

  const handleSave = () => {
    if (editName.trim()) updateAccountName(accountId, editName.trim());
    const bal = parseFloat(editBalance) || 0;
    updateAccountBalance(accountId, bal);
    updateAccountType(accountId, editType);
    if (editType === "savings") {
      updateAccountGoal(accountId, parseFloat(editGoal) || 0);
    }
    setEditing(false);
    toast({ description: "✅ Счёт обновлён", duration: 2000 });
  };

  const handleDelete = () => {
    deleteAccount(accountId);
    onBack();
    toast({ description: "🗑 Счёт удалён", duration: 2000 });
  };

  const typeBadge = account.type === "active" ? "Активный счёт" : account.type === "savings" ? "Сбережения" : "Неактивный";
  const isActiveAccount = account.type === "active";

  return (
    <div
      className="flex flex-col min-h-screen pb-8"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: swipeDx > 0 ? `translateX(${swipeDx}px)` : undefined,
        transition: swipeDx > 0 ? "none" : "transform 0.3s ease-out",
        opacity: swipeDx > 0 ? Math.max(0.5, 1 - swipeDx / 400) : 1,
      }}
    >
      {/* Header */}
      <div className="px-5 pt-10 pb-4 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1 text-safe-green text-sm font-medium">
          <ChevronLeft size={20} /> Назад
        </button>
        <button onClick={() => { setEditing(!editing); setEditName(account.name); setEditBalance(account.balance.toString()); setEditType(account.type); setEditGoal((account.monthlyGoal || 0).toString()); }} className="text-safe-green text-sm font-medium flex items-center gap-1">
          <Pencil size={14} /> {editing ? "Отмена" : "Изменить"}
        </button>
      </div>

      <div className="px-5 space-y-6">
        {editing ? (
          /* ─── Edit Mode ─── */
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Название</label>
              <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full glass-input px-4 py-3 text-foreground font-semibold focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Баланс</label>
              <div className="relative">
                <MoneyInput
                  value={editBalance}
                  onChange={setEditBalance}
                  className="w-full glass-input px-4 py-3 text-foreground font-bold font-tabular focus:outline-none pr-8"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">₸</span>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Тип</label>
              <div className="flex gap-2">
                {(["active", "savings", "inactive"] as AccountType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setEditType(t)}
                    className={`flex-1 py-2.5 rounded-[10px] text-sm font-semibold transition-colors ${
                      editType === t ? "text-white" : "text-muted-foreground"
                    }`}
                    style={{ background: editType === t ? "hsl(162 100% 33%)" : "hsl(0 0% 23%)" }}
                  >
                    {t === "active" ? "Активный" : t === "savings" ? "Сбережения" : "Неактивный"}
                  </button>
                ))}
              </div>
            </div>
            {editType === "savings" && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Цель в месяц</label>
                <div className="relative">
                  <MoneyInput
                    value={editGoal}
                    onChange={setEditGoal}
                    className="w-full glass-input px-4 py-3 text-foreground font-bold font-tabular focus:outline-none pr-12"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₸/мес</span>
                </div>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button onClick={handleDelete} className="flex-1 py-3 rounded-[10px] text-sm font-bold text-destructive" style={{ background: "hsl(0 0% 18%)" }}>Удалить</button>
              <button onClick={handleSave} className="flex-1 py-3 rounded-[10px] text-sm font-bold text-white" style={{ background: "hsl(162 100% 33%)" }}>Сохранить</button>
            </div>
          </div>
        ) : (
          /* ─── View Mode ─── */
          <>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">{typeBadge}</p>
              <h2 className="text-2xl font-bold text-foreground mb-2">{account.name}</h2>
              <p className={`text-4xl font-bold font-tabular ${account.balance < 0 ? "text-destructive" : "text-foreground"}`}>{account.balance < 0 ? "−" : ""}{formatAmount(Math.abs(account.balance))} ₸</p>
            </div>

            {/* Savings goal progress */}
            {account.type === "savings" && goal > 0 && (
              <div className="glass-card p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Цель на месяц</span>
                  <span className="font-bold font-tabular text-foreground">{formatAmount(goal)} ₸</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "hsl(0 0% 23%)" }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: "hsl(162 100% 33%)" }} />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Отложено: <span className="text-safe-green font-semibold">{formatAmount(saved)} ₸</span></span>
                  <span>{pct}%</span>
                </div>
              </div>
            )}

            {/* Use in calculations toggle (only for active accounts) */}
            {account.type === "active" && (
              <div className="glass-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Использовать в расчётах</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Если выключить, этот счёт не будет учитываться в цифре «Можешь потратить сегодня»
                    </p>
                  </div>
                  <ToggleSwitch
                    on={isActiveAccount}
                    onToggle={() => toggleAccount(accountId)}
                  />
                </div>
              </div>
            )}

            {/* Transactions for this account */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Операции по счёту
              </h3>
              {accountTransactions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Нет операций</p>
              ) : (
                <div className="space-y-4">
                  {[...grouped.entries()].slice(0, 5).map(([date, txns]) => (
                    <div key={date}>
                      <p className="text-xs text-muted-foreground mb-1.5 px-1">{date}</p>
                      <div className="glass-card overflow-hidden">
                        {txns.map((t, i) => {
                          const isIncoming = t.type === "income" || t.toAccount === account.name;
                          return (
                            <div key={t.id} className={`px-4 py-3 flex items-center justify-between ${i < txns.length - 1 ? "border-b border-white/5" : ""}`}>
                              <span className="text-sm text-foreground">{t.note || t.type}</span>
                              <span className={`font-bold font-tabular text-sm ${isIncoming ? "text-safe-green" : "text-alert-orange"}`}>
                                {isIncoming ? "+" : "−"}{formatAmount(t.amount)} ₸
                              </span>
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
    </div>
  );
}
