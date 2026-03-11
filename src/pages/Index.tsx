import { useState, useRef } from "react";
import BottomNav from "@/components/BottomNav";
import Today, { TodayFAB } from "@/pages/Today";
import Plans from "@/pages/Plans";
import Capital from "@/pages/Capital";
import AccountDetail from "@/pages/AccountDetail";
import ObligationDetail from "@/pages/ObligationDetail";
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
  const { user, loading: authLoading, signInWithGoogle, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("today");
  const [detailAccountId, setDetailAccountId] = useState<string | null>(null);
  const [detailObligationId, setDetailObligationId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const finance = useFinance(user?.uid);
  const prevTabRef = useRef<Tab>("today");
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("right");
  const [tabKey, setTabKey] = useState(0);

  // FAB & action sheet state (lifted from Today)
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const handleTabChange = (newTab: Tab) => {
    if (newTab === activeTab) return;
    const oldIndex = TAB_ORDER.indexOf(activeTab);
    const newIndex = TAB_ORDER.indexOf(newTab);
    setSlideDirection(newIndex > oldIndex ? "left" : "right");
    prevTabRef.current = activeTab;
    setActiveTab(newTab);
    setTabKey(k => k + 1);
  };

  // Auth loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold mb-2" style={{ color: "hsl(162 100% 33%)" }}>SANDA</h1>
          <p className="text-sm text-muted-foreground animate-pulse">Загрузка...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <LoginScreen onSignIn={signInWithGoogle} />;
  }

  // Firestore loading
  if (finance.firestoreLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold mb-2" style={{ color: "hsl(162 100% 33%)" }}>SANDA</h1>
          <p className="text-sm text-muted-foreground animate-pulse">Загружаем данные...</p>
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

  if (detailObligationId) {
    return (
      <div className="min-h-screen bg-background flex justify-center">
        <div className="w-full max-w-app relative">
          <ObligationDetail
            finance={finance}
            obligationId={detailObligationId}
            onBack={() => setDetailObligationId(null)}
          />
        </div>
        <Toaster />
      </div>
    );
  }

  if (detailAccountId) {
    return (
      <div className="min-h-screen bg-background flex justify-center">
        <div className="w-full max-w-app relative">
          <AccountDetail
            finance={finance}
            accountId={detailAccountId}
            onBack={() => setDetailAccountId(null)}
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
          <div
            key={tabKey}
            className={slideDirection === "left" ? "tab-slide-left" : "tab-slide-right"}
          >
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
              <Plans finance={finance} />
            )}
            {activeTab === "capital" && (
              <Capital
                finance={finance}
                onOpenAccount={(id) => setDetailAccountId(id)}
                onOpenObligation={(id) => setDetailObligationId(id)}
              />
            )}
            {activeTab === "settings" && (
              <Settings finance={finance} user={user} onLogout={logout} />
            )}
          </div>
        </div>
        <BottomNav active={activeTab} onChange={handleTabChange} />
      </div>

      {/* FAB — outside animated container */}
      {activeTab === "today" && (
        <TodayFAB
          onClick={() => {
            setEditingExpense(null);
            setSheetOpen(true);
          }}
          isOpen={sheetOpen}
        />
      )}

      {/* Action Sheet — outside animated container */}
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
        onSaveIncome={(amount, account, note, date) => {
          finance.addIncome(amount, account, note, date);
          toast({
            description: `💰 Доход: +${formatAmount(amount)} ₸`,
            duration: 2000,
          });
        }}
        onDeleteExpense={(id) => finance.deleteExpense(id)}
        accounts={finance.state.accounts}
        obligations={finance.state.obligations}
        editingExpense={editingExpense}
      />

      <Toaster />
    </div>
  );
};

export default Index;
