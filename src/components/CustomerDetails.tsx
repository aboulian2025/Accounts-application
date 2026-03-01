import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ChevronRight, 
  Phone, 
  MessageSquare, 
  FileText, 
  Plus, 
  Share2,
  Edit,
  Trash2,
  Check,
  X,
  MapPin,
  Building
} from 'lucide-react';
import { api } from '../lib/api';
import { Customer, Transaction, AppSettings } from '../types';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

interface CustomerDetailsProps {
  customerId: number;
  onBack: () => void;
  onAddTransaction: () => void;
  onEditTransaction: (transaction: Transaction) => void;
  settings: AppSettings | null;
}

export default function CustomerDetails({ customerId, onBack, onAddTransaction, onEditTransaction, settings }: CustomerDetailsProps) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '' });
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    loadData();
  }, [customerId]);

  const loadData = async () => {
    try {
      const [customers, txs] = await Promise.all([
        api.getCustomers(),
        api.getTransactions(customerId)
      ]);
      const found = customers.find(c => c.id === customerId);
      if (found) {
        setCustomer(found);
        setEditForm({ name: found.name, phone: found.phone || '' });
      }
      setTransactions(txs.sort((a, b) => a.id - b.id));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCustomer = async () => {
    if (!editForm.name.trim()) {
      toast.error('الاسم مطلوب');
      return;
    }
    try {
      await api.updateCustomer(customerId, editForm);
      toast.success('تم تحديث بيانات العميل');
      setIsEditingCustomer(false);
      loadData();
    } catch (error) {
      toast.error('فشل التحديث');
    }
  };

  const handleDeleteCustomer = async () => {
    const confirmDelete = window.confirm(`هل أنت متأكد من حذف العميل "${customer?.name}" وجميع عملياته نهائياً؟`);
    if (!confirmDelete) return;

    try {
      await api.deleteCustomer(customerId);
      toast.success('تم حذف العميل بنجاح');
      onBack();
    } catch (error) {
      toast.error('فشل عملية الحذف');
    }
  };

  const sendWhatsAppReminder = () => {
    if (!customer?.phone) {
      toast.error('لا يوجد رقم هاتف لهذا العميل');
      return;
    }

    const amount = Math.abs(finalBalance).toLocaleString('en-US');
    const currency = customer?.currency || settings?.currency || 'د.أ';

    let message = `السلام عليكم أخ ${customer.name}، نود تذكيركم بأن الرصيد المستحق عليكم هو ${amount} ${currency}. يرجى السداد في أقرب وقت. شاكرين تعاونكم.`;

    if (settings?.reminder_template) {
      message = settings.reminder_template
        .replace('{amount}', amount)
        .replace('{currency}', currency);
    }

    const cleanPhone = customer.phone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const saveAndShareFile = async (base64Data: string, fileName: string) => {
    try {
      if (!Capacitor.isNativePlatform()) {
        const link = document.createElement('a');
        link.download = fileName; link.href = base64Data; link.click();
        return;
      }
      const base64Content = base64Data.includes('base64,') ? base64Data.split('base64,')[1] : base64Data;
      const result = await Filesystem.writeFile({
        path: fileName,
        data: base64Content,
        directory: Directory.Cache
      });
      await Share.share({ title: fileName, url: result.uri });
    } catch (error) {
      console.error('Save/Share Error:', error);
    }
  };

  const generateExport = async (type: 'pdf' | 'png') => {
    if (!customer) return;
    const toastId = toast.loading(`جاري تصدير كشف الحساب...`);
    setIsExporting(true);

    try {
      const totalDebitVal = transactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0);
      const totalCreditVal = transactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0);
      const balanceVal = totalDebitVal - totalCreditVal;
      const currentCurrency = customer.currency || settings?.currency || 'د.أ';

      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.left = '-9999px';
      iframe.style.width = '210mm';
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) throw new Error("Iframe creation failed");

      const htmlContent = `
        <html dir="rtl">
          <head>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
            <style>
              body { font-family: 'Cairo', sans-serif; background: white; padding: 0; color: #1e293b; margin: 0; width: 210mm; }
              .container { width: 100%; border: none; overflow: hidden; position: relative; }
              .header { display: flex; justify-content: space-between; align-items: start; border-bottom: 5px solid #4f46e5; padding: 30px; background: #f8fafc; }
              .biz-info h2 { margin: 0; font-size: 20px; font-weight: 900; color: #1e293b; }
              .biz-info p { margin: 4px 0; font-size: 12px; color: #64748b; font-weight: bold; }
              .logo-area { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 10px; flex: 1; }
              .logo { width: 80px; height: 80px; border-radius: 15px; object-fit: cover; border: 3px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
              .statement-title { background: #e11d48; color: white; padding: 5px 30px; border-radius: 6px; font-weight: 900; font-size: 16px; display: inline-block; }
              .client-bar { display: flex; justify-content: space-between; padding: 30px; background: white; border-bottom: 2px solid #f1f5f9; }
              .client-info h3 { margin: 0; font-size: 24px; font-weight: 900; color: #0f172a; }
              .date-info { text-align: left; color: #64748b; font-weight: bold; font-size: 16px; }
              table { width: 100%; border-collapse: collapse; }
              th { background: #334155; color: white; padding: 15px; text-align: right; font-size: 14px; font-weight: 900; border: 1px solid #1e293b; }
              td { padding: 12px 15px; border: 1px solid #cbd5e1; font-size: 15px; font-weight: 700; color: #334155; }
              .num { font-family: 'Arial', sans-serif; }
              .footer { padding: 40px; background: #f8fafc; border-top: 5px solid #4f46e5; margin-top: 20px; }
              .totals-table { width: 100%; display: flex; justify-content: space-between; align-items: center; }
              .total-item { text-align: center; flex: 1; }
              .total-label { font-size: 15px; color: #64748b; font-weight: 900; margin-bottom: 10px; }
              .total-val { font-size: 26px; font-weight: 900; }
              .balance-card { background: white; padding: 20px; border: 4px solid #4f46e5; border-radius: 15px; color: #4f46e5; }
            </style>
          </head>
          <body>
            <div class="container" id="capture-area">
              <div class="header">
                <div class="biz-info" style="width: 30%;">
                  <h2>${settings?.business_name || 'دفتر الحسابات'}</h2>
                  <p>${settings?.business_address || ''}</p>
                  <p class="num">${settings?.my_phone || ''}</p>
                </div>
                <div class="logo-area" style="width: 40%;">
                  ${settings?.business_logo ? `<img src="${settings.business_logo}" class="logo">` : '<div style="width:70px;height:70px;background:#e2e8f0;border-radius:12px;"></div>'}
                  <div class="statement-title">كشف حساب</div>
                </div>
                <div class="biz-info" style="text-align: left; width: 30%;">
                  <h2>${settings?.business_name_en || ''}</h2>
                  <p>${settings?.business_address_en || ''}</p>
                </div>
              </div>
              <div class="client-bar">
                <div class="client-info">
                  <p style="margin:0 0 8px 0; font-size:14px; color:#4f46e5; font-weight:900;">إلى السيد / المكرم:</p>
                  <h3>${customer.name}</h3>
                  <p class="num" style="margin:8px 0 0 0; font-size: 16px;">${customer.phone || ''}</p>
                </div>
                <div class="date-info">
                  <p>تاريخ الكشف</p>
                  <strong class="num" style="color:#1e293b; font-size:20px;">${format(new Date(), 'dd/MM/yyyy')}</strong>
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th style="width: 150px; text-align:center;">التاريخ</th>
                    <th>البيان / الملاحظات</th>
                    <th style="width: 120px; text-align:center;">مدين (+)</th>
                    <th style="width: 120px; text-align:center;">دائن (-)</th>
                    <th style="width: 150px; text-align:center;">الرصيد</th>
                  </tr>
                </thead>
                <tbody>
                  ${(() => {
                    let running = 0;
                    return transactions.map((tx, i) => {
                      running += tx.type === 'debit' ? tx.amount : -tx.amount;
                      return `
                        <tr style="background: ${i % 2 === 0 ? '#ffffff' : '#f8fafc'}">
                          <td class="num" style="color:#64748b; text-align:center;">${format(new Date(tx.date), 'dd/MM/yyyy')}</td>
                          <td>${tx.note || '-'}</td>
                          <td class="num" style="color:#059669; text-align:center;">${tx.type === 'debit' ? tx.amount.toLocaleString('en-US') : '-'}</td>
                          <td class="num" style="color:#e11d48; text-align:center;">${tx.type === 'credit' ? tx.amount.toLocaleString('en-US') : '-'}</td>
                          <td class="num" style="font-weight:900; background:#f1f5f9; text-align:center;">${running.toLocaleString('en-US')}</td>
                        </tr>
                      `;
                    }).join('');
                  })()}
                </tbody>
              </table>
              <div class="footer">
                <div class="totals-table">
                  <div class="total-item">
                    <div class="total-label">إجمالي المطلوب</div>
                    <div class="total-val num" style="color:#059669;">${totalDebitVal.toLocaleString('en-US')}</div>
                  </div>
                  <div class="total-item" style="border-right: 2px solid #e2e8f0; border-left: 2px solid #e2e8f0; margin: 0 30px; padding: 0 30px;">
                    <div class="total-label">إجمالي المدفوع</div>
                    <div class="total-val num" style="color:#e11d48;">${totalCreditVal.toLocaleString('en-US')}</div>
                  </div>
                  <div class="total-item balance-card">
                    <div class="total-label" style="color:#4f46e5;">الرصيد المتبقي</div>
                    <div class="total-val num">${Math.abs(balanceVal).toLocaleString('en-US')} <span style="font-size:14px;">${currentCurrency}</span></div>
                  </div>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;

      doc.open(); doc.write(htmlContent); doc.close();
      await new Promise(r => setTimeout(r, 2000));

      const captureArea = doc.getElementById('capture-area');
      if (!captureArea) throw new Error("Capture area not found");

      // ✅ استخدام إعدادات ذكية لمنع الـ Crash ودعم الصفحات المتعددة
      const canvas = await html2canvas(captureArea, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      document.body.removeChild(iframe);

      if (type === 'pdf') {
        const imgData = canvas.toDataURL('image/jpeg', 0.8);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pdfWidth;
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;

        let heightLeft = imgHeight;
        let position = 0;

        // الصفحة الأولى
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;

        // إضافة صفحات إضافية إذا لزم الأمر
        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
          heightLeft -= pdfHeight;
        }

        const pdfBase64 = pdf.output('datauristring');
        await saveAndShareFile(pdfBase64, `كشف_حساب_${customer.name}.pdf`);
      } else {
        const dataUrl = canvas.toDataURL('image/png', 1.0);
        await saveAndShareFile(dataUrl, `كشف_حساب_${customer.name}.png`);
      }

      toast.success('تم التصدير بنجاح', { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء التصدير', { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) return <div className="text-center py-20 text-slate-500 font-bold">جاري تحميل البيانات...</div>;
  if (!customer) return <div className="text-center py-20 text-rose-500 font-bold">العميل غير موجود</div>;

  const totalDebit = transactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0);
  const totalCredit = transactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0);
  const finalBalance = totalDebit - totalCredit;

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-all">
            <ChevronRight size={24} className="text-slate-800" />
          </button>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">تفاصيل الحساب</h2>
        </div>
        <button
          onClick={handleDeleteCustomer}
          className="p-2.5 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-100 transition-colors"
          title="حذف العميل"
        >
          <Trash2 size={20} />
        </button>
      </div>

      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1 mr-2">
            {isEditingCustomer ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold"
                  placeholder="اسم العميل"
                />
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-sans"
                  placeholder="رقم الهاتف"
                />
                <div className="flex gap-2">
                  <button onClick={handleUpdateCustomer} className="flex-1 bg-indigo-600 text-white py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1">
                    <Check size={14} /> حفظ
                  </button>
                  <button onClick={() => setIsEditingCustomer(false)} className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1">
                    <X size={14} /> إلغاء
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-black text-slate-900">{customer.name}</h3>
                  <button
                    onClick={() => setIsEditingCustomer(true)}
                    className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                  >
                    <Edit size={18} />
                  </button>
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  <p className="text-slate-500 font-black flex items-center gap-2">
                    <Phone size={16} className="text-indigo-600" />
                    <span className="font-sans tracking-wider">{customer.phone || 'لا يوجد رقم'}</span>
                  </p>
                  <p className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg font-black border border-indigo-100">
                    {customer.currency || settings?.currency}
                  </p>
                </div>
              </>
            )}
          </div>
          {!isEditingCustomer && (
            <button onClick={onAddTransaction} className="bg-indigo-600 text-white p-4 rounded-3xl shadow-xl shadow-indigo-100 active:scale-95 transition-transform">
              <Plus size={28} />
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-emerald-50/50 p-4 rounded-[1.5rem] border border-emerald-100 text-center">
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1.5">مدين (+)</p>
            <p className="text-base font-black text-emerald-700 font-sans">{totalDebit.toLocaleString('en-US')}</p>
          </div>
          <div className="bg-rose-50/50 p-4 rounded-[1.5rem] border border-rose-100 text-center">
            <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1.5">دائن (-)</p>
            <p className="text-base font-black text-rose-700 font-sans">{totalCredit.toLocaleString('en-US')}</p>
          </div>
          <div className="bg-indigo-50/50 p-4 rounded-[1.5rem] border border-indigo-100 text-center">
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1.5">المتبقي</p>
            <p className="text-base font-black text-indigo-700 font-sans">{Math.abs(finalBalance).toLocaleString('en-US')}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <button onClick={sendWhatsAppReminder} className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 transition-all">
            <MessageSquare size={20} />
            <span className="text-[10px] font-bold">تذكير واتساب</span>
          </button>
          <button onClick={() => generateExport('pdf')} className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-slate-50 text-slate-700 border border-slate-100 hover:bg-slate-100 transition-all">
            <FileText size={20} className="text-slate-600" />
            <span className="text-[10px] font-bold">تصدير PDF</span>
          </button>
          <button onClick={() => generateExport('png')} className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-slate-50 text-slate-700 border border-slate-100 hover:bg-slate-100 transition-all">
            <Share2 size={20} className="text-slate-600" />
            <span className="text-[10px] font-bold">تصدير صورة</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
        <div className="bg-slate-800 p-4 flex justify-between items-center">
          <h4 className="text-white font-black text-sm">سجل العمليات المباشر</h4>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">تنسيق تلقائي</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-600 border-b border-slate-200">
                <th className="p-4 font-black border-l border-slate-200">التاريخ</th>
                <th className="p-4 font-black border-l border-slate-200">البيان</th>
                <th className="p-4 font-black border-l border-slate-200 text-center">مدين (+)</th>
                <th className="p-4 font-black border-l border-slate-200 text-center">دائن (-)</th>
                <th className="p-4 font-black text-center">الرصيد</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.length > 0 ? (() => {
                let balance = 0;
                return transactions.map((tx, i) => {
                  balance += tx.type === 'debit' ? tx.amount : -tx.amount;
                  return (
                    <tr key={tx.id} onClick={() => onEditTransaction(tx)} className={`${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} active:bg-indigo-50 transition-colors cursor-pointer`}>
                      <td className="p-4 font-bold text-slate-500 border-l border-slate-50 font-sans text-center">{format(new Date(tx.date), 'dd/MM/yyyy')}</td>
                      <td className="p-4 font-black text-slate-800 border-l border-slate-50">{tx.note || '-'}</td>
                      <td className="p-4 font-black text-emerald-600 text-center border-l border-slate-50 font-sans">{tx.type === 'debit' ? tx.amount.toLocaleString('en-US') : '-'}</td>
                      <td className="p-4 font-black text-rose-600 text-center border-l border-slate-50 font-sans">{tx.type === 'credit' ? tx.amount.toLocaleString('en-US') : '-'}</td>
                      <td className="p-4 font-black text-slate-900 text-center bg-slate-100/30 font-sans">{balance.toLocaleString('en-US')}</td>
                    </tr>
                  );
                });
              })() : (
                <tr><td colSpan={5} className="p-16 text-center text-slate-400 font-black">لا يوجد عمليات مسجلة حالياً</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-6 bg-slate-900 flex justify-between items-center">
          <span className="text-slate-400 font-black text-xs uppercase tracking-widest">إجمالي الرصيد النهائي</span>
          <div className="text-left">
            <span className="text-xl font-black text-white font-sans mr-2">{Math.abs(finalBalance).toLocaleString('en-US')}</span>
            <span className="text-[10px] text-indigo-400 font-black uppercase">{customer?.currency || settings?.currency}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
