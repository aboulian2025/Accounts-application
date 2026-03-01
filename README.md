<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# تطبيق إدارة الذمم (نسخة الموبايل) 📱

تطبيق لإدارة الديون والعملاء يعمل مباشرة باستخدام **Capacitor** و **SQLite** على جهاز المستخدم.

## الميزات الجديدة:
- **بدون سيرفر (Serverless):** البيانات تُخزن مباشرة على الهاتف.
- **العمل بدون إنترنت (Offline-first):** لا يحتاج لاتصال دائم.
- **أداء أسرع:** اتصال مباشر بقاعدة البيانات من الواجهة.

## التشغيل المحلي:

**المتطلبات:** Node.js

1. تثبيت المكتبات:
   ```bash
   npm install
   ```
2. تشغيل خادم التطوير (Vite):
   ```bash
   npm run dev
   ```
   سيفتح التطبيق على: `http://localhost:5173/`

## بناء نسخة الموبايل (Capacitor):

1. بناء مشروع الويب:
   ```bash
   npm run build
   ```
2. مزامنة الملفات مع Android/iOS:
   ```bash
   npx cap sync
   ```
3. فتح المشروع في Android Studio:
   ```bash
   npx cap open android
   ```
