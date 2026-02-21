import { useState } from "react";
import { Plus, Pencil, Check, X, Wallet } from "lucide-react";
import { useFinance, Account } from "@/hooks/useFinance";
import { formatAmount } from "@/lib/formatAmount";

interface AccountsProps {
  finance: ReturnType<typeof useFinance>;
}

function AccountCard({
  account,
  onToggle,
  onUpdateBalance,
  onUpdateName,
  onDelete,
}: {
  account: Account;
  onToggle: (id: string) => void;
  onUpdateBalance: (id: string, balance: number) => void;
  onUpdateName: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editingBalance, setEditingBalance] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [balanceInput, setBalanceInput] = useState(account.balance.toString());
  const [nameInput, setNameInput] = useState(account.name);

  const saveBalance = () => {
    const val = parseFloat(balanceInput.replace(/[^\d.]/g, ""));
    if (!isNaN(val)) onUpdateBalance(account.id, val);
    setEditingBalance(false);
  };

  const saveName = () => {
    if (nameInput.trim()) onUpdateName(account.id, nameInput.trim());
    setEditingName(false);
  };

  return (
    <div className={`glass-card p-4 animate-slide-in transition-all duration-300 ${
      !account.isActive ? "opacity-50" : ""
    }`}>
      <div className="flex items-center justify-between mb-3">
        {/* Account name */}
        <div className="flex-1 mr-3">
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveName()}
                className="glass-input px-2 py-1 text-sm font-semibold text-foreground focus:outline-none w-full"
                style={{ borderColor: "hsl(162 100% 33%)" }}
              />
              <button onClick={saveName} className="text-safe-green flex-shrink-0"><Check size={14} /></button>
              <button onClick={() => setEditingName(false)} className="text-muted-foreground flex-shrink-0"><X size={14} /></button>
            </div>
          ) : (
            <button
              onClick={() => { setEditingName(true); setNameInput(account.name); }}
              className="flex items-center gap-1.5 group"
            >
              <span className="font-bold text-foreground">{account.name}</span>
              <Pencil size={11} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
          {!account.isActive && (
            <p className="text-xs text-muted-foreground mt-0.5">Не входит в бюджет</p>
          )}
        </div>

        {/* Toggle — fixed alignment */}
        <button
          onClick={() => onToggle(account.id)}
          className="relative w-[52px] h-[32px] rounded-full transition-colors duration-300 flex-shrink-0"
          style={{
            background: account.isActive
              ? "linear-gradient(135deg, hsl(162 100% 38%), hsl(162 100% 28%))"
              : "hsla(240, 25%, 22%, 0.8)",
          }}
        >
          <span
            className="absolute top-[3px] w-[26px] h-[26px] rounded-full shadow-md transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
            style={{
              background: "hsl(var(--foreground))",
              transform: account.isActive ? "translateX(23px)" : "translateX(3px)",
            }}
          />
        </button>
      </div>

      {/* Balance */}
      <div className="flex items-center justify-between">
        {editingBalance ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              autoFocus
              type="number"
              value={balanceInput}
              onChange={(e) => setBalanceInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveBalance()}
              className="glass-input px-3 py-1.5 text-xl font-bold text-foreground font-tabular focus:outline-none w-full"
              style={{ borderColor: "hsl(162 100% 33%)" }}
            />
            <span className="text-foreground font-bold">₸</span>
            <button onClick={saveBalance} className="text-safe-green"><Check size={16} /></button>
            <button onClick={() => setEditingBalance(false)} className="text-muted-foreground"><X size={16} /></button>
          </div>
        ) : (
          <button
            onClick={() => { setEditingBalance(true); setBalanceInput(account.balance.toString()); }}
            className="group flex items-center gap-1.5"
          >
            <span className="text-2xl font-bold font-tabular text-foreground">
              {formatAmount(account.balance)} ₸
            </span>
            <Pencil size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        )}

        <button
          onClick={() => onDelete(account.id)}
          className="ml-2 text-muted-foreground hover:text-destructive transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

