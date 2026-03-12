import { useState, useMemo, useRef } from "react";
import { ChevronLeft } from "lucide-react";
import { useFinance, Expense } from "@/hooks/useFinance";
import { formatAmount } from "@/lib/formatAmount";
import UnifiedActionSheet from "@/components/UnifiedActionSheet";
import { TransactionRow } from "@/components/TransactionRow";

interface HistoryProps {
  finance: ReturnType<typeof useFinance>;
  onBack: () => void;
}

type FilterType = "all" | "regular" | "income" | "obligation" | "savings" | "transfer";

export default function History({ finance, onBack }: HistoryProps) {
  const { state, deleteExpense, updateExpense } = finance;
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const [filterAccount, setFilterAccount] = useState("all");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Swipe-to-go-back
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

  const filtered = useMemo(() => {
    let list = [...state.expenses];
    if (filterAccount !== "all") {
      list = list.filter((e) => e.account === filterAccount || e.toAccount === filterAccount);
    }
    if (filterType !== "all") {
      list = list.filter((e) => e.type === filterType);
    }
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [state.expenses, filterAccount, filterType]);

  const grouped = new Map<string, Expense[]>();
  filtered.forEach((e) => {
    const arr = grouped.get(e.date) || [];
    arr.push(e);
    grouped.set(e.date, arr);
  });

  const typeFilters: { value: FilterType; label: string }[] = [
    { value: "all", label: "Все" },
    { value: "regular", label: "Расходы" },
    { value: "income", label: "Доходы" },
    { value: "obligation", label: "Обяз." },
    { value: "savings", label: "Сбер." },
    { value: "transfer", label: "Переводы" },
  ];

  return (
    <div
      className="flex flex-col min-h-screen pb-8"
      onClick={() => swipedId && setSwipedId(null)}
      onScroll={() => swipedId && setSwipedId(null)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="px-5 pt-10 pb-4">
        <button
          onClick={() => { setSwipedId(null); onBack(); }}
          className="flex items-center gap-1 text-safe-green text-sm font-medium mb-3"
        >
          <ChevronLeft size={20} /> Назад
        </button>
        <h1 className="text-2xl font-bold text-foreground">История операций</h1>
      </div>

      {/* Filters */}
      <div className="px-5 space-y-3 mb-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => { setSwipedId(null); setFilterAccount("all"); }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${filterAccount === "all" ? "text-white" : "text-muted-foreground"}`}
            style={{ background: filterAccount === "all" ? "hsl(162 100% 33%)" : "hsl(0 0% 18%)" }}
          >
            Все счета
          </button>
          {state.accounts.filter(a => !a.isSystem).map((acc) => (
            <button
              key={acc.id}
              onClick={() => { setSwipedId(null); setFilterAccount(acc.name); }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${filterAccount === acc.name ? "text-white" : "text-muted-foreground"}`}
              style={{ background: filterAccount === acc.name ? "hsl(162 100% 33%)" : "hsl(0 0% 18%)" }}
            >
              {acc.name}
            </button>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {typeFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => { setSwipedId(null); setFilterType(f.value); }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${filterType === f.value ? "text-white" : "text-muted-foreground"}`}
              style={{ background: filterType === f.value ? "hsl(162 100% 33%)" : "hsl(0 0% 18%)" }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction list */}
      <div className="px-4 space-y-4 flex-1">
        {[...grouped.entries()].map(([date, txns]) => {
          const dayTotal = txns.reduce((sum, e) => {
            if (e.type === "income") return sum + e.amount;
            if (e.type === "transfer") return sum;
            return sum - e.amount;
          }, 0);

          return (
            <div key={date}>
              <div className="flex items-center justify-between mb-1.5 px-1">
                <span className="text-xs text-muted-foreground font-medium">{date}</span>
                <span className={`text-xs font-bold font-tabular ${dayTotal >= 0 ? "text-safe-green" : "text-alert-orange"}`}>
                  {dayTotal >= 0 ? "+" : ""}{formatAmount(dayTotal)} ₸
                </span>
              </div>
              <div className="glass-card overflow-hidden">
                {txns.map((e) => {
                  const isIncome = e.type === "income";
                  const isTransfer = e.type === "transfer" || e.type === "savings";
                  const label = e.note || (isIncome ? "Доход" : isTransfer ? "Перевод" : e.type === "obligation" ? "Обязательство" : e.account);
                  return (
                    <TransactionRow
                      key={e.id}
                      expense={e}
                      label={label}
                      onDelete={(id) => { setSwipedId(null); deleteExpense(id); }}
                      onEdit={(exp) => { setSwipedId(null); setEditingExpense(exp); setSheetOpen(true); }}
                      isSwiped={swipedId === e.id}
                      onSetSwiped={(id) => setSwipedId(id)}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-10">Нет операций</p>
        )}
      </div>

      <UnifiedActionSheet
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setEditingExpense(null); }}
        onSaveExpense={(amount, account, type, opts) => {
          if (!editingExpense) return;
          updateExpense(editingExpense.id, amount, account, opts?.note ?? editingExpense.note ?? "");
          setSheetOpen(false);
          setEditingExpense(null);
        }}
        onSaveIncome={(amount, account, note, date) => {
          if (!editingExpense) return;
          updateExpense(editingExpense.id, amount, account, note ?? editingExpense.note ?? "");
          setSheetOpen(false);
          setEditingExpense(null);
        }}
        onDeleteExpense={(id) => {
          deleteExpense(id);
          setSheetOpen(false);
          setEditingExpense(null);
        }}
        accounts={state.accounts}
        obligations={state.obligations}
        editingExpense={editingExpense}
      />
    </div>
  );
}
