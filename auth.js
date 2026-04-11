// auth.js — Login, Signup, Google Login, Logout, Forgot Password
import { auth } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const provider = new GoogleAuthProvider();

export async function signUp(email, password) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Signup error:", error.message);
    throw error;
  }
}

export async function logIn(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Login error:", error.message);
    throw error;
  }
}

export async function googleLogin() {
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Google login error:", error.message);
    throw error;
  }
}

export async function logOut() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout error:", error.message);
    throw error;
  }
}

// forgotPassword was MISSING before — now fixed
export async function forgotPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    console.log("Password reset email sent to:", email);
  } catch (error) {
    console.error("Forgot password error:", error.message);
    throw error;
  }
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    const stored = JSON.parse(localStorage.getItem("veb_user") || "null");
    if (!stored) {
      const fbUser = {
        name:   user.displayName || user.email.split("@")[0],
        email:  user.email,
        joined: new Date().toLocaleDateString("en-IN")
      };
      localStorage.setItem("veb_user", JSON.stringify(fbUser));
      if (typeof window.updateNavForUser === "function") {
        window.updateNavForUser(fbUser);
      }
    }
  }
});