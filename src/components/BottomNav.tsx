import { Home, Landmark } from "lucide-react";

type Tab = "today" | "capital";

interface BottomNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
}

export default function BottomNav({ active, onChange }: BottomNavProps) {
  const tabs: { id: Tab; label: string; Icon: typeof Home }[] = [
    { id: "today", label: "СЕГОДНЯ", Icon: Home },
    { id: "capital", label: "КАПИТАЛ", Icon: Landmark },
  ];

  return (
    <nav className="fixed bottom-3 left-3 right-3 z-40 max-w-app mx-auto">
      <div
        className="flex items-center glass-nav px-1 py-1 rounded-[18px]"
        style={{ paddingBottom: "calc(4px + env(safe-area-inset-bottom))" }}
      >
        {tabs.map(({ id, label, Icon }) => {
          const isActive = active === id;

          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={`flex-1 flex flex-col items-center gap-1 py-2 px-2 transition-all duration-250 ease-out relative active:scale-95 ${
                isActive ? "text-safe-green" : "text-muted-foreground"
              }`}
              style={{
                transform: isActive
                  ? "translateY(-2px) scale(1.03)"
                  : "translateY(0) scale(1)",
              }}
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2.4 : 1.8}
                className="transition-all duration-250"
                style={{ transform: isActive ? "scale(1.06)" : "scale(1)" }}
              />

              <span
                className={`tracking-wider transition-all duration-200 ${
                  isActive ? "font-semibold" : "font-medium"
                }`}
                style={{ fontSize: "10px" }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
