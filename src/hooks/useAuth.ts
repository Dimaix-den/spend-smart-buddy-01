import { useState, useEffect } from "react";
import { onAuthStateChanged, User, signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
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

  const logout = async () => {
    await signOut(auth);
  };

  return { user, loading, signInWithGoogle, logout };
}
