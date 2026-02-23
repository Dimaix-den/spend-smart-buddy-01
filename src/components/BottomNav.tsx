import { Home, Landmark } from "lucide-react";

type Tab = "today" | "capital";

interface BottomNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
}

export default function BottomNav({ active, onChange }: BottomNavProps) {
  const tabs: {id: Tab;label: string;Icon: typeof Home;}[] = [
  { id: "today", label: "СЕГОДНЯ", Icon: Home },
  { id: "capital", label: "КАПИТАЛ", Icon: Landmark }];


  return (
    <nav className="fixed bottom-3 left-3 right-3 z-40 max-w-app mx-auto">
      <div className="flex items-center glass-nav px-2 py-1 rounded-full" style={{ paddingBottom: "calc(8px + env(safe-area-inset-bottom))" }}>
        {tabs.map(({ id, label, Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 transition-all duration-300 relative active:scale-95 ${
              isActive ? "text-safe-green" : "text-muted-foreground"}`
              }>

              <Icon
                size={22}
                strokeWidth={isActive ? 2.5 : 1.8}
                className="transition-all duration-300"
                style={{ transform: isActive ? "scale(1.05)" : "scale(1)" }} />

              <span
                className={`tracking-wider transition-all duration-300 ${isActive ? "font-semibold" : "font-medium"}`}
                style={{ fontSize: "10px" }}>

                {label}
              </span>
            </button>);

        })}
      </div>
    </nav>);

}