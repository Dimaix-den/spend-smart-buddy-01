import { useState, useRef } from "react";
import { Plus, ChevronDown, ChevronUp, ChevronRight } from "lucide-react";
import { useFinance } from "@/hooks/useFinance";
import { formatAmount } from "@/lib/formatAmount";
import { toast } from "@/hooks/use-toast";
import MoneyInput from "@/components/MoneyInput";
import Carousel from "@/components/Carousel";

interface CapitalProps {
  finance: ReturnType<typeof useFinance>;
  onOpenAccount: (id: string) => void;
  onOpenObligation: (id: string) => void;
}

// утилита: разбить массив на чанки по size
function chunk<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

// убираем пробелы, неразрывные пробелы, запятые и всё, кроме цифр и точки
const parseAmount = (value: string): number => {
  if (!value) return 0;
  const cleaned = value
    .replace(/[\s\u00A0\u202F,]/g, "") // все виды пробелов и запятые
    .replace(/[^\d.]/g, "");           // всё, что не цифра и не точка
  const num = parseFloat(cleaned);
  return isNaN(num) || num <= 0 ? 0 : num;
};

export default function Capital({ finance, onOpenAccount, onOpenObligation }: CapitalProps) {
  const {
    state,
    activeAccounts,
    savingsAccounts,
    inactiveAccounts,
    totalDebt,
    totalAssetsValue,
    getSavingsForAccount,
    addAccount,
    addObligation,
    addAsset,
    deleteAsset,
  } = finance;

  const [showInactive, setShowInactive] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAddSavings, setShowAddSavings] = useState(false);
  const [showAddOblig, setShowAddOblig] = useState(false);
  const [showAddAsset, setShowAddAsset] = useState(false);

  // Add account form
  const [newAccName, setNewAccName] = useState("");
  const [newAccBalance, setNewAccBalance] = useState("");

  // Add savings form
  const [newSavName, setNewSavName] = useState("");
  const [newSavBalance, setNewSavBalance] = useState("");
  const [newSavGoal, setNewSavGoal] = useState("");

  // Add obligation form
  const [newObligName, setNewObligName] = useState("");
  const [newObligTotal, setNewObligTotal] = useState("");
  const [newObligMonthly, setNewObligMonthly] = useState("");
  const [newObligPaidMonths, setNewObligPaidMonths] = useState("");

  // Add asset form
  const [newAssetName, setNewAssetName] = useState("");
  const [newAssetValue, setNewAssetValue] = useState("");

  // Asset detail
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  // refs для форм
  const accFormRef = useRef<HTMLDivElement | null>(null);
  const savFormRef = useRef<HTMLDivElement | null>(null);
  const obligFormRef = useRef<HTMLDivElement | null>(null);
  const assetFormRef = useRef<HTMLDivElement | null>(null);

  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const accountsTotal = state.accounts
    .filter((a) => (a.type === "active" || a.type === "savings") && !a.isSystem)
    .reduce((s, a) => s + a.balance, 0);
  const totalAssets = accountsTotal + totalAssetsValue;
  const netWorth = totalAssets - totalDebt;

  const handleAddAccount = () => {
    if (!newAccName.trim()) return;
    const bal = parseAmount(newAccBalance);
    addAccount(newAccName.trim(), bal, "active");
    setNewAccName("");
    setNewAccBalance("");
    setShowAddAccount(false);
    toast({ description: "✅ Счёт добавлен", duration: 2000 });
  };

  const handleAddSavings = () => {
    if (!newSavName.trim()) return;
    const bal = parseAmount(newSavBalance);
    const goal = parseAmount(newSavGoal);

    addAccount(newSavName.trim(), bal, "savings", goal);
    setNewSavName("");
    setNewSavBalance("");
    setNewSavGoal("");
    setShowAddSavings(false);
    toast({ description: "✅ Сбережение добавлено", duration: 2000 });
  };

  const handleAddObligation = () => {
    if (!newObligName.trim()) return;
    const total = parseAmount(newObligTotal);
    const monthly = parseAmount(newObligMonthly);
    if (!monthly) return;
    const initialPaid = parseInt(newObligPaidMonths) || 0;
    addObligation(newObligName.trim(), total || monthly, monthly, initialPaid > 0 ? initialPaid : undefined);
    setNewObligName("");
    setNewObligTotal("");
    setNewObligMonthly("");
    setNewObligPaidMonths("");
    setShowAddOblig(false);
    toast({ description: "✅ Обязательство добавлено", duration: 2000 });
  };

  const handleAddAsset = () => {
    if (!newAssetName.trim()) return;
    const val = parseAmount(newAssetValue);
    if (!val) return;
    addAsset(newAssetName.trim(), val);
    setNewAssetName("");
    setNewAssetValue("");
    setShowAddAsset(false);
    toast({ description: "✅ Имущество добавлено", duration: 2000 });
  };

  const handleDeleteAsset = (id: string) => {
    deleteAsset(id);
    setSelectedAssetId(null);
    toast({ description: "🗑 Имущество удалено", duration: 2000 });
  };

  const autoMonths = (() => {
  const total = parseAmount(newObligTotal);
  const monthly = parseAmount(newObligMonthly);
    if (total > 0 && monthly > 0 && total > monthly) {
      return Math.ceil(total / monthly);
    }
    return null;
  })();

  const assets = state.assets || [];

  return (
    <div className="flex flex-col min-h-screen pb-28">
      {/* Header */}
      <div className="px-5 pt-10 pb-6">
        <h1 className="text-2xl font-bold text-foreground mb-4">Капитал</h1>
        <div
          className="rounded-[18px] p-4 space-y-2 border border-white/5"
          style={{
            background:
              "radial-gradient(circle at 0% 0%, rgba(2,255,255,0.06) 0%, transparent 55%), linear-gradient(135deg, hsl(220 15% 7%) 0%, hsl(220 15% 11%) 100%)",
            boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
          }}
        >
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Активы</span>
            <span className="font-bold font-tabular text-foreground">
              {formatAmount(totalAssets)} ₸
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Долговые обязательства</span>
            <span className="font-bold font-tabular text-alert-orange">
              {formatAmount(totalDebt)} ₸
            </span>
          </div>
          <div className="border-t border-white/10 pt-2 flex justify-between items-center">
            <span className="text-sm font-medium text-foreground">Чистый капитал</span>
            <span
              className={`text-xl font-bold font-tabular ${
                netWorth >= 0 ? "text-safe-green" : "text-destructive"
              }`}
            >
              {netWorth < 0 ? "−" : ""}
              {formatAmount(Math.abs(netWorth))} ₸
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 space-y-6">
        
      {/* ─── Active Accounts ──────── */}
      <div>
        <h2 className="text-S font-semibold tracking-wider mb-4 px-1">
          Активные счета
        </h2>

        <div className="grid grid-cols-2 gap-2">
          {activeAccounts.map((acc) => (
            <button
              key={acc.id}
              onClick={() => onOpenAccount(acc.id)}
              className="rounded-[12px] p-4 flex flex-col justify-between active:scale-[0.98] transition-transform text-left"
              style={{
                background:
                  "linear-gradient(135deg, hsl(0 0% 11%) 0%, hsl(0 0% 15%) 100%)",
              }}
            >
              <p className="font-semibold text-foreground text-sm truncate">
                {acc.name}
              </p>
              <p
                className={`text-lg font-bold font-tabular mt-1 ${
                  acc.balance < 0 ? "text-destructive" : "text-foreground"
                }`}
              >
                {acc.balance < 0 ? "−" : ""}
                {formatAmount(Math.abs(acc.balance))} ₸
              </p>
            </button>
          ))}

          {/* "Добавить счёт" как последняя карточка */}
          <button
            onClick={() => {
              setShowAddAccount(true);
              setTimeout(() => scrollTo(accFormRef), 0);
            }}
            className="rounded-[12px] p-4 flex flex-col items-center justify-center gap-2 active:scale-[0.98] transition-transform text-sm font-semibold text-muted-foreground"
            style={{
              background: "hsl(0 0% 6%)",
              border: "1px dashed rgba(255,255,255,0.12)",
            }}
          >
            <Plus size={18} className="text-safe-green" />
            <span>Добавить счёт</span>
          </button>
        </div>

        {showAddAccount && (
          <div
            ref={accFormRef}
            className="glass-card-raised p-4 mt-2 space-y-3 animate-fade-in-up"
          >
            <input
              autoFocus
              placeholder="Название"
              value={newAccName}
              onChange={(e) => setNewAccName(e.target.value)}
              className="w-full glass-input px-3 py-2.5 text-sm focus:outline-none"
            />
            <div className="relative">
              <MoneyInput
                placeholder="0"
                value={newAccBalance}
                onChange={setNewAccBalance}
                className="w-full glass-input px-3 py-2.5 text-sm focus:outline-none pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                ₸
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddAccount(false)}
                className="flex-1 py-2.5 rounded-[10px] text-sm font-semibold text-foreground"
                style={{ background: "hsl(0 0% 23%)" }}
              >
                Отмена
              </button>
              <button
                onClick={handleAddAccount}
                className="flex-1 py-2.5 rounded-[10px] text-sm font-bold text-white"
                style={{ background: "hsl(162 100% 33%)" }}
              >
                Добавить
              </button>
            </div>
          </div>
        )}
      </div>


        {/* ─── Inactive (collapsible) ──────────────────── */}
        {inactiveAccounts.length > 0 && (
          <div className="-mt-2">
            <button
              onClick={() => setShowInactive(!showInactive)}
              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.1em] text-foreground/40 mb-2 px-1"
            >
              Неактивные ({inactiveAccounts.length})
              {showInactive ? (
                <ChevronUp size={12} className="text-foreground/40" />
              ) : (
                <ChevronDown size={12} className="text-foreground/40" />
              )}
            </button>
            {showInactive && (
              <div className="space-y-2 animate-fade-in-up">
                {inactiveAccounts.map((acc) => (
                  <button
                    key={acc.id}
                    onClick={() => onOpenAccount(acc.id)}
                    className="w-full rounded-[12px] p-4 flex items-center justify-between opacity-60 active:scale-[0.98] transition-transform"
                    style={{
                      background: "hsl(0 0% 11%)",
                      borderLeft: "3px solid hsl(0 0% 30%)",
                    }}
                  >
                    <div className="text-left">
                      <p className="font-semibold text-foreground text-sm">{acc.name}</p>
                      <p className="text-lg font-bold font-tabular text-foreground">
                        {formatAmount(acc.balance)} ₸
                      </p>
                    </div>
                    <ChevronRight size={18} className="text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Savings ──────────────────────────── */}
        <div>
          <h2 className="text-S font-semibold tracking-wider mb-4 px-1">
            Сбережения
          </h2>
          <div className="space-y-2">
            {savingsAccounts.map((acc) => {
              const saved = getSavingsForAccount(acc.name);
              const goal = acc.monthlyGoal || 0;
              const pct = goal > 0 ? Math.min(100, Math.round((saved / goal) * 100)) : 0;
              return (
                <button
                  key={acc.id}
                  onClick={() => onOpenAccount(acc.id)}
                  className="w-full rounded-[12px] p-4 text-left active:scale-[0.98] transition-transform"
                  style={{
                    background:
                      "linear-gradient(135deg, hsl(0 0% 11%) 0%, hsl(120 23% 15%) 100%)",
                    borderLeft: "3px solid hsl(162 100% 33%)",
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-foreground text-sm">{acc.name}</p>
                    <p className="text-lg font-bold font-tabular text-foreground">
                      {formatAmount(acc.balance)} ₸
                    </p>
                  </div>
                  {goal > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Цель: {formatAmount(goal)} ₸/мес</span>
                        <span className="text-safe-green font-semibold">{pct}%</span>
                      </div>
                      <div
                        className="h-1.5 rounded-full overflow-hidden"
                        style={{ background: "hsl(0 0% 23%)" }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            background: "hsl(162 100% 33%)",
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Отложено:{" "}
                        <span className="text-safe-green font-semibold">
                          {formatAmount(saved)} ₸
                        </span>
                      </p>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          {showAddSavings ? (
            <div
              ref={savFormRef}
              className="glass-card-raised p-4 mt-2 space-y-3 animate-fade-in-up"
            >
              <input
                autoFocus
                placeholder="Название"
                value={newSavName}
                onChange={(e) => setNewSavName(e.target.value)}
                className="w-full glass-input px-3 py-2.5 text-sm focus:outline-none"
              />
              <div className="relative">
                <MoneyInput
                  placeholder="Текущий баланс"
                  value={newSavBalance}
                  onChange={setNewSavBalance}
                  className="w-full glass-input px-3 py-2.5 text-sm focus:outline-none pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  ₸
                </span>
              </div>
              <div className="relative">
                <MoneyInput
                  placeholder="Цель в месяц"
                  value={newSavGoal}
                  onChange={setNewSavGoal}
                  className="w-full glass-input px-3 py-2.5 text-sm focus:outline-none pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  ₸/мес
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddSavings(false)}
                  className="flex-1 py-2.5 rounded-[10px] text-sm font-semibold text-foreground"
                  style={{ background: "hsl(0 0% 23%)" }}
                >
                  Отмена
                </button>
                <button
                  onClick={handleAddSavings}
                  className="flex-1 py-2.5 rounded-[10px] text-sm font-bold text-white"
                  style={{ background: "hsl(162 100% 33%)" }}
                >
                  Добавить
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                setShowAddSavings(true);
                setTimeout(() => scrollTo(savFormRef), 0);
              }}
              className="w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-safe-green py-3 rounded-[12px] text-sm font-semibold transition-colors mt-2"
              style={{ background: "hsl(0 0% 5%)" }}
            >
              <Plus size={16} /> Добавить сбережение
            </button>
          )}
        </div>

        {/* ─── Obligations ──────── */}
        <div>
          <h2 className="text-S font-semibold tracking-wider mb-4 px-1">
            Обязательства
          </h2>
          <div className="space-y-2">
            {state.obligations.map((o) => {
              const isInstallment = o.totalAmount > o.monthlyPayment;
              const totalMonths = isInstallment
                ? Math.ceil(o.totalAmount / o.monthlyPayment)
                : 1;
              const pct = isInstallment
                ? Math.min(100, Math.round((o.paidMonths / totalMonths) * 100))
                : 0;
              const remaining = isInstallment ? totalMonths - o.paidMonths : 0;
              const remainingAmount = isInstallment
                ? Math.max(0, o.totalAmount - o.monthlyPayment * o.paidMonths)
                : o.monthlyPayment;

              return (
                <button
                  key={o.id}
                  onClick={() => onOpenObligation(o.id)}
                  className="w-full rounded-[12px] p-4 text-left active:scale-[0.98] transition-transform"
                  style={{
                    background:
                      "linear-gradient(135deg, hsl(28 51% 5%) 0%, hsl(28 51% 10%) 100%)",
                    borderLeft: "3px solid hsl(38 100% 52%)",
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-foreground">{o.name}</span>
                    <span className="text-lg font-bold font-tabular text-foreground">
                      {formatAmount(remainingAmount)} ₸
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatAmount(o.monthlyPayment)} ₸ в месяц
                  </p>

                  {isInstallment && (
                    <div className="mt-2 space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Прогресс</span>
                        <span className="text-alert-orange font-semibold">{pct}%</span>
                      </div>
                      <div
                        className="h-1.5 rounded-full overflow-hidden"
                        style={{ background: "hsl(0 0% 23%)" }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: "hsl(38 100% 52%)" }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Осталось: {remaining} из {totalMonths} месяцев
                      </p>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {showAddOblig ? (
            <div
              ref={obligFormRef}
              className="glass-card-raised p-4 mt-2 space-y-3 animate-fade-in-up"
            >
              <input
                autoFocus
                placeholder="Название"
                value={newObligName}
                onChange={(e) => setNewObligName(e.target.value)}
                className="w-full glass-input px-3 py-2.5 text-sm focus:outline-none"
              />
              <div className="relative">
                <MoneyInput
                  placeholder="Общая сумма"
                  value={newObligTotal}
                  onChange={setNewObligTotal}
                  className="w-full glass-input px-3 py-2.5 text-sm focus:outline-none pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  ₸
                </span>
              </div>
              <div className="relative">
                <MoneyInput
                  placeholder="Месячный платёж"
                  value={newObligMonthly}
                  onChange={setNewObligMonthly}
                  onKeyDown={(e) => e.key === "Enter" && handleAddObligation()}
                  className="w-full glass-input px-3 py-2.5 text-sm focus:outline-none pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  ₸
                </span>
              </div>
              {autoMonths && (
                <p className="text-xs text-muted-foreground px-1">
                  Срок: {autoMonths} месяцев
                </p>
              )}
              {autoMonths && autoMonths > 1 && (
                <div>
                  <label className="text-xs text-muted-foreground px-1 mb-1 block">
                    Уже оплачено месяцев
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="0"
                    value={newObligPaidMonths}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^\d]/g, "");
                      const num = parseInt(val);
                      if (val === "" || (num >= 0 && num < (autoMonths || 999))) {
                        setNewObligPaidMonths(val);
                      }
                    }}
                    className="w-full glass-input px-3 py-2.5 text-sm focus:outline-none"
                  />
                  {newObligPaidMonths && parseInt(newObligPaidMonths) > 0 && autoMonths && (
                    <p className="text-xs text-muted-foreground px-1 mt-1">
                      Осталось: {autoMonths - parseInt(newObligPaidMonths)} из {autoMonths} мес.
                    </p>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddOblig(false)}
                  className="flex-1 py-2.5 rounded-[10px] text-sm font-semibold text-foreground"
                  style={{ background: "hsl(0 0% 23%)" }}
                >
                  Отмена
                </button>
                <button
                  onClick={handleAddObligation}
                  className="flex-1 py-2.5 rounded-[10px] text-sm font-bold text_WHITE"
                  style={{ background: "hsl(162 100% 33%)" }}
                >
                  Добавить
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                setShowAddOblig(true);
                setTimeout(() => scrollTo(obligFormRef), 0);
              }}
              className="w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-safe-green py-3 rounded-[12px] text-sm font-semibold transition-colors mt-2"
              style={{ background: "hsl(0 0% 5%)" }}
            >
              <Plus size={16} /> Добавить обязательство
            </button>
          )}
        </div>

        {/* ─── Assets (Имущество) ──────── */}
        <div>
          <h2 className="text-S font-semibold tracking-wider mb-4 px-1">
            Имущества
          </h2>
          <div className="space-y-2">
            {assets.map((asset) => (
              <button
                key={asset.id}
                onClick={() =>
                  setSelectedAssetId(selectedAssetId === asset.id ? null : asset.id)
                }
                className="w-full rounded-[12px] p-4 flex items-center justify-between active:scale-[0.98] transition-transform"
                style={{
                  background:
                    "linear-gradient(135deg, hsl(220 40% 5%) 0%, hsl(220 46% 15%) 100%)",
                  borderLeft: "3px solid hsl(220 30% 33%)",
                }}
              >
                <p className="font-semibold text-foreground text-sm">{asset.name}</p>
                <p className="text-lg font-bold font-tabular text-foreground">
                  {formatAmount(asset.value)} ₸
                </p>
              </button>
            ))}

            {selectedAssetId && (
              <div className="glass-card-raised p-4 space-y-3 animate-fade-in-up">
                <p className="text-sm font-semibold text-foreground text-center">
                  {assets.find((a) => a.id === selectedAssetId)?.name}
                </p>
                <p className="text-2xl font-bold font-tabular text-foreground text-center">
                  {formatAmount(
                    assets.find((a) => a.id === selectedAssetId)?.value || 0
                  )}{" "}
                  ₸
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedAssetId(null)}
                    className="flex-1 py-2.5 rounded-[10px] text-sm font-semibold text-foreground"
                    style={{ background: "hsl(0 0% 23%)" }}
                  >
                    Закрыть
                  </button>
                  <button
                    onClick={() => handleDeleteAsset(selectedAssetId)}
                    className="flex-1 py-2.5 rounded-[10px] text-sm font-bold text-destructive"
                    style={{ background: "hsl(0 0% 18%)" }}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            )}
          </div>

          {showAddAsset ? (
            <div
              ref={assetFormRef}
              className="glass-card-raised p-4 mt-2 space-y-3 animate-fade-in-up"
            >
              <input
                autoFocus
                placeholder="Название (Квартира, Машина...)"
                value={newAssetName}
                onChange={(e) => setNewAssetName(e.target.value)}
                className="w-full glass-input px-3 py-2.5 text-sm focus:outline-none"
              />
              <div className="relative">
                <MoneyInput
                  placeholder="Стоимость"
                  value={newAssetValue}
                  onChange={setNewAssetValue}
                  onKeyDown={(e) => e.key === "Enter" && handleAddAsset()}
                  className="w-full glass-input px-3 py-2.5 text-sm focus:outline-none pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  ₸
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddAsset(false)}
                  className="flex-1 py-2.5 rounded-[10px] text-sm font-semibold text-foreground"
                  style={{ background: "hsl(0 0% 23%)" }}
                >
                  Отмена
                </button>
                <button
                  onClick={handleAddAsset}
                  className="flex-1 py-2.5 rounded-[10px] text-sm font-bold text-white"
                  style={{ background: "hsl(162 100% 33%)" }}
                >
                  Добавить
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                setShowAddAsset(true);
                setTimeout(() => scrollTo(assetFormRef), 0);
              }}
              className="w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-safe-green py-3 rounded-[12px] text-sm font-semibold transition-colors mt-2"
              style={{ background: "hsl(0 0% 5%)" }}
            >
              <Plus size={16} /> Добавить имущество
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
