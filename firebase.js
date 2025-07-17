
// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";


const firebaseConfig = {
  apiKey: "AIzaSyDuzYMFGFHTq_-Nn1Ib39PqS0jzweH1saA",
  authDomain: "stu-teacher-9766e.firebaseapp.com",
  projectId: "stu-teacher-9766e",
  storageBucket: "stu-teacher-9766e.firebasestorage.app",
  messagingSenderId: "204741633353",
  appId: "1:204741633353:web:83ff22fbeb2b95575ba698"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the services you'll need in other files
export const auth = getAuth(app);
export const db = getFirestore(app);
