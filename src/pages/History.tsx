import { useEffect, useState, useMemo, useRef } from "react";
import { ChevronLeft, Plus } from "lucide-react";
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
  const { state, deleteExpense, updateExpense, addExpense, addIncome } = finance;
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const [filterAccount, setFilterAccount] = useState("all");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  const filtered = useMemo(() => {
    let list = [...state.expenses];
    if (filterAccount !== "all") {
      list = list.filter(
        (e) => e.account === filterAccount || e.toAccount === filterAccount
      );
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

  const handleFiltersTouchStart = (e: React.TouchEvent) => {
    // чтобы жесты внутри фильтров не улетали наверх по дереву
    e.stopPropagation();
  };

  return (
    <div
      className="flex flex-col min-h-screen pb-24"
      onClick={() => swipedId && setSwipedId(null)}
      onScroll={() => swipedId && setSwipedId(null)}
    >
      <div className="px-5 pt-10 pb-4">
        <button
          onClick={() => {
            setSwipedId(null);
            onBack();
          }}
          className="flex items-center gap-1 text-safe-green text-sm font-medium mb-3"
        >
          <ChevronLeft size={20} /> Назад
        </button>
        <h1 className="text-2xl font-bold text-foreground">История операций</h1>
      </div>

{/* Filters */}
<div className="px-5 space-y-3 mb-4">
  {/* Счета */}
  <div
    className="-mx-5 overflow-x-auto scrollbar-hide filters-scroll"
  >
    <div className="px-5 flex gap-2">
      <button
        onClick={() => {
          setSwipedId(null);
          setFilterAccount("all");
        }}
        className={`px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
          filterAccount === "all" ? "text-white" : "text-muted-foreground"
        }`}
        style={{
          background:
            filterAccount === "all" ? "hsl(162 100% 33%)" : "hsl(0 0% 18%)",
        }}
      >
        Все счета
      </button>
      {state.accounts
        .filter((a) => !a.isSystem)
        .map((acc) => (
          <button
            key={acc.id}
            onClick={() => {
              setSwipedId(null);
              setFilterAccount(acc.name);
            }}
            className={`px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
              filterAccount === acc.name
                ? "text-white"
                : "text-muted-foreground"
            }`}
            style={{
              background:
                filterAccount === acc.name
                  ? "hsl(162 100% 33%)"
                  : "hsl(0 0% 18%)",
            }}
          >
            {acc.name}
          </button>
        ))}
    </div>
  </div>

  {/* Типы */}
  <div
    className="-mx-5 overflow-x-auto scrollbar-hide filters-scroll"
  >
    <div className="px-5 flex gap-2">
      {typeFilters.map((f) => (
        <button
          key={f.value}
          onClick={() => {
            setSwipedId(null);
            setFilterType(f.value);
          }}
          className={`px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
            filterType === f.value ? "text-white" : "text-muted-foreground"
          }`}
          style={{
            background:
              filterType === f.value
                ? "hsl(162 100% 33%)"
                : "hsl(0 0% 18%)",
          }}
        >
          {f.label}
        </button>
      ))}
    </div>
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
                <span className="text-xs text-muted-foreground font-medium">
                  {date}
                </span>
                <span
                  className={`text-xs font-bold font-tabular ${
                    dayTotal >= 0 ? "text-safe-green" : "text-alert-orange"
                  }`}
                >
                  {dayTotal >= 0 ? "+" : ""}
                  {formatAmount(dayTotal)} ₸
                </span>
              </div>
              <div className="glass-card overflow-hidden">
                {txns.map((e) => {
                  const isIncome = e.type === "income";
                  const isTransfer =
                    e.type === "transfer" || e.type === "savings";
                  const isObligation = e.type === "obligation";
                  const label = isIncome
                    ? e.note || "Доход"
                    : isTransfer
                    ? e.toAccount
                      ? `→ ${e.toAccount}`
                      : e.note || "Перевод"
                    : isObligation
                    ? state.obligations.find((o) => o.id === e.obligationId)
                        ?.name ?? e.note ?? "Обязательство"
                    : e.note || "Расход";
                  return (
                    <TransactionRow
                      key={e.id}
                      expense={e}
                      label={label}
                      onDelete={(id) => {
                        setSwipedId(null);
                        deleteExpense(id);
                      }}
                      onEdit={(exp) => {
                        setSwipedId(null);
                        setEditingExpense(exp);
                        setSheetOpen(true);
                      }}
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
          <p className="text-center text-muted-foreground text-sm py-10">
            Нет операций
          </p>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => {
          setEditingExpense(null);
          setSheetOpen(true);
        }}
        className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 w-16 h-16 rounded-full flex items-center justify-center active:scale-90 transition-all duration-200"
        style={{
          background: "hsl(162 100% 33%)",
          boxShadow: "0 4px 16px rgba(0, 166, 118, 0.4)",
        }}
      >
        <Plus size={28} strokeWidth={2.5} className="text-white" />
      </button>

      <UnifiedActionSheet
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          setEditingExpense(null);
        }}
        onSaveExpense={(amount, account, type, opts) => {
          if (editingExpense) {
            updateExpense(
              editingExpense.id,
              amount,
              account,
              opts?.note ?? editingExpense.note ?? ""
            );
          } else {
            addExpense(amount, account, type, opts);
          }
          setSheetOpen(false);
          setEditingExpense(null);
        }}
        onSaveIncome={(amount, account, note, date, plannedExpenseId) => {
          if (editingExpense) {
            updateExpense(
              editingExpense.id,
              amount,
              account,
              note ?? editingExpense.note ?? ""
            );
          } else {
            addIncome(amount, account, note, date, plannedExpenseId);
          }
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
