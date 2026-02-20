import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { Account } from "@/hooks/useFinance";
import { formatAmount } from "@/lib/formatAmount";

interface AddIncomeModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (amount: number, account: string, note?: string) => void;
  accounts: Account[];
}

export default function AddIncomeModal({ open, onClose, onSave, accounts }: AddIncomeModalProps) {
  const [amount, setAmount] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [note, setNote] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const activeAccounts = accounts.filter((a) => a.isActive);

  useEffect(() => {
    if (open) {
      setAmount("");
      setNote("");
      if (!selectedAccount && activeAccounts.length > 0) {
        setSelectedAccount(activeAccounts[0].name);
      }
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  if (!open) return null;

  const handleSave = () => {
    const num = parseFloat(amount.replace(/[^\d.]/g, ""));
    if (!num || !selectedAccount) return;
    onSave(num, selectedAccount, note || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-app bg-card rounded-t-2xl modal-slide-up pb-8 shadow-2xl border-t border-border/60">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-muted-foreground/40 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-4">
          <h2 className="text-lg font-bold text-foreground">Добавить доход</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 space-y-4">
          {/* Amount */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Сумма дохода
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="number"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full bg-surface-raised border-2 border-border rounded-xl px-4 py-3.5 text-3xl font-bold text-foreground tabular-nums placeholder:text-muted-foreground/50 focus:border-safe-green focus:outline-none transition-colors"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted-foreground">₸</span>
            </div>
          </div>

          {/* Account selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              На какой счёт зачислить
            </label>
            <div className="space-y-2">
              {activeAccounts.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => setSelectedAccount(acc.name)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                    selectedAccount === acc.name
                      ? "border-safe-green bg-safe-green/10 text-foreground"
                      : "border-border bg-surface-raised text-foreground hover:border-muted-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      selectedAccount === acc.name ? "border-safe-green" : "border-muted-foreground"
                    }`}>
                      {selectedAccount === acc.name && <div className="w-2 h-2 rounded-full bg-safe-green" />}
                    </div>
                    <span className="font-semibold">{acc.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground font-tabular">{formatAmount(acc.balance)} ₸</span>
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Примечание (необязательно)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Зарплата / Бонус / Подработка"
              className="w-full bg-surface-raised border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-safe-green focus:outline-none transition-colors"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3.5 rounded-xl border border-border text-foreground font-semibold hover:bg-muted transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              disabled={!amount || !selectedAccount}
              className="flex-1 py-3.5 rounded-xl font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              style={{ background: "hsl(217 91% 60%)", color: "white" }}
            >
              Добавить доход
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
