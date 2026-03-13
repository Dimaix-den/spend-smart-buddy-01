import { useState } from "react";

interface LoginScreenProps {
  onSignIn: () => Promise<void>;
  onContinueAsGuest: () => void;
}

export default function LoginScreen({ onSignIn, onContinueAsGuest }: LoginScreenProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignIn = async () => {
    setLoading(true);
    setError("");
    try {
      await onSignIn();
    } catch (err: any) {
      setError(err.message || "Ошибка входа");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: "linear-gradient(180deg, hsl(0 0% 0%) 0%, hsl(0 0% 8%) 100%)" }}
    >
      {/* Logo */}
      <div className="mb-8 text-center">
        <h1 className="text-5xl font-extrabold tracking-tight mb-3" style={{ color: "hsl(162 100% 33%)" }}>
          SANDA
        </h1>
        <p className="text-sm text-muted-foreground max-w-[260px]">
          Знай, сколько можешь потратить сегодня
        </p>
      </div>

      {/* Decorative element */}
      <div className="w-20 h-1 rounded-full mb-10"
        style={{ background: "linear-gradient(90deg, transparent, hsl(162 100% 33%), transparent)" }} />

      {/* Google Sign-In Button */}
      <button
        onClick={handleSignIn}
        disabled={loading}
        className="flex items-center gap-3 px-6 py-3.5 rounded-full font-semibold text-sm transition-all duration-200 active:scale-95 disabled:opacity-50"
        style={{ background: "white", color: "#1f1f1f", boxShadow: "0 2px 12px rgba(0,0,0,0.3)", minWidth: 260 }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        {loading ? <span>Входим...</span> : <span>Войти через Google</span>}
      </button>

      {error && <p className="mt-4 text-sm text-destructive animate-fade-in-up">{error}</p>}

      {/* Divider */}
      <div className="flex items-center gap-3 mt-5 mb-5" style={{ width: 260 }}>
        <div className="flex-1 h-px" style={{ background: "hsl(0 0% 20%)" }} />
        <span className="text-xs text-muted-foreground">или</span>
        <div className="flex-1 h-px" style={{ background: "hsl(0 0% 20%)" }} />
      </div>

      {/* Guest Button */}
      <button
        onClick={onContinueAsGuest}
        className="px-6 py-3.5 rounded-full font-semibold text-sm transition-all duration-200 active:scale-95"
        style={{ background: "hsl(0 0% 15%)", color: "hsl(0 0% 70%)", minWidth: 260, border: "1px solid hsl(0 0% 22%)" }}
      >
        Продолжить без аккаунта
      </button>

      <p className="mt-3 text-xs text-center max-w-[240px]" style={{ color: "hsl(0 0% 35%)" }}>
        Данные будут храниться только на этом устройстве
      </p>

      <p className="mt-10 text-xs text-muted-foreground/50">v2.0.0 • Личный финансовый помощник</p>
    </div>
  );
}
