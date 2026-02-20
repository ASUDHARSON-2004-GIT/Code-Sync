import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyDVRllikcUoaTYzpjAGi-P0mlyiZnvKurM",
  authDomain: "code-sync-cse.firebaseapp.com",
  projectId: "code-sync-cse",
  storageBucket: "code-sync-cse.firebasestorage.app",
  messagingSenderId: "945657897509",
  appId: "1:945657897509:web:188c38814219ed7ebdd5cc",
  measurementId: "G-L1ZQ1BZW1N"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
