'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Fungsi inisialisasi yang sudah diperbaiki untuk Vercel
export function initializeFirebase() {
  // 1. Cek apakah Firebase sudah terinisialisasi untuk mencegah error "duplicate app"
  if (getApps().length > 0) {
    return getSdks(getApp());
  }

  // 2. Langsung gunakan firebaseConfig dari file config.ts
  // Ini akan membaca variabel NEXT_PUBLIC_ yang sudah kamu pasang di Vercel
  try {
    const firebaseApp = initializeApp(firebaseConfig);
    return getSdks(firebaseApp);
  } catch (e) {
    // Log error jika variabel environment tidak terbaca
    if (process.env.NODE_ENV === "production") {
      console.error('Firebase initialization failed in production:', e);
    }
    // Tetap coba jalankan fallback atau lempar error agar build memberi tahu letak kesalahannya
    const fallbackApp = initializeApp(firebaseConfig);
    return getSdks(fallbackApp);
  }
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}

// Export modul lainnya
export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';