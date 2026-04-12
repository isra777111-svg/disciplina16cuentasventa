import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAKUL8Cj9fr8I8Sn969jBNjOz9PaKZPq_E",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "disciplina16cuentas.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "disciplina16cuentas",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "disciplina16cuentas.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "949109091701",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:949109091701:web:b12d102315fd17c477373c",
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-VJ1VBMB56K"
};

let app, db, analytics;

try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    isSupported().then(yes => yes && (analytics = getAnalytics(app)));
} catch (error) {
    console.warn("Firebase no está configurado correctamente. Por favor, añada las variables de entorno en .env.", error);
}

export { db, analytics };
