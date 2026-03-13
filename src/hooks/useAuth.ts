import { useState, useEffect } from "react";
import { onAuthStateChanged, User, signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

const GUEST_KEY = "sanda_guest_mode";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        localStorage.removeItem(GUEST_KEY);
        setIsGuest(false);
      } else {
        const guest = localStorage.getItem(GUEST_KEY) === "true";
        setIsGuest(guest);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (error.code === "auth/popup-blocked") {
        throw new Error("Разреши всплывающие окна для входа");
      } else if (error.code === "auth/network-request-failed") {
        throw new Error("Проверь подключение к интернету");
      }
      throw new Error("Ошибка входа. Попробуй снова.");
    }
  };

  const continueAsGuest = () => {
    localStorage.setItem(GUEST_KEY, "true");
    setIsGuest(true);
  };

  const logout = async () => {
    if (isGuest) {
      localStorage.removeItem(GUEST_KEY);
      setIsGuest(false);
    } else {
      await signOut(auth);
    }
  };

  const switchAccount = async () => {
    await signOut(auth);
    try {
      googleProvider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      throw new Error("Ошибка смены аккаунта");
    }
  };

  return { user, loading, isGuest, signInWithGoogle, continueAsGuest, logout, switchAccount };
}
