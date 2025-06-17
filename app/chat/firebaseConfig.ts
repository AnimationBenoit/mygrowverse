// firebaseConfig.ts

// Import the necessary functions from the Firebase SDK
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

// Your Firebase configuration object
const firebaseConfig = {
  apiKey: "AIzaSyBEnljFU9mgwXpU3JDj3gOj1syvu-95jxc",
  authDomain: "mygrowverse.firebaseapp.com",
  projectId: "mygrowverse",
  storageBucket: "mygrowverse.firebasestorage.app",
  messagingSenderId: "310946736369",
  appId: "1:310946736369:web:79e0062a10b14c65706150"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Export Firebase Auth instance
export const auth = getAuth(app)
