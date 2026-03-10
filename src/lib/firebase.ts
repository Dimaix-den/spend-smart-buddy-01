import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD2p4Fjw6kdcP9dokWJTnu_drkyZTj1KxQ",
  authDomain: "sanda-e5af1.firebaseapp.com",
  projectId: "sanda-e5af1",
  storageBucket: "sanda-e5af1.firebasestorage.app",
  messagingSenderId: "382612826715",
  appId: "1:382612826715:web:a907b6633a585f3ec3ed7e"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Multiple tabs open, persistence only in first tab');
  } else if (err.code === 'unimplemented') {
    console.warn('Browser does not support offline persistence');
  }
});
