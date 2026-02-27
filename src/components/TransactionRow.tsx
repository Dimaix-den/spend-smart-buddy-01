import React, { useRef } from "react";
import { TrendingDown, TrendingUp, ArrowRightLeft, Trash2 } from "lucide-react";
import { Expense } from "@/hooks/useFinance";
import { formatAmount } from "@/lib/formatAmount";

interface TransactionRowProps {
  expense: Expense;
  label: string;
  onDelete: (id: string) => void;
  onEdit: (expense: Expense) => void;
  isSwiped: boolean;
  onSetSwiped: (id: string | null) => void;
}

export function TransactionRow({
  expense,
  label,
  onDelete,
  onEdit,
  isSwiped,
  onSetSwiped,
}: TransactionRowProps) {
  const touchStartX = useRef(0);
  const isIncome = expense.type === "income";
  const isTransfer = expense.type === "transfer" || expense.type === "savings";

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 60) onSetSwiped(expense.id);
    else if (diff < -30) onSetSwiped(null);
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
      {isSwiped && (
        <button
          onClick={() => onDelete(expense.id)}
          className="absolute right-0 top-0 bottom-0 w-20 bg-destructive flex items-center justify-center animate-swipe-reveal rounded-r-[12px]"
        >
          <Trash2 size={18} className="text-white" />
        </button>
      )}
      <div
        className={`glass-card px-4 py-3 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all duration-200 ${
          isSwiped ? "-translate-x-20" : "translate-x-0"
        }`}
        style={{ transition: "transform 0.25s ease-out" }}
        onClick={() => {
          if (isSwiped) {
            onSetSwiped(null);
            return;
          }
          onEdit(expense);
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${bgColor}`}>
            <Icon size={14} className={color} />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground">{expense.account}</p>
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
