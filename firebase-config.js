// Firebase Configuration for Virtual Ebook Store
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyDPNpNmhP2Y0xFfeQGwGUuxku2bmTWiqlI",
  authDomain: "virtual-ebook-store.firebaseapp.com",
  projectId: "virtual-ebook-store",
  storageBucket: "virtual-ebook-store.firebasestorage.app",
  messagingSenderId: "382640889489",
  appId: "1:382640889489:web:36f13b597fccad51e4a930",
  measurementId: "G-7FVNC9MZC4"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);