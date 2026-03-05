import { Home, CalendarDays, Landmark, Settings } from "lucide-react";

type Tab = "today" | "plans" | "capital" | "settings";

interface BottomNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
}

export default function BottomNav({ active, onChange }: BottomNavProps) {
  const tabs: { id: Tab; label: string; Icon: typeof Home }[] = [
    { id: "today", label: "СЕГОДНЯ", Icon: Home },
    { id: "plans", label: "ПЛАНЫ", Icon: CalendarDays },
    { id: "capital", label: "КАПИТАЛ", Icon: Landmark },
    { id: "settings", label: "НАСТРОЙКИ", Icon: Settings },
  ];

  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
      <div
        className="glass-nav flex items-center rounded-full"
        style={{
          minWidth: 320,
          maxWidth: 420,
          padding: "6px 8px",
          paddingBottom: "calc(6px + env(safe-area-inset-bottom))",
        }}
      >
        {tabs.map(({ id, label, Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={`flex-1 flex flex-col items-center gap-1 py-2 px-2 rounded-2xl transition-all duration-200 ease-out active:scale-95 ${
                isActive ? "bg-primary/10" : ""
              }`}
            >
              <Icon
                size={18}
                strokeWidth={isActive ? 2.4 : 1.8}
                className="transition-all duration-200"
                style={{ color: isActive ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}
              />
              <span
                className="tracking-wider transition-all duration-150"
                style={{
                  fontSize: "8px",
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                }}
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