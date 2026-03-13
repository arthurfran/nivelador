import { initializeApp } from "firebase/app";
import { getDatabase, onValue, ref, set } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDOlRWUX_gxkBb03ci3EcVLjpkrw9Ll_rI",
  authDomain: "nivelador-dd2de.firebaseapp.com",
  projectId: "nivelador-dd2de",
  storageBucket: "nivelador-dd2de.firebasestorage.app",
  messagingSenderId: "24040964347",
  appId: "1:24040964347:web:df6815fdc0b03c8cb7305e",
  measurementId: "G-DMSBB9X0YF",
};
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { database, ref, onValue, set };
