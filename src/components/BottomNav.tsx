import { Home, CalendarDays, Landmark, Settings } from "lucide-react";

type Tab = "today" | "plans" | "capital" | "settings";

interface BottomNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
}

export default function BottomNav({ active, onChange }: BottomNavProps) {
  const tabs: { id: Tab; label: string; Icon: typeof Home }[] = [
    { id: "today", label: "Сегодня", Icon: Home },
    { id: "plans", label: "Планы", Icon: CalendarDays },
    { id: "capital", label: "Капитал", Icon: Landmark },
    { id: "settings", label: "Настройки", Icon: Settings },
  ];

  return (
    <>
      <style>{`
        .ios26-nav {
          background: rgba(20, 20, 22, 0.55);
          backdrop-filter: blur(40px) saturate(200%) brightness(1.1);
          -webkit-backdrop-filter: blur(40px) saturate(200%) brightness(1.1);
          border: 0.5px solid rgba(255, 255, 255, 0.14);
          box-shadow:
            0 0 0 0.5px rgba(0,0,0,0.4),
            0 8px 32px rgba(0,0,0,0.5),
            inset 0 1px 0 rgba(255,255,255,0.12),
            inset 0 -1px 0 rgba(0,0,0,0.2);
        }

        .ios26-tab-btn {
          transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1),
                      background 0.3s ease,
                      box-shadow 0.3s ease;
          -webkit-tap-highlight-color: transparent;
        }

        .ios26-tab-btn:active {
          transform: scale(0.88) !important;
        }

        .ios26-icon-active {
          filter: drop-shadow(0 0 6px hsl(162 100% 33% / 0.6));
        }

        @keyframes ios26-pop {
          0% { transform: scale(0.8); opacity: 0; }
          60% { transform: scale(1.08); }
          100% { transform: scale(1); opacity: 1; }
        }

        .ios26-label-active {
          animation: ios26-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
      `}</style>

      <nav
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
        style={{ width: "calc(100% - 32px)", maxWidth: 420 }}
      >
        <div
          className="ios26-nav flex items-center"
          style={{
            borderRadius: "200px",
            padding: "6px",
            paddingBottom: `calc(6px + env(safe-area-inset-bottom, 0px))`,
            gap: "4px",
          }}
        >
          {tabs.map(({ id, label, Icon }) => {
            const isActive = active === id;

            return (
              <button
                key={id}
                onClick={() => onChange(id)}
                className="ios26-tab-btn flex-1 flex flex-col items-center justify-center gap-1"
                style={{
                  borderRadius: "200px",
                  padding: "10px 4px 8px",
                  transform: isActive ? "scale(1)" : "scale(0.97)",
                  background: isActive ? "rgba(255,255,255,0.1)" : "transparent",
                  boxShadow: isActive
                    ? "inset 0 0.5px 0 rgba(255,255,255,0.2), inset 0 -0.5px 0 rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.25)"
                    : "none",
                }}
              >
                <div
                  className={isActive ? "ios26-icon-active" : ""}
                  style={{ transition: "all 0.25s ease" }}
                >
                  <Icon
                    size={22}
                    strokeWidth={isActive ? 2.2 : 1.6}
                    color={isActive ? "hsl(162 100% 40%)" : "rgba(255,255,255,0.45)"}
                  />
                </div>
                <span
                  className={isActive ? "ios26-label-active" : ""}
                  style={{
                    fontSize: "9.5px",
                    fontWeight: isActive ? 600 : 400,
                    letterSpacing: "0.01em",
                    color: isActive ? "hsl(162 100% 40%)" : "rgba(255,255,255,0.4)",
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
                    transition: "color 0.2s ease",
                  }}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
