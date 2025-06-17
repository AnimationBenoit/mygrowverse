// app/chat/firebaseConfig.ts

// Import des fonctions Firebase
import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"

// Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBEnljFU9mgwXpU3JDj3gOj1syvu-95jxc",
  authDomain: "mygrowverse.firebaseapp.com",
  projectId: "mygrowverse",
  storageBucket: "mygrowverse.appspot.com", // Très important : .appspot.com
  messagingSenderId: "310946736369",
  appId: "1:310946736369:web:79e0062a10b14c65706150"
}

// Initialisation de Firebase
export const app = initializeApp(firebaseConfig)

// Export Auth (optionnel si tu utilises Auth)
export const auth = getAuth(app)
