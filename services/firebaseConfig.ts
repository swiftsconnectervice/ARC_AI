import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// ¡ESTA ES LA CONFIGURACIÓN CORRECTA! (La que encontraste en Firebase)
const firebaseConfig = {
  apiKey: "AIzaSyCDasulDuqUfFfwOPJ_OS6EwGIGTV3bECs",
  authDomain: "gen-lang-client-0686146483.firebaseapp.com",
  projectId: "gen-lang-client-0686146483",
  storageBucket: "gen-lang-client-0686146483.firebasestorage.app",
  messagingSenderId: "1078580597551",
  appId: "1:1078580597551:web:4e7f4907f3cd48937447da",
  measurementId: "G-3VXW7YNQVM"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar los servicios (¡esto ya lo tenías bien!)
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;