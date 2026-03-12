import { useState, useRef } from "react";
import { ChevronLeft, Pencil } from "lucide-react";
import { useFinance } from "@/hooks/useFinance";
import { formatAmount } from "@/lib/formatAmount";
import { toast } from "@/hooks/use-toast";
import MoneyInput from "@/components/MoneyInput";

interface ObligationDetailProps {
  finance: ReturnType<typeof useFinance>;
  obligationId: string;
  onBack: () => void;
}

export default function ObligationDetail({ finance, obligationId, onBack }: ObligationDetailProps) {
  const { state, updateObligation, markObligationPayment, deleteObligation } = finance;

  const obligation = state.obligations.find((o) => o.id === obligationId);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(obligation?.name ?? "");
  const [editTotal, setEditTotal] = useState(obligation?.totalAmount.toString() ?? "");
  const [editMonthly, setEditMonthly] = useState(obligation?.monthlyPayment.toString() ?? "");
  const [editPaidMonths, setEditPaidMonths] = useState(obligation?.paidMonths.toString() ?? "0");

  const swipeRef = useRef<{ startX: number; startY: number; swiping: boolean; dx: number }>({
    startX: 0, startY: 0, swiping: false, dx: 0,
  });

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch.clientX < 40) {
      swipeRef.current = { startX: touch.clientX, startY: touch.clientY, swiping: true, dx: 0 };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swipeRef.current.swiping) return;
    const dx = e.touches[0].clientX - swipeRef.current.startX;
    const dy = Math.abs(e.touches[0].clientY - swipeRef.current.startY);
    if (dy > 50) { swipeRef.current.swiping = false; return; }
    if (dx > 0) swipeRef.current.dx = dx;
  };

  const handleTouchEnd = () => {
    if (swipeRef.current.swiping && swipeRef.current.dx > 80) onBack();
    swipeRef.current.swiping = false;
    swipeRef.current.dx = 0;
  };

  if (!obligation) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Обязательство не найдено</p>
        <button onClick={onBack} className="mt-4 text-safe-green">← Назад</button>
      </div>
    );
  }

  const isInstallment = obligation.totalAmount > obligation.monthlyPayment;
  const totalMonths = isInstallment ? Math.ceil(obligation.totalAmount / obligation.monthlyPayment) : 1;
  const remainingAmount = Math.max(0, obligation.totalAmount - obligation.monthlyPayment * obligation.paidMonths);
  const progressPct = isInstallment ? Math.min(100, Math.round((obligation.paidMonths / totalMonths) * 100)) : 0;

  const handleSave = () => {
    const total = parseFloat(editTotal) || 0;
    const monthly = parseFloat(editMonthly) || 0;
    const paid = parseInt(editPaidMonths) || 0;
    if (!editName.trim() || !monthly) return;
    updateObligation(obligationId, { name: editName.trim(), totalAmount: total, monthlyPayment: monthly, paidMonths: paid });
    setEditing(false);
    toast({ description: "✅ Обязательство обновлено", duration: 2000 });
  };

  const handleDelete = () => {
    deleteObligation(obligationId);
    onBack();
    toast({ description: "🗑 Обязательство удалено", duration: 2000 });
  };

  const obligationTxns = state.expenses
    .filter((e) => e.obligationId === obligationId)
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div
      className="flex flex-col min-h-screen pb-8"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="px-5 pt-10 pb-4 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1 text-safe-green text-sm font-medium">
          <ChevronLeft size={20} /> Назад
        </button>
        <button
          onClick={() => {
            if (editing) { setEditing(false); return; }
            setEditing(true);
            setEditName(obligation.name);
            setEditTotal(obligation.totalAmount.toString());
            setEditMonthly(obligation.monthlyPayment.toString());
            setEditPaidMonths(obligation.paidMonths.toString());
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
              <label className="text-xs text-muted-foreground mb-1 block">Название</label>
              <input value={editName} onChange={(e) => setEditName(e.target.value)}
                className="w-full glass-input px-4 py-3 text-foreground font-semibold focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Общая сумма</label>
              <div className="relative">
                <MoneyInput value={editTotal} onChange={setEditTotal}
                  className="w-full glass-input px-4 py-3 text-foreground font-bold font-tabular focus:outline-none pr-8" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">₸</span>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Месячный платёж</label>
              <div className="relative">
                <MoneyInput value={editMonthly} onChange={setEditMonthly}
                  className="w-full glass-input px-4 py-3 text-foreground font-bold font-tabular focus:outline-none pr-8" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">₸</span>
              </div>
            </div>
            {isInstallment && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Оплачено месяцев</label>
                <input type="number" value={editPaidMonths} onChange={(e) => setEditPaidMonths(e.target.value)}
                  className="w-full glass-input px-4 py-3 text-foreground font-bold font-tabular focus:outline-none" />
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button onClick={handleDelete} className="flex-1 py-3 rounded-[10px] text-sm font-bold text-destructive" style={{ background: "hsl(0 0% 18%)" }}>Удалить</button>
              <button onClick={handleSave} className="flex-1 py-3 rounded-[10px] text-sm font-bold text-white" style={{ background: "hsl(162 100% 33%)" }}>Сохранить</button>
            </div>
          </div>
        ) : (
          <>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Обязательство</p>
              <h2 className="text-2xl font-bold text-foreground mb-2">{obligation.name}</h2>
            </div>

            <div className="glass-card p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Месячный платёж</span>
                <span className="font-bold font-tabular text-foreground">{formatAmount(obligation.monthlyPayment)} ₸</span>
              </div>
              {isInstallment && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Общая сумма</span>
                    <span className="font-bold font-tabular text-foreground">{formatAmount(obligation.totalAmount)} ₸</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Осталось выплатить</span>
                    <span className="font-bold font-tabular text-alert-orange">{formatAmount(remainingAmount)} ₸</span>
                  </div>
                </>
              )}
            </div>

            {isInstallment && (
              <div className="glass-card p-4 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Прогресс</h3>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-foreground">Выплачено: {obligation.paidMonths} из {totalMonths} мес.</span>
                  <span className="font-bold text-alert-orange">{progressPct}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "hsl(0 0% 23%)" }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%`, background: "hsl(38 100% 52%)" }} />
                </div>
              </div>
            )}

            {obligationTxns.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">История платежей</h3>
                <div className="glass-card overflow-hidden">
                  {obligationTxns.map((t, i) => (
                    <div key={t.id} className={`px-4 py-3 flex items-center justify-between ${i < obligationTxns.length - 1 ? "border-b border-white/5" : ""}`}>
                      <span className="text-sm text-muted-foreground">{t.date}</span>
                      <span className="font-bold font-tabular text-sm text-alert-orange">−{formatAmount(t.amount)} ₸</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button onClick={handleDelete} className="w-full py-3 rounded-[10px] text-sm font-bold text-destructive mt-4" style={{ background: "hsl(0 0% 12%)" }}>
              Удалить обязательство
            </button>
          </>
        )}
      </div>
    </div>
  );
}
