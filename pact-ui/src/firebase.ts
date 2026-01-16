import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyB5Qr4Fluis0KYOmYW6yDZZqz_baEkjYAM",
    authDomain: "pact-bffd5.firebaseapp.com",
    projectId: "pact-bffd5",
    storageBucket: "pact-bffd5.firebasestorage.app",
    messagingSenderId: "303460157684",
    appId: "1:303460157684:web:421093f412febca54ef6a1",
    measurementId: "G-GPEE5S48DF"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
