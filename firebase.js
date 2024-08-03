// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCHWP08Chw4lwaku9y8w_YL6Guh5E5zgXw",
  authDomain: "pantry-tracking-app-1a660.firebaseapp.com",
  projectId: "pantry-tracking-app-1a660",
  storageBucket: "pantry-tracking-app-1a660.appspot.com",
  messagingSenderId: "503910516783",
  appId: "1:503910516783:web:7d9aa52991c2593d9d9eda",
  measurementId: "G-0WNVZF2XLZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app); // Initialize Firestore
export const auth = getAuth(app)
export { app, firestore };
