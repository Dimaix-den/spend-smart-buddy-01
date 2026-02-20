import { useState, useRef, useEffect } from "react";
import { X, ChevronDown } from "lucide-react";
import { Account, Obligation } from "@/hooks/useFinance";
import { formatAmount } from "@/lib/formatAmount";

interface AddExpenseModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (amount: number, account: string, isObligation: boolean, obligationName?: string) => void;
  accounts: Account[];
  obligations: Obligation[];
}

export default function AddExpenseModal({
  open,
  onClose,
  onSave,
  accounts,
  obligations,
}: AddExpenseModalProps) {
  const [amount, setAmount] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [isObligation, setIsObligation] = useState(false);
  const [selectedObligation, setSelectedObligation] = useState("");
  const [showAccounts, setShowAccounts] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeAccounts = accounts.filter((a) => a.isActive);

  useEffect(() => {
    if (open) {
      setAmount("");
      setIsObligation(false);
      setSelectedObligation("");
      setShowAccounts(false);
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
    onSave(num, selectedAccount, isObligation, isObligation ? selectedObligation : undefined);
    onClose();
  };

  const selectedAccountObj = activeAccounts.find((a) => a.name === selectedAccount);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
        style={{ animation: "fadeIn 0.2s ease-out" }}
      />

      {/* Modal */}
      <div className="relative w-full max-w-app bg-card rounded-t-2xl modal-slide-up pb-8 shadow-2xl border-t border-border/60">
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-muted-foreground/40 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-4">
          <h2 className="text-lg font-bold text-foreground">Добавить расход</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 space-y-4">
          {/* Amount input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Сумма
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
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted-foreground">
                ₸
              </span>
            </div>
          </div>

          {/* Account selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Счёт
            </label>
            <div className="relative">
              <button
                onClick={() => setShowAccounts(!showAccounts)}
                className="w-full flex items-center justify-between bg-surface-raised border border-border rounded-xl px-4 py-3 text-foreground transition-colors hover:border-muted-foreground"
              >
                <div className="flex flex-col items-start">
                  <span className="font-semibold">{selectedAccount || "Выберите счёт"}</span>
                  {selectedAccountObj && (
                    <span className="text-xs text-muted-foreground font-tabular">
                      {formatAmount(selectedAccountObj.balance)} ₸
                    </span>
                  )}
                </div>
                <ChevronDown
                  size={16}
                  className={`text-muted-foreground transition-transform ${showAccounts ? "rotate-180" : ""}`}
                />
              </button>
              {showAccounts && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl overflow-hidden z-10 shadow-xl">
                  {activeAccounts.map((acc) => (
                    <button
                      key={acc.id}
                      onClick={() => {
                        setSelectedAccount(acc.name);
                        setShowAccounts(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 hover:bg-muted transition-colors ${
                        selectedAccount === acc.name ? "bg-primary/10 text-safe-green" : "text-foreground"
                      }`}
                    >
                      <span className="font-medium">{acc.name}</span>
                      <span className="text-sm text-muted-foreground font-tabular">
                        {formatAmount(acc.balance)} ₸
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Obligation toggle */}
          <div className="flex items-center justify-between bg-surface-raised border border-border rounded-xl px-4 py-3">
            <div>
              <span className="font-medium text-foreground text-sm">Обязательный платёж</span>
              <p className="text-xs text-muted-foreground mt-0.5">Не влияет на бюджет расходов</p>
            </div>
            <button
              onClick={() => setIsObligation(!isObligation)}
              className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                isObligation ? "bg-safe-green" : "bg-muted"
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-foreground rounded-full shadow transition-transform duration-200 ${
                  isObligation ? "translate-x-6" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {/* Obligation selector */}
          {isObligation && obligations.length > 0 && (
            <div className="space-y-1.5 animate-fade-in-up">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Тип обязательства
              </label>
              <div className="flex flex-wrap gap-2">
                {obligations.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setSelectedObligation(o.name)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      selectedObligation === o.name
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {o.name}
                  </button>
                ))}
              </div>
            </div>
          )}

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
              className="flex-1 py-3.5 rounded-xl bg-safe-green text-primary-foreground font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            >
              Сохранить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
