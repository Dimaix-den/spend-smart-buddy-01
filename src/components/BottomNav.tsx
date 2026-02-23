import { Home, CreditCard, Settings } from "lucide-react";

type Tab = "today" | "accounts" | "settings";

interface BottomNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
}

export default function BottomNav({ active, onChange }: BottomNavProps) {
  const tabs: {id: Tab;label: string;Icon: typeof Home;}[] = [
  { id: "today", label: "СЕГОДНЯ", Icon: Home },
  { id: "accounts", label: "СЧЕТА", Icon: CreditCard },
  { id: "settings", label: "НАСТРОЙКИ", Icon: Settings }];


  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-app z-40 rounded-full">
      <div className="flex items-center glass-nav px-2 pb-safe">
        {tabs.map(({ id, label, Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 transition-all duration-300 relative active:scale-95 ${
              isActive ? "text-safe-green" : "text-muted-foreground opacity-60"}`
              }>

              <Icon
                size={22}
                strokeWidth={isActive ? 2.5 : 1.8}
                className="transition-all duration-300"
                style={{ transform: isActive ? "scale(1.1)" : "scale(1)" }} />

              <span
                className="font-semibold tracking-wider transition-all duration-300"
                style={{ fontSize: "9px" }}>

                {label}
              </span>
              {isActive &&
              <span
                className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-safe-green" />

              }
            </button>);

        })}
      </div>
    </nav>);

}