function AddAccountForm({ onAdd, onCancel }: { onAdd: (name: string, balance: number, active: boolean) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [isActive, setIsActive] = useState(true);

  const handleSubmit = () => {
    if (!name.trim()) return;
    const bal = parseFloat(balance.replace(/[^\d.]/g, "")) || 0;
    onAdd(name.trim(), bal, isActive);
  };

  return (
    <div className="glass-card-raised p-4 animate-slide-in space-y-3">
      <h3 className="text-sm font-bold text-foreground">Новый счёт</h3>
      <input
        autoFocus
        placeholder="Название счёта"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full glass-input px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
      />
      <div className="relative">
        <input
          type="number"
          placeholder="0"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          className="w-full glass-input px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none pr-8"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">₸</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-foreground">Активный счёт</span>
        <button
          onClick={() => setIsActive(!isActive)}
          className="relative w-[52px] h-[32px] rounded-full transition-colors duration-300"
          style={{
            background: isActive
              ? "linear-gradient(135deg, hsl(162 100% 38%), hsl(162 100% 28%))"
              : "hsla(240, 25%, 22%, 0.8)",
          }}
        >
          <span
            className="absolute top-[3px] w-[26px] h-[26px] rounded-full shadow-md transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
            style={{
              background: "hsl(var(--foreground))",
              transform: isActive ? "translateX(23px)" : "translateX(3px)",
            }}
          />
        </button>
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-[14px] border border-white/10 text-sm font-semibold text-foreground hover:bg-white/5 transition-colors">Отмена</button>
        <button onClick={handleSubmit} className="flex-1 py-2.5 rounded-[14px] text-sm font-bold hover:opacity-90 transition-opacity text-white" style={{ background: "linear-gradient(135deg, hsl(162 100% 38%), hsl(162 100% 28%))" }}>Добавить</button>
      </div>
    </div>
  );
}

export default function Accounts({ finance }: AccountsProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const {
    state,
    activeBalance,
    toggleAccount,
    updateAccountBalance,
    updateAccountName,
    addAccount,
    deleteAccount,
  } = finance;

  const totalBalance = state.accounts.reduce((s, a) => s + a.balance, 0);
  const activeAccounts = state.accounts.filter((a) => a.isActive);
  const inactiveAccounts = state.accounts.filter((a) => !a.isActive);

  return (
    <div className="flex flex-col min-h-screen pb-24">
      {/* Header */}
      <div className="px-5 pt-10 pb-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">Мои счета</h1>
        <div className="flex items-baseline gap-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Итого:</span>
          <span className="text-xl font-bold font-tabular text-foreground">{formatAmount(totalBalance)} ₸</span>
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <Wallet size={12} className="text-safe-green" />
          <span className="text-xs text-muted-foreground">В бюджете: <span className="text-safe-green font-semibold font-tabular">{formatAmount(activeBalance)} ₸</span></span>
        </div>
      </div>

      <div className="flex-1 px-4 space-y-4">
        {/* Active accounts */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
            Активные счета
          </h2>
          <div className="space-y-2">
            {activeAccounts.map((acc) => (
              <AccountCard
                key={acc.id}
                account={acc}
                onToggle={toggleAccount}
                onUpdateBalance={updateAccountBalance}
                onUpdateName={updateAccountName}
                onDelete={deleteAccount}
              />
            ))}
          </div>
        </div>

        {/* Inactive accounts */}
        {inactiveAccounts.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
              Сбережения / Неактивные
            </h2>
            <div className="space-y-2">
              {inactiveAccounts.map((acc) => (
                <AccountCard
                  key={acc.id}
                  account={acc}
                  onToggle={toggleAccount}
                  onUpdateBalance={updateAccountBalance}
                  onUpdateName={updateAccountName}
                  onDelete={deleteAccount}
                />
              ))}
            </div>
          </div>
        )}

        {/* Add form or button */}
        {showAddForm ? (
          <AddAccountForm
            onAdd={(name, balance, active) => {
              addAccount(name, balance, active);
              setShowAddForm(false);
            }}
            onCancel={() => setShowAddForm(false)}
          />
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-white/10 text-muted-foreground hover:border-safe-green hover:text-safe-green py-4 rounded-[20px] font-semibold text-sm transition-colors"
          >
            <Plus size={18} />
            Добавить счёт
          </button>
        )}
      </div>
    </div>
  );
}
