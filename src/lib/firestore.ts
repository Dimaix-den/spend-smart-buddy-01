import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { FinanceState } from "@/hooks/useFinance";

const FINANCE_DOC = "finance";
const DATA_COLLECTION = "data";

export async function loadFromFirestore(userId: string): Promise<FinanceState | null> {
  try {
    const ref = doc(db, "users", userId, DATA_COLLECTION, FINANCE_DOC);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as FinanceState;
    }
    return null;
  } catch (err) {
    console.error("Firestore load error:", err);
    return null;
  }
}

export async function saveToFirestore(userId: string, state: FinanceState): Promise<void> {
  try {
    const ref = doc(db, "users", userId, DATA_COLLECTION, FINANCE_DOC);
    // Serialize/deserialize to strip undefined values
    await setDoc(ref, JSON.parse(JSON.stringify(state)));
  } catch (err) {
    console.error("Firestore save error:", err);
  }
}
