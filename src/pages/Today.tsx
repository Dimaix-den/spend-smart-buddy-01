import { useState } from "react";
import { TrendingDown, TrendingUp, ChevronRight, Info } from "lucide-react";
import { useFinance, Expense } from "@/hooks/useFinance";
import { formatAmount } from "@/lib/formatAmount";
import UnifiedActionSheet from "@/components/UnifiedActionSheet";
import { toast } from "@/hooks/use-toast";

interface TodayProps {
  finance: ReturnType<typeof useFinance>;
  onShowHistory: () => void;
}

function AnimatedNumber({ value }: { value: number }) {
  return <span>{formatAmount(value)}</span>;
}

export default function Today({ finance, onShowHistory }: TodayProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  
  const {
    safeToSpend, dailyBudget, spentToday, state, addExpense, addIncome, deleteExpense
  } = finance;

  const displayAmount = Math.max(0, safeToSpend);
  const isOverspent = safeToSpend < 0;
  const mainMessage = isOverspent ? "Лучше возьми паузу" : "Можешь жить спокойно";

  return (
    <div className="flex flex-col justify-between px-6 pt-12 pb-24 min-h-screen bg-gradient-to-b from-[#050608] to-[#0A0F14]">
      {/* Главный индикатор */}
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-white/5 flex items-center justify-center">
          {isOverspent ? (
            <TrendingDown size={32} className="text-destructive" />
          ) : (
            <TrendingUp size={32} className="text-safe-green" />
          )}
        </div>
        
        <h1 className="text-4xl font-bold mb-6 text-foreground">
          {mainMessage}
        </h1>
        
        <div className="flex items-baseline justify-center mb-8">
          <span
            className={`font-black ${
              isOverspent ? "text-destructive" : "text-safe-green"
            }`}
            style={{ fontSize: "72px", lineHeight: "72px" }}
          >
            <AnimatedNumber value={displayAmount} />
          </span>
          <span
            className={`ml-2 text-3xl font-bold ${
              isOverspent ? "text-destructive" : "text-safe-green"
            }`}
          >
            ₸
          </span>
        </div>

        <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground font-mono">
          <div>Лимит: <span className="font-semibold text-foreground">{formatAmount(dailyBudget)}₸</span></div>
          <div>•</div>
          <div>Потрачено: <span className="font-semibold text-alert-orange">{formatAmount(spentToday)}₸</span></div>
        </div>
      </div>

      {/* Три кнопки */}
      <div className="flex gap-3 mb-8">
        <button
          onClick={() => {
            setEditingExpense(null);
            setSheetOpen(true);
          }}
          className="flex-1 bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20 flex flex-col items-center gap-2 hover:bg-white/20 active:scale-[0.98] transition-all"
        >
          <TrendingDown size={24} className="text-alert-orange" />
          <span className="text-xs font-semibold text-foreground">Потратить</span>
        </button>
        
        <button
          onClick={() => {
            setEditingExpense({} as Expense);
            setSheetOpen(true);
          }}
          className="flex-1 bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20 flex flex-col items-center gap-2 hover:bg-white/20 active:scale-[0.98] transition-all"
        >
          <TrendingUp size={24} className="text-safe-green" />
          <span className="text-xs font-semibold text-foreground">Доход</span>
        </button>
        
        <button
          onClick={onShowHistory}
          className="flex-1 bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20 flex flex-col items-center gap-2 hover:bg-white/20 active:scale-[0.98] transition-all"
        >
          <ChevronRight size={24} className="text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">История</span>
        </button>
      </div>

      {/* Action Sheet */}
      <UnifiedActionSheet
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          setEditingExpense(null);
        }}
        onSaveExpense={(amount, account, type, opts) => {
          addExpense(amount, account, type, opts);
          toast({
            description: `✅ Расход: ${formatAmount(amount)} ₸`,
            duration: 2000,
          });
        }}
        onSaveIncome={(amount, account, note, date) => {
          addIncome(amount, account, note, date);
          toast({
            description: `💰 Доход: +${formatAmount(amount)} ₸`,
            duration: 2000,
          });
        }}
        accounts={state.accounts}
        obligations={state.obligations}
        editingExpense={editingExpense}
      />
    </div>
  );
}
