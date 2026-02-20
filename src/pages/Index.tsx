import { useState } from "react";
import BottomNav from "@/components/BottomNav";
import Today from "@/pages/Today";
import Accounts from "@/pages/Accounts";
import Settings from "@/pages/Settings";
import { useFinance } from "@/hooks/useFinance";
import { Toaster } from "@/components/ui/toaster";

type Tab = "today" | "accounts" | "settings";

const Index = () => {
  const [activeTab, setActiveTab] = useState<Tab>("today");
  const finance = useFinance();

  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="w-full max-w-app relative">
        {/* Page content */}
        <div className="overflow-y-auto scrollbar-hide">
          {activeTab === "today" && <Today finance={finance} />}
          {activeTab === "accounts" && <Accounts finance={finance} />}
          {activeTab === "settings" && <Settings finance={finance} />}
        </div>

        {/* Bottom navigation */}
        <BottomNav active={activeTab} onChange={setActiveTab} />
      </div>
      <Toaster />
    </div>
  );
};

export default Index;
