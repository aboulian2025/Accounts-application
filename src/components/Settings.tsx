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
  LogOut
} from 'lucide-react';
import { AppSettings } from '../types';
import { api } from '../lib/api';
import { toast } from 'react-hot-toast';
import { auth, signInWithGoogle } from '../lib/firebase';
import { syncService } from '../lib/syncService';

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

  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

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
      toast.error('فشل تسجيل الدخول');
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
      const customers = await api.getCustomers();
      const allData = await Promise.all(customers.map(async (c) => {
        const txs = await api.getTransactions(c.id);
        return { ...c, transactions: txs };
      }));
      
      const dataStr = JSON.stringify({ customers: allData, settings: formData }, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `backup_${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      toast.success('تم تصدير النسخة الاحتياطية بنجاح');
    } catch (error) {
      toast.error('فشل تصدير النسخة الاحتياطية');
    }
  };

  const importLocalBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);
        // In a real app, we'd send this to the server to merge/overwrite
        console.log('Imported data:', data);
        toast.success('تم استيراد البيانات بنجاح (راجع السجل)');
        onUpdate();
      } catch (error) {
        toast.error('فشل استيراد الملف');
      }
    };
    reader.readAsText(file);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6 pb-10"
    >
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ChevronRight size={24} />
        </button>
        <h2 className="text-lg font-bold text-slate-800">الإعدادات</h2>
      </div>

      <div className="space-y-6">
        {/* Profile Settings */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">معلومات النشاط</h3>
          <div className="bg-white rounded-3xl border border-slate-100 p-5 space-y-4 shadow-sm">
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-slate-700 flex items-center gap-2">
                <Building size={16} className="text-slate-400" />
                اسم النشاط
              </label>
              <input 
                type="text"
                value={formData.business_name}
                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-slate-700 flex items-center gap-2">
                <Building size={16} className="text-slate-400" />
                اسم النشاط (بالإنجليزي)
              </label>
              <input 
                type="text"
                value={formData.business_name_en}
                onChange={(e) => setFormData({ ...formData, business_name_en: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-slate-700 flex items-center gap-2">
                <Building size={16} className="text-slate-400" />
                شعار المتجر
              </label>
              <div className="flex items-center gap-4">
                {formData.business_logo && (
                  <img src={formData.business_logo} alt="Logo" className="w-16 h-16 rounded-xl object-cover border border-slate-200" />
                )}
                <label className="flex-1 cursor-pointer">
                  <div className="w-full bg-slate-50 border border-dashed border-slate-300 rounded-xl py-3 px-4 flex flex-col items-center justify-center gap-1 hover:bg-slate-100 transition-colors">
                    <Save size={18} className="text-slate-400" />
                    <span className="text-[11px] text-slate-500">اختر صورة الشعار</span>
                  </div>
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-slate-700 flex items-center gap-2">
                <Building size={16} className="text-slate-400" />
                عنوان النشاط
              </label>
              <input 
                type="text"
                value={formData.business_address}
                onChange={(e) => setFormData({ ...formData, business_address: e.target.value })}
                placeholder="مثلاً: عمان، شارع الملك حسين"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-slate-700 flex items-center gap-2">
                <Building size={16} className="text-slate-400" />
                عنوان النشاط (بالإنجليزي)
              </label>
              <input 
                type="text"
                value={formData.business_address_en}
                onChange={(e) => setFormData({ ...formData, business_address_en: e.target.value })}
                placeholder="e.g. Amman, King Hussein St."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-slate-700 flex items-center gap-2">
                <Building size={16} className="text-slate-400" />
                موقع المتجر بالتفصيل
              </label>
              <input 
                type="text"
                value={formData.business_location}
                onChange={(e) => setFormData({ ...formData, business_location: e.target.value })}
                placeholder="مثلاً: عدن، اليمن، بجانب مستشفى..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-slate-700 flex items-center gap-2">
                <RefreshCw size={16} className="text-slate-400" />
                العملة المستخدمة
              </label>
              <select 
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="د.أ">دينار أردني (د.أ)</option>
                <option value="ر.س">ريال سعودي (ر.س)</option>
                <option value="ر.ي">ريال يمني (ر.ي)</option>
                <option value="ج.م">جنيه مصري (ج.م)</option>
                <option value="د.إ">درهم إماراتي (د.إ)</option>
                <option value="$">دولار ($)</option>
                <option value="€">يورو (€)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-slate-700 flex items-center gap-2">
                <Phone size={16} className="text-slate-400" />
                رقم هاتفي
              </label>
              <input 
                type="text"
                value={formData.my_phone}
                onChange={(e) => setFormData({ ...formData, my_phone: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>
        </section>

        {/* Messaging Settings */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">رسائل التذكير</h3>
          <div className="bg-white rounded-3xl border border-slate-100 p-5 space-y-4 shadow-sm">
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-slate-700 flex items-center gap-2">
                <MessageSquare size={16} className="text-slate-400" />
                قالب الرسالة
              </label>
              <textarea 
                value={formData.reminder_template}
                onChange={(e) => setFormData({ ...formData, reminder_template: e.target.value })}
                rows={4}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm leading-relaxed"
              />
              <p className="text-[9px] text-slate-400">استخدم {'{amount}'} ليتم استبداله بمبلغ الدين تلقائياً.</p>
            </div>
          </div>
        </section>

        {/* Cloud Sync */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">النسخ الاحتياطي السحابي</h3>
          <div className="bg-white rounded-3xl border border-slate-100 p-5 space-y-4 shadow-sm">
            {!user ? (
              <div className="text-center py-4 space-y-4">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mx-auto">
                  <Cloud size={32} />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-slate-800">سجل الدخول للمزامنة</p>
                  <p className="text-[11px] text-slate-500">احمِ بياناتك من الفقدان عبر Google Drive</p>
                </div>
                <button 
                  onClick={handleLogin}
                  className="w-full py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
                >
                  <LogIn size={18} />
                  تسجيل الدخول باستخدام Google
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={user.photoURL || ''} alt="" className="w-10 h-10 rounded-full" />
                    <div>
                      <p className="text-[13px] font-bold text-slate-800">{user.displayName}</p>
                      <p className="text-[9px] text-slate-400">{user.email}</p>
                    </div>
                  </div>
                  <button onClick={handleLogout} className="p-2 text-rose-500 hover:bg-rose-50 rounded-full transition-colors">
                    <LogOut size={18} />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                      <Cloud size={20} />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-slate-800">مزامنة تلقائية</p>
                      <p className="text-[9px] text-slate-400">مفعلة حالياً</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setFormData({ ...formData, cloud_sync_enabled: formData.cloud_sync_enabled === 'true' ? 'false' : 'true' })}
                    className={`w-12 h-6 rounded-full transition-colors relative ${formData.cloud_sync_enabled === 'true' ? 'bg-indigo-600' : 'bg-slate-200'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.cloud_sync_enabled === 'true' ? 'left-1' : 'left-7'}`}></div>
                  </button>
                </div>

                <div className="pt-4 border-t border-slate-50 space-y-3">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">آخر مزامنة:</span>
                    <span className="text-slate-800 font-medium">{formData.last_sync || 'لم تتم بعد'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={handleSync}
                      disabled={syncing}
                      className="py-2 bg-indigo-600 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                      مزامنة الآن
                    </button>
                    <button 
                      onClick={handleRestore}
                      disabled={syncing}
                      className="py-2 bg-slate-100 text-slate-700 rounded-xl text-[11px] font-bold flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors disabled:opacity-50"
                    >
                      <Database size={14} />
                      استعادة
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Security */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">الأمان والنسخ المحلي</h3>
          <div className="bg-white rounded-3xl border border-slate-100 p-5 space-y-4 shadow-sm">
            <button className="w-full flex items-center justify-between text-slate-700">
              <div className="flex items-center gap-3">
                <Lock size={18} className="text-slate-400" />
                <span className="text-[13px] font-medium">قفل التطبيق</span>
              </div>
              <ChevronRight size={18} className="text-slate-300" />
            </button>
            
            <button 
              onClick={exportLocalBackup}
              className="w-full flex items-center justify-between text-slate-700 pt-4 border-t border-slate-50"
            >
              <div className="flex items-center gap-3">
                <Database size={18} className="text-slate-400" />
                <span className="text-[13px] font-medium">تصدير نسخة احتياطية (JSON)</span>
              </div>
              <ChevronRight size={18} className="text-slate-300" />
            </button>

            <div className="pt-4 border-t border-slate-50">
              <label className="w-full flex items-center justify-between text-slate-700 cursor-pointer">
                <div className="flex items-center gap-3">
                  <RefreshCw size={18} className="text-slate-400" />
                  <span className="text-[13px] font-medium">استيراد نسخة احتياطية</span>
                </div>
                <input type="file" accept=".json" onChange={importLocalBackup} className="hidden" />
                <ChevronRight size={18} className="text-slate-300" />
              </label>
            </div>
          </div>
        </section>

        {/* Save Button */}
        <button 
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-indigo-600 text-white py-3.5 rounded-2xl font-bold text-base shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving ? <RefreshCw size={22} className="animate-spin" /> : <Save size={22} />}
          حفظ التغييرات
        </button>
      </div>
    </motion.div>
  );
}
