import { useState } from "react";
import BottomNav from "@/components/BottomNav";
import Today from "@/pages/Today";
import Capital from "@/pages/Capital";
import AccountDetail from "@/pages/AccountDetail";
import History from "@/pages/History";
import { useFinance } from "@/hooks/useFinance";
import { Toaster } from "@/components/ui/toaster";

type Tab = "today" | "capital";

const Index = () => {
  const [activeTab, setActiveTab] = useState<Tab>("today");
  const [detailAccountId, setDetailAccountId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const finance = useFinance();

  // ... все твои if условия для модалок БЕЗ ИЗМЕНЕНИЙ

  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="w-full max-w-app relative">
        <div className="overflow-y-auto scrollbar-hide">
          {activeTab === "today" && (
            <Today finance={finance} onShowHistory={() => setShowHistory(true)} />
          )}
          {activeTab === "capital" && (
            <Capital finance={finance} onOpenAccount={(id) => setDetailAccountId(id)} />
          )}
        </div>
        <BottomNav active={activeTab} onChange={setActiveTab} />
      </div>
      <Toaster />
    </div>
  );
};

export default Index;
