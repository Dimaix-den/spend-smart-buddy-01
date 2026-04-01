import { useState } from "react";
import { useFinance } from "@/hooks/useFinance";
import { LogOut, LogIn, RefreshCw } from "lucide-react";
import { User } from "firebase/auth";

interface SettingsProps {
  finance: ReturnType<typeof useFinance>;
  user: User | null;
  isGuest: boolean;
  onLogout: () => Promise<void>;
  onSignIn: () => Promise<void>;
  onSwitchAccount: () => Promise<void>;
}

import ToggleSwitch from "@/components/ToggleSwitch";

export default function Settings({ finance, user, isGuest, onLogout, onSignIn, onSwitchAccount }: SettingsProps) {
  const { state, updateSettings } = finance;
  const [signingIn, setSigningIn] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [signInError, setSignInError] = useState("");

  const [periodType, setPeriodType] = useState<"calendar" | "salary">(state.budgetPeriodType || "calendar");
  const [salaryDay, setSalaryDay] = useState(state.salaryDay || 15);
  const includePlans = state.includePlansInCalculation ?? true;

  const handlePeriodChange = (type: "calendar" | "salary") => {
    setPeriodType(type);
    updateSettings({ budgetPeriodType: type, salaryDay });
  };

  const handleDayChange = (day: number) => {
    setSalaryDay(day);
    updateSettings({ budgetPeriodType: periodType, salaryDay: day });
  };

  const handleSignIn = async () => {
    setSigningIn(true);
    setSignInError("");
    try {
      await onSignIn();
    } catch (e: any) {
      setSignInError(e.message);
    } finally {
      setSigningIn(false);
    }
  };

  const handleSwitch = async () => {
    setSwitching(true);
    setSignInError("");
    try {
      await onSwitchAccount();
    } catch (e: any) {
      setSignInError(e.message);
    } finally {
      setSwitching(false);
    }
  };

  const days = Array.from({ length: 28 }, (_, i) => i + 1);

  return (
    <div className="flex flex-col min-h-screen pb-28">
      <div className="px-5 pt-10 pb-6">
        <h1 className="text-2xl font-bold text-foreground">Настройки</h1>
      </div>

      <div className="flex-1 px-4 space-y-6">

        {/* Account */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">Аккаунт</h2>

          {isGuest ? (
            <div className="glass-card p-4 space-y-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Гостевой режим</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Данные хранятся только на этом устройстве. Войди через Google чтобы синхронизировать.
                </p>
              </div>
              <button
                onClick={handleSignIn}
                disabled={signingIn}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[10px] text-sm font-bold text-white disabled:opacity-50"
                style={{ background: "hsl(162 100% 33%)" }}
              >
                <LogIn size={16} />
                {signingIn ? "Входим..." : "Войти через Google"}
              </button>
              {signInError && <p className="text-xs text-destructive text-center">{signInError}</p>}
              <button
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[10px] text-sm font-semibold text-destructive"
                style={{ background: "hsl(0 0% 18%)" }}
              >
                <LogOut size={16} /> Выйти из гостевого режима
              </button>
            </div>
          ) : (
            <div className="glass-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{user?.displayName || "Пользователь"}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                {user?.photoURL && (
                  <img src={user.photoURL} alt="" className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
                )}
              </div>
              <button
                onClick={handleSwitch}
                disabled={switching}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[10px] text-sm font-semibold text-foreground disabled:opacity-50"
                style={{ background: "hsl(0 0% 18%)" }}
              >
                <RefreshCw size={16} className={switching ? "animate-spin" : ""} />
                {switching ? "Переключаем..." : "Сменить аккаунт"}
              </button>
              {signInError && <p className="text-xs text-destructive text-center">{signInError}</p>}
              <button
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[10px] text-sm font-semibold text-destructive"
                style={{ background: "hsl(0 0% 18%)" }}
              >
                <LogOut size={16} /> Выйти из аккаунта
              </button>
            </div>
          )}
        </div>

        {/* Budget Period */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">Период бюджета</h2>
          <div className="glass-card p-4 space-y-4">
            <button onClick={() => handlePeriodChange("calendar")} className="w-full flex items-start gap-3 text-left">
              <div className="w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center mt-0.5"
                style={{ borderColor: periodType === "calendar" ? "hsl(162 100% 33%)" : "hsl(0 0% 40%)" }}>
                {periodType === "calendar" && <div className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(162 100% 33%)" }} />}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Календарный месяц</p>
                <p className="text-xs text-muted-foreground mt-0.5">1-е — последнее число месяца</p>
              </div>
            </button>
            <button onClick={() => handlePeriodChange("salary")} className="w-full flex items-start gap-3 text-left">
              <div className="w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center mt-0.5"
                style={{ borderColor: periodType === "salary" ? "hsl(162 100% 33%)" : "hsl(0 0% 40%)" }}>
                {periodType === "salary" && <div className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(162 100% 33%)" }} />}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">От зарплаты до зарплаты</p>
                <p className="text-xs text-muted-foreground mt-0.5">Бюджет считается от дня зарплаты</p>
              </div>
            </button>
            {periodType === "salary" && (
              <div className="pl-8 animate-fade-in-up">
                <label className="text-xs text-muted-foreground mb-2 block">Дата зарплаты</label>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                  {days.map((d) => (
                    <button key={d} onClick={() => handleDayChange(d)}
                      className="flex-shrink-0 w-10 h-10 rounded-[10px] text-sm font-semibold transition-all"
                      style={{
                        background: salaryDay === d ? "hsl(162 100% 33%)" : "hsl(0 0% 18%)",
                        color: salaryDay === d ? "white" : "hsl(0 0% 60%)",
                      }}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Plans in calculation */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">Расчёты</h2>
          <div className="glass-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 pr-4">
                <p className="text-sm font-medium text-foreground">Учитывать планы</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Включить планируемые доходы/расходы в «Можешь потратить»
                </p>
              </div>
              <ToggleSwitch on={includePlans} onToggle={() => updateSettings({ includePlansInCalculation: !includePlans })} />
            </div>
          </div>
        </div>

        {/* Currency */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">Валюта</h2>
          <div className="glass-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Основная валюта</span>
              <span className="text-sm font-semibold text-muted-foreground">KZT ₸</span>
            </div>
          </div>
        </div>

        {/* About */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">О приложении</h2>
          <div className="glass-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">SANDA</span>
              <span className="text-xs text-muted-foreground">v2.0.0</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Личный финансовый помощник. Контролируй расходы, следи за бюджетом.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
