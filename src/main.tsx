import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import { initDB } from './lib/db';
import { defineCustomElements } from 'jeep-sqlite/loader';
import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite } from '@capacitor-community/sqlite';

async function startApp() {
  try {
    const platform = Capacitor.getPlatform();

    // ✅ تهيئة Jeep SQLite للويب
    if (platform === 'web') {
      await defineCustomElements(window);
      await CapacitorSQLite.initWebStore();
    }

    // ✅ تهيئة قاعدة البيانات
    await initDB();

    console.log('Database system ready ✅');

    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );

  } catch (error) {
    console.error('CRITICAL STARTUP ERROR ❌', error);
    document.body.innerHTML = `
      <div style="padding:20px;font-family:sans-serif;direction:rtl;text-align:center">
        <h2 style="color:#e11d48">خطأ في تشغيل قاعدة البيانات</h2>
        <p>يرجى التأكد من توفر ملفات الـ WASM وتحديث الصفحة.</p>
        <pre style="background:#f1f5f9;padding:10px;border-radius:8px;text-align:left;direction:ltr;font-size:12px">${error}</pre>
        <button onclick="window.location.reload()" style="padding:10px 20px;background:#4f46e5;color:white;border:none;border-radius:6px;cursor:pointer">إعادة المحاولة</button>
      </div>
    `;
  }
}

startApp();
