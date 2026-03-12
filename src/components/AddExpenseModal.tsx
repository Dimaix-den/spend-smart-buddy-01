import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { Account, Obligation, ExpenseType } from "@/hooks/useFinance";
import { formatAmount } from "@/lib/formatAmount";

interface AddExpenseModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (
    amount: number,
    account: string,
    type: ExpenseType,
    opts?: { obligationId?: string; toAccount?: string; note?: string }
  ) => void;
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
  const [type, setType] = useState<ExpenseType>("regular");
  const [selectedObligId, setSelectedObligId] = useState("");
  const [savingsTarget, setSavingsTarget] = useState<"transfer" | "virtual">("virtual");
  const [toAccount, setToAccount] = useState("");
  const [showAccounts, setShowAccounts] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [operationDate, setOperationDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const activeAccounts = accounts.filter((a) => a.isActive);
  const inactiveAccounts = accounts.filter((a) => !a.isActive);
  const unpaidObligations = obligations.filter((o) => !o.paid);

  useEffect(() => {
    if (open) {
      setAmount("");
      setType("regular");
      setSelectedObligId("");
      setSavingsTarget("virtual");
      setToAccount(inactiveAccounts[0]?.name ?? "");
      setShowAccounts(false);
      if (!selectedAccount && activeAccounts.length > 0) {
        setSelectedAccount(activeAccounts[0].name);
      }
      setOperationDate(new Date().toISOString().split("T")[0]);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.click();
      }, 150);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    const formatted = raw ? Number(raw).toLocaleString("ru-RU") : "";
    setAmount(formatted);
  };

  const handleSave = () => {
    const num = parseFloat(amount.replace(/\s/g, "").replace(/[^\d]/g, ""));
    if (!num || !selectedAccount) return;
    const opts: { obligationId?: string; toAccount?: string } = {};
    if (type === "obligation" && selectedObligId) opts.obligationId = selectedObligId;
    if (type === "savings" && savingsTarget === "transfer" && toAccount)
      opts.toAccount = toAccount;

    onSave(num, selectedAccount, type, opts);
    onClose();
  };

  const typeOptions: { value: ExpenseType; label: string; desc: string }[] = [
    { value: "regular", label: "Обычный расход", desc: "Уменьшает дневной лимит" },
    { value: "obligation", label: "Обязательный платёж", desc: "Аренда, кредит и т.д." },
    { value: "savings", label: "Отложить в сбережения", desc: "Инвестиция или депозит" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
        style={{ animation: "fadeIn 0.2s ease-out" }}
      />
      <div className="relative w-full max-w-app bg-card rounded-t-2xl modal-slide-up pb-8 shadow-2xl border-t border-border/60 max-h-[90vh] overflow-y-auto">
        {/* Handle */}
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
          {/* Amount */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Сумма
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={handleAmountChange}
                placeholder="0"
                className="w-full bg-surface-raised border-2 border-border rounded-xl px-4 py-3.5 text-3xl font-bold text-foreground tabular-nums placeholder:text-muted-foreground/50 focus:border-alert-orange focus:outline-none transition-colors"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted-foreground">
                ₸
              </span>
            </div>
          </div>

          {/* Account selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Откуда взять
            </label>
            <div className="space-y-2">
              {activeAccounts.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => setSelectedAccount(acc.name)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                    selectedAccount === acc.name
                      ? "border-alert-orange bg-alert-orange/10"
                      : "border-border bg-surface-raised hover:border-muted-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        selectedAccount === acc.name
                          ? "border-alert-orange"
                          : "border-muted-foreground"
                      }`}
                    >
                      {selectedAccount === acc.name && (
                        <div className="w-2 h-2 rounded-full bg-alert-orange" />
                      )}
                    </div>
                    <span className="font-semibold text-foreground">{acc.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground font-tabular">
                    {formatAmount(acc.balance)} ₸
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Type selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Тип расхода
            </label>
            <div className="space-y-2">
              {typeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setType(opt.value)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                    type === opt.value
                      ? "border-safe-green bg-safe-green/10"
                      : "border-border bg-surface-raised hover:border-muted-foreground"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                      type === opt.value ? "border-safe-green" : "border-muted-foreground"
                    }`}
                  >
                    {type === opt.value && (
                      <div className="w-2 h-2 rounded-full bg-safe-green" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      {opt.label}
                    </div>
                    <div className="text-xs text-muted-foreground">{opt.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Conditional: Obligation selector */}
          {type === "obligation" && unpaidObligations.length > 0 && (
            <div className="space-y-1.5 animate-fade-in-up">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Какой платёж?
              </label>
              <div className="flex flex-wrap gap-2">
                {unpaidObligations.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setSelectedObligId(o.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      selectedObligId === o.id
                        ? "bg-alert-orange text-white"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {o.name} ({formatAmount(o.monthlyPayment)} ₸)
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conditional: Savings target */}
          {type === "savings" && (
            <div className="space-y-1.5 animate-fade-in-up">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Куда положить?
              </label>
              <div className="space-y-2">
                <button
                  onClick={() => setSavingsTarget("virtual")}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                    savingsTarget === "virtual"
                      ? "border-safe-green bg-safe-green/10"
                      : "border-border bg-surface-raised"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                      savingsTarget === "virtual"
                        ? "border-safe-green"
                        : "border-muted-foreground"
                    }`}
                  >
                    {savingsTarget === "virtual" && (
                      <div className="w-2 h-2 rounded-full bg-safe-green" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      Просто отметить
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Виртуально зарезервировать
                    </div>
                  </div>
                </button>
                {inactiveAccounts.length > 0 && (
                  <button
                    onClick={() => setSavingsTarget("transfer")}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                      savingsTarget === "transfer"
                        ? "border-safe-green bg-safe-green/10"
                        : "border-border bg-surface-raised"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                        savingsTarget === "transfer"
                          ? "border-safe-green"
                          : "border-muted-foreground"
                      }`}
                    >
                      {savingsTarget === "transfer" && (
                        <div className="w-2 h-2 rounded-full bg-safe-green" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground">
                        На депозит (физически)
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Перевести на сберегательный счёт
                      </div>
                    </div>
                  </button>
                )}
              </div>
              {savingsTarget === "transfer" && inactiveAccounts.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {inactiveAccounts.map((acc) => (
                    <button
                      key={acc.id}
                      onClick={() => setToAccount(acc.name)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        toAccount === acc.name
                          ? "bg-safe-green text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {acc.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Date selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Дата операции
            </label>
            <input
              type="date"
              value={operationDate}
              onChange={(e) => setOperationDate(e.target.value)}
              className="w-full bg-surface-raised border border-border rounded-xl px-3 py-2 text-sm text-foreground"
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
              className="flex-1 py-3.5 rounded-xl bg-alert-orange text-white font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            >
              Сохранить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
