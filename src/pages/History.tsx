import { useState, useMemo } from "react";
import { ChevronLeft, TrendingDown, TrendingUp, ArrowRightLeft } from "lucide-react";
import { useFinance, Expense } from "@/hooks/useFinance";
import { formatAmount } from "@/lib/formatAmount";

interface HistoryProps {
  finance: ReturnType<typeof useFinance>;
  onBack: () => void;
}

type FilterType = "all" | "regular" | "income" | "obligation" | "savings" | "transfer";

export default function History({ finance, onBack }: HistoryProps) {
  const { state } = finance;
  const [filterAccount, setFilterAccount] = useState("all");
  const [filterType, setFilterType] = useState<FilterType>("all");

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

  // Group by date
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
    <div className="flex flex-col min-h-screen pb-8">
      <div className="px-5 pt-10 pb-4">
        <button onClick={onBack} className="flex items-center gap-1 text-safe-green text-sm font-medium mb-3">
          <ChevronLeft size={20} /> Назад
        </button>
        <h1 className="text-2xl font-bold text-foreground">История операций</h1>
      </div>

      {/* Filters */}
      <div className="px-5 space-y-3 mb-4">
        {/* Account filter */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setFilterAccount("all")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              filterAccount === "all" ? "text-white" : "text-muted-foreground"
            }`}
            style={{ background: filterAccount === "all" ? "hsl(162 100% 33%)" : "hsl(0 0% 18%)" }}
          >
            Все счета
          </button>
          {state.accounts.map((acc) => (
            <button
              key={acc.id}
              onClick={() => setFilterAccount(acc.name)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                filterAccount === acc.name ? "text-white" : "text-muted-foreground"
              }`}
              style={{ background: filterAccount === acc.name ? "hsl(162 100% 33%)" : "hsl(0 0% 18%)" }}
            >
              {acc.name}
            </button>
          ))}
        </div>

        {/* Type filter */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {typeFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilterType(f.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                filterType === f.value ? "text-white" : "text-muted-foreground"
              }`}
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
                {txns.map((e, i) => {
                  const isIncome = e.type === "income";
                  const isTransfer = e.type === "transfer" || e.type === "savings";
                  const Icon = isIncome ? TrendingUp : isTransfer ? ArrowRightLeft : TrendingDown;
                  const color = isIncome ? "text-safe-green" : isTransfer ? "text-income-blue" : "text-alert-orange";
                  const label = e.note || (isIncome ? "Доход" : isTransfer ? "Перевод" : e.type === "obligation" ? "Обязательство" : e.account);

                  return (
                    <div key={e.id} className={`px-4 py-3 flex items-center justify-between ${i < txns.length - 1 ? "border-b border-white/5" : ""}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center ${isIncome ? "bg-safe-green/15" : isTransfer ? "bg-income-blue/15" : "bg-alert-orange/15"}`}>
                          <Icon size={13} className={color} />
                        </div>
                        <div>
                          <p className="text-sm text-foreground">{label}</p>
                          <p className="text-xs text-muted-foreground">{e.account}</p>
                        </div>
                      </div>
                      <span className={`font-bold font-tabular text-sm ${color}`}>
                        {isIncome ? "+" : "−"}{formatAmount(e.amount)} ₸
                      </span>
                    </div>
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
    </div>
  );
}
