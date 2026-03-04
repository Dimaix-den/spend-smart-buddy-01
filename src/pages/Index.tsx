import { useState } from "react";
import BottomNav from "@/components/BottomNav";
import Today from "@/pages/Today";
import Plans from "@/pages/Plans";
import Capital from "@/pages/Capital";
import AccountDetail from "@/pages/AccountDetail";
import ObligationDetail from "@/pages/ObligationDetail";
import History from "@/pages/History";
import Settings from "@/pages/Settings";
import LoginScreen from "@/components/LoginScreen";
import { useFinance } from "@/hooks/useFinance";
import { useAuth } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/toaster";

type Tab = "today" | "plans" | "capital" | "settings";

const Index = () => {
  const { user, loading: authLoading, signInWithGoogle, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("today");
  const [detailAccountId, setDetailAccountId] = useState<string | null>(null);
  const [detailObligationId, setDetailObligationId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const finance = useFinance(user?.uid);

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
          {activeTab === "today" && (
            <Today finance={finance} onShowHistory={() => setShowHistory(true)} />
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
        <BottomNav active={activeTab} onChange={setActiveTab} />
      </div>
      <Toaster />
    </div>
  );
};

export default Index;
