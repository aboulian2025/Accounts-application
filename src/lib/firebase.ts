import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from "firebase/analytics";
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';

// إعدادات Firebase الحقيقية الخاصة بك
const firebaseConfig = {
  apiKey: "AIzaSyCMrLtvg2FCXQiNRl-jN7ZS7Y2oBTmUYq8",
  authDomain: "account-sapplication.firebaseapp.com",
  projectId: "account-sapplication",
  storageBucket: "account-sapplication.firebasestorage.app",
  messagingSenderId: "439049145507",
  appId: "1:439049145507:web:20a2ca126216069127c316",
  measurementId: "G-YZWZ1NVD5F"
};

// تهيئة Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);

// تهيئة GoogleAuth لـ Capacitor
if (Capacitor.isNativePlatform()) {
  GoogleAuth.initialize({
    clientId: '439049145507-okf43gq4vpkpsaqk2lcq7ac6liaab4b4.apps.googleusercontent.com',
    scopes: ['profile', 'email'],
    grantOfflineAccess: true,
  });
}

export const signInWithGoogle = async () => {
  try {
    let idToken: string | null = null;

    if (Capacitor.isNativePlatform()) {
      // استخدام تسجيل الدخول الأصلي في أندرويد/iOS
      const user = await GoogleAuth.signIn();
      idToken = user.authentication.idToken;
    } else {
      // استخدام الويب (اختياري، إذا كنت تدعم المتصفح أيضاً)
      const { signInWithPopup } = await import('firebase/auth');
      const googleProvider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      idToken = credential?.idToken || null;
    }

    if (idToken) {
      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, credential);
      return result.user;
    }
    throw new Error("No ID Token found");
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};
