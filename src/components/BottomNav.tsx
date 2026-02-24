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
  <nav className="fixed bottom-4 left-0 right-0 z-40">
    <div className="flex justify-center">
      <div
        className="glass-nav flex items-center rounded-full"
        style={{
          minWidth: 280,
          maxWidth: 320,
          padding: "8px 8px",
          paddingBottom: "calc(8px + env(safe-area-inset-bottom))",
        }}
      >
        {tabs.map(({ id, label, Icon }, index) => {
          const isActive = active === id;
          const isFirst = index === 0;

          return (
            <div
              key={id}
              className="flex-1 flex items-center justify-center relative"
            >
              <button
                onClick={() => onChange(id)}
                className={`flex flex-col items-center gap-1 py-1.5 px-4 transition-all duration-200 ease-out active:scale-95 ${
                  isActive ? "text-safe-green" : "text-muted-foreground"
                }`}
                style={{
                  transform: isActive
                    ? "translateY(-1px) scale(1.02)"
                    : "translateY(0) scale(1)",
                }}
              >
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.4 : 1.8}
                  className="transition-all duration-200"
                  style={{
                    transform: isActive ? "scale(1.06)" : "scale(1)",
                  }}
                />
                <span
                  className={`tracking-wider transition-all duration-150 ${
                    isActive ? "font-semibold" : "font-medium"
                  }`}
                  style={{ fontSize: "9px" }}
                >
                  {label}
                </span>
              </button>

              {isFirst && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-px bg-white/15" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  </nav>
);

}
