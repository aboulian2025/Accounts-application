import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ChevronRight, 
  Building, 
  Phone, 
  MessageSquare, 
  Cloud, 
  Lock, 
  Database,
  RefreshCw,
  Save,
  LogIn,
  LogOut,
  Heart,
  MapPin
} from 'lucide-react';
import { AppSettings, Customer, Transaction } from '../types';
import { api } from '../lib/api';
import { toast } from 'react-hot-toast';
import { auth, signInWithGoogle } from '../lib/firebase';
import { syncService } from '../lib/syncService';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

interface SettingsProps {
  settings: AppSettings | null;
  onUpdate: () => void;
  onBack: () => void;
}

export default function Settings({ settings, onUpdate, onBack }: SettingsProps) {
  const user = auth.currentUser;
  const [formData, setFormData] = useState<AppSettings>(settings || {
    business_name: 'دفتر الذمم الشخصي',
    business_name_en: 'Personal Ledger',
    business_address: '',
    business_address_en: '',
    business_location: '',
    business_logo: '',
    currency: 'د.أ',
    my_phone: '',
    reminder_template: 'السلام عليكم، نود تذكيركم بأن الرصيد المستحق عليكم هو {amount} {currency}. يرجى السداد في أقرب وقت ممكن. شاكرين تعاونكم.',
    cloud_sync_enabled: 'false',
    last_sync: ''
  });

  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, business_logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateSettings(formData);
      toast.success('تم حفظ الإعدادات');
      onUpdate();
    } catch (error) {
      toast.error('فشل حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
      toast.success('تم تسجيل الدخول بنجاح');
      onUpdate();
    } catch (error) {
      console.error(error);
      toast.error('فشل تسجيل الدخول. تأكد من إعدادات الـ SHA-1 في Firebase');
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    toast.success('تم تسجيل الخروج');
    onUpdate();
  };

  const handleSync = async () => {
    setSyncing(true);
    await syncService.syncToCloud();
    setSyncing(false);
    onUpdate();
  };

  const handleRestore = async () => {
    if (!confirm('سيتم استبدال البيانات المحلية بالنسخة السحابية. هل أنت متأكد؟')) return;
    setSyncing(true);
    await syncService.restoreFromCloud();
    setSyncing(false);
    onUpdate();
  };

  const exportLocalBackup = async () => {
    try {
      toast.loading('جاري تجهيز النسخة الاحتياطية...', { id: 'backup' });
      const customers = await api.getCustomers();
      const allData = await Promise.all(customers.map(async (c) => {
        const txs = await api.getTransactions(c.id);
        return { ...c, transactions: txs };
      }));
      
      const dataStr = JSON.stringify({ customers: allData, settings: formData }, null, 2);
      const fileName = `backup_${new Date().toISOString().split('T')[0]}.json`;

      if (Capacitor.isNativePlatform()) {
        const result = await Filesystem.writeFile({
          path: fileName,
          data: dataStr,
          directory: Directory.Cache,
          encoding: 'utf8' as any
        });

        await Share.share({
          title: 'نسخة احتياطية - تطبيق الحسابات',
          url: result.uri,
        });
      } else {
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', fileName);
        linkElement.click();
      }
      
      toast.success('تم تصدير النسخة الاحتياطية بنجاح', { id: 'backup' });
    } catch (error) {
      toast.error('فشل تصدير النسخة الاحتياطية', { id: 'backup' });
    }
  };

  const importLocalBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('تحذير: استيراد البيانات قد يؤدي لتكرار العملاء إذا كانوا موجودين مسبقاً. هل تود الاستمرار؟')) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        toast.loading('جاري استيراد البيانات...', { id: 'import' });
        const content = event.target?.result as string;
        const data = JSON.parse(content);

        if (data.customers && Array.isArray(data.customers)) {
          for (const customerData of data.customers) {
            const newCustomer = await api.addCustomer({
              name: customerData.name,
              phone: customerData.phone,
              currency: customerData.currency,
              balance: 0
            });

            if (customerData.transactions && Array.isArray(customerData.transactions)) {
              for (const tx of customerData.transactions) {
                await api.addTransaction({
                  customer_id: newCustomer.id,
                  amount: tx.amount,
                  type: tx.type,
                  note: tx.note,
                  date: tx.date
                });
              }
            }
          }
        }

        if (data.settings) {
          await api.updateSettings(data.settings);
        }

        toast.success('تم استيراد البيانات والعمليات بنجاح', { id: 'import' });
        onUpdate();
      } catch (error) {
        console.error(error);
        toast.error('فشل استيراد الملف. تأكد من صحة صيغة JSON', { id: 'import' });
      }
    };
    reader.readAsText(file);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6 pb-20"
    >
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-all">
          <ChevronRight size={24} />
        </button>
        <h2 className="text-xl font-black text-slate-800 tracking-tight">الإعدادات</h2>
      </div>

      <div className="space-y-6">
        {/* معلومات النشاط */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">معلومات النشاط التجاري</h3>
          <div className="bg-white rounded-[2rem] border border-slate-100 p-6 space-y-4 shadow-sm">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 flex items-center gap-2">
                <Building size={16} className="text-indigo-500" /> اسم النشاط (عربي)
              </label>
              <input type="text" value={formData.business_name} onChange={(e) => setFormData({ ...formData, business_name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 flex items-center gap-2">
                <Building size={16} className="text-indigo-500" /> Business Name (EN)
              </label>
              <input type="text" value={formData.business_name_en} onChange={(e) => setFormData({ ...formData, business_name_en: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 flex items-center gap-2">
                <Building size={16} className="text-indigo-500" /> شعار المتجر
              </label>
              <div className="flex items-center gap-4">
                {formData.business_logo && <img src={formData.business_logo} className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-50" />}
                <label className="flex-1 cursor-pointer">
                  <div className="w-full bg-indigo-50 border-2 border-dashed border-indigo-100 rounded-2xl py-4 flex flex-col items-center justify-center gap-1">
                    <Save size={20} className="text-indigo-400" />
                    <span className="text-[10px] font-black text-indigo-600">رفع شعار جديد</span>
                  </div>
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 flex items-center gap-2">
                <MapPin size={16} className="text-indigo-500" /> عنوان النشاط
              </label>
              <input type="text" value={formData.business_address} onChange={(e) => setFormData({ ...formData, business_address: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-700">العملة الافتراضية</label>
                <input type="text" value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-700">رقم الهاتف</label>
                <input type="text" value={formData.my_phone} onChange={(e) => setFormData({ ...formData, my_phone: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-sans font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
              </div>
            </div>
          </div>
        </section>

        {/* المزامنة السحابية */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">المزامنة السحابية (Google)</h3>
          <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm">
            {!user ? (
              <button onClick={handleLogin} className="w-full py-4 bg-white border-2 border-slate-50 rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-sm active:scale-95 transition-all">
                <LogIn size={20} className="text-indigo-600" /> تسجيل الدخول بحساب Google
              </button>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <img src={user.photoURL || ''} className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
                    <div className="text-right">
                      <p className="text-xs font-black text-slate-800">{user.displayName}</p>
                      <p className="text-[9px] font-bold text-slate-400">{user.email}</p>
                    </div>
                  </div>
                  <button onClick={handleLogout} className="p-2 text-rose-500"><LogOut size={20} /></button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={handleSync} disabled={syncing} className="py-3 bg-indigo-600 text-white rounded-xl text-[11px] font-black flex items-center justify-center gap-2">
                    <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} /> مزامنة الآن
                  </button>
                  <button onClick={handleRestore} disabled={syncing} className="py-3 bg-slate-100 text-slate-700 rounded-xl text-[11px] font-black flex items-center justify-center gap-2">
                    <Database size={14} /> استعادة
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* المزامنة المحلية */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">إدارة البيانات المحلية</h3>
          <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm grid grid-cols-2 gap-3">
            <button onClick={exportLocalBackup} className="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <Database size={20} className="text-slate-400" />
              <span className="text-[10px] font-black">تصدير JSON</span>
            </button>
            <label className="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer">
              <RefreshCw size={20} className="text-slate-400" />
              <span className="text-[10px] font-black">استيراد JSON</span>
              <input type="file" accept=".json" onChange={importLocalBackup} className="hidden" />
            </label>
          </div>
        </section>

        <button onClick={handleSave} disabled={saving} className="w-full bg-indigo-600 text-white py-4 rounded-[1.5rem] font-black shadow-xl shadow-indigo-100 active:scale-95 transition-all flex items-center justify-center gap-2">
          {saving ? <RefreshCw size={22} className="animate-spin" /> : <Save size={22} />} حفظ الإعدادات
        </button>

        {/* حقوق الملكية */}
        <footer className="pt-10 pb-6 text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-slate-300">
            <div className="h-[1px] w-8 bg-slate-100"></div>
            <Heart size={14} className="fill-slate-100" />
            <div className="h-[1px] w-8 bg-slate-100"></div>
          </div>
          <p className="text-[11px] font-black text-slate-400">
            جميع الحقوق محفوظة لـ <span className="text-indigo-500">Ameen Assery</span>
          </p>
          <p className="text-[10px] font-black text-slate-300 tracking-[0.2em]">
            - - - 773369393 - - -
          </p>
        </footer>
      </div>
    </motion.div>
  );
}
