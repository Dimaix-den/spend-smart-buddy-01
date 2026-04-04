import { useState, useRef, useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import Today, { TodayFAB } from "@/pages/Today";
import Plans from "@/pages/Plans";
import Capital from "@/pages/Capital";
import EntityDetail from "@/pages/EntityDetail";
import History from "@/pages/History";
import Settings from "@/pages/Settings";
import LoginScreen from "@/components/LoginScreen";
import UnifiedActionSheet from "@/components/UnifiedActionSheet";
import { useFinance, Expense } from "@/hooks/useFinance";
import { useAuth } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/hooks/use-toast";
import { formatAmount } from "@/lib/formatAmount";

type Tab = "today" | "plans" | "capital" | "settings";

const TAB_ORDER: Tab[] = ["today", "plans", "capital", "settings"];

const Index = () => {
  const {
    user,
    loading: authLoading,
    isGuest,
    signInWithGoogle,
    continueAsGuest,
    logout,
    switchAccount,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>("today");
  const [detailAccountId, setDetailAccountId] = useState<string | null>(null);
  const [detailObligationId, setDetailObligationId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [hasOverduePlans, setHasOverduePlans] = useState(false);

  // Для гостя используем guest uid — данные хранятся локально
  const finance = useFinance(user?.uid ?? (isGuest ? "guest" : undefined));

  const prevTabRef = useRef<Tab>("today");
  const [tabKey, setTabKey] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const handleTabChange = (newTab: Tab) => {
    if (newTab === activeTab) return;
    const oldIndex = TAB_ORDER.indexOf(activeTab);
    const newIndex = TAB_ORDER.indexOf(newTab);
    prevTabRef.current = activeTab;
    setActiveTab(newTab);
    setTabKey((k) => k + 1);
  };

  // Auth loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1
            className="text-3xl font-extrabold mb-2"
            style={{ color: "hsl(162 100% 33%)" }}
          >
            SANDA
          </h1>
          <p className="text-sm text-muted-foreground animate-pulse">
            Загрузка...
          </p>
        </div>
      </div>
    );
  }

  // Not authenticated and not guest — show login
  if (!user && !isGuest) {
    return (
      <LoginScreen
        onSignIn={signInWithGoogle}
        onContinueAsGuest={continueAsGuest}
      />
    );
  }

  // Firestore loading (only for authenticated users)
  if (user && finance.firestoreLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1
            className="text-3xl font-extrabold mb-2"
            style={{ color: "hsl(162 100% 33%)" }}
          >
            SANDA
          </h1>
          <p className="text-sm text-muted-foreground animate-pulse">
            Загружаем данные...
          </p>
        </div>
      </div>
    );
  }

  if (showHistory) {
    return (
      <div className="min-h-screen bg-background flex justify-center">
        <div className="w-full max-w-app relative">
          <History finance={finance} onBack={() => setShowHistory(false)} />
        </div>
        <Toaster />
      </div>
    );
  }

  if (detailAccountId) {
    return (
      <div className="min-h-screen bg-background flex justify-center">
        <div className="w-full max-w-app relative">
          <EntityDetail
            finance={finance}
            entityId={detailAccountId}
            entityType="account"
            onBack={() => setDetailAccountId(null)}
          />
        </div>
        <Toaster />
      </div>
    );
  }

  if (detailObligationId) {
    return (
      <div className="min-h-screen bg-background flex justify-center">
        <div className="w-full max-w-app relative">
          <EntityDetail
            finance={finance}
            entityId={detailObligationId}
            entityType="obligation"
            onBack={() => setDetailObligationId(null)}
          />
        </div>
        <Toaster />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="w-full max-w-app relative">
        <div className="overflow-y-auto scrollbar-hide">
          <div key={tabKey} className="tab-fade">
            {activeTab === "today" && (
              <Today
                finance={finance}
                onShowHistory={() => setShowHistory(true)}
                onOpenSheet={(expense) => {
                  setEditingExpense(expense || null);
                  setSheetOpen(true);
                }}
              />
            )}
            {activeTab === "plans" && (
              <Plans
                finance={finance}
                onOverdueChange={setHasOverduePlans}
                onOpenActionSheet={(prefill) => {
                  setEditingExpense(null);
                  setSheetOpen(true);
                  // The sheet will open; we store prefill in a ref to apply
                  planPrefillRef.current = prefill;
                }}
              />
            )}
            {activeTab === "capital" && (
              <Capital
                finance={finance}
                onOpenAccount={(id) => setDetailAccountId(id)}
                onOpenObligation={(id) => setDetailObligationId(id)}
              />
            )}
            {activeTab === "settings" && (
              <Settings
                finance={finance}
                user={user}
                isGuest={isGuest}
                onLogout={logout}
                onSignIn={signInWithGoogle}
                onSwitchAccount={switchAccount}
              />
            )}
          </div>
        </div>
        <BottomNav
          active={activeTab}
          onChange={handleTabChange}
          hasOverduePlans={hasOverduePlans}
        />
      </div>

      {activeTab === "today" && (
        <TodayFAB
          onClick={() => {
            setEditingExpense(null);
            setSheetOpen(true);
          }}
          isOpen={sheetOpen}
        />
      )}

      <UnifiedActionSheet
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          setEditingExpense(null);
        }}
        onSaveExpense={(amount, account, type, opts) => {
          finance.addExpense(amount, account, type, opts);
          const label =
            type === "savings" || type === "transfer"
              ? "💰 Переведено"
              : type === "obligation"
              ? "✅ Платёж"
              : "✅ Расход";
          toast({
            description: `${label}: ${formatAmount(amount)} ₸`,
            duration: 2000,
          });
        }}
        onSaveIncome={(amount, account, note, date, plannedExpenseId) => {
          finance.addIncome(amount, account, note, date, plannedExpenseId);
          toast({
            description: `💰 Доход: +${formatAmount(amount)} ₸`,
            duration: 2000,
          });
        }}
        onDeleteExpense={(id) => finance.deleteExpense(id)}
        accounts={finance.state.accounts}
        obligations={finance.state.obligations}
        editingExpense={editingExpense}
        plannedExpenses={finance.state.plannedExpenses || []}
      />

      <Toaster />
    </div>
  );
};

export default Index;
