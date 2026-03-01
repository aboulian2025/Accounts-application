import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import {
  X, Plus, Trash2, Save, Printer, Share2,
  User, Calendar, FileText, ShoppingBag,
  MapPin, Phone, Building, Info, Banknote,
  CreditCard
} from 'lucide-react';
import { Invoice, InvoiceItem, AppSettings } from '../types';
import { api } from '../lib/api';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

interface InvoiceFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  settings: AppSettings | null;
  initialData?: Invoice | null;
}

const CURRENCIES = [
  { label: 'دينار أردني (د.أ)', value: 'د.أ' },
  { label: 'ريال سعودي (ر.س)', value: 'ر.س' },
  { label: 'ريال يمني (ر.ي)', value: 'ر.ي' },
  { label: 'جنيه مصري (ج.م)', value: 'ج.م' },
  { label: 'درهم إماراتي (د.إ)', value: 'د.إ' },
  { label: 'دولار ($)', value: '$' },
  { label: 'يورو (€)', value: '€' },
];

export default function InvoiceForm({ onSuccess, onCancel, settings, initialData }: InvoiceFormProps) {
  const [customerName, setCustomerName] = useState(initialData?.customer_name || '');
  const [date, setDate] = useState(initialData?.date || format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [terms, setTerms] = useState(initialData?.terms || 'هذه الفاتورة سارية لمدة أسبوع من تاريخه');
  const [currency, setCurrency] = useState(initialData?.currency || settings?.currency || 'د.أ');
  const [paidAmountStr, setPaidAmountStr] = useState<string>(initialData?.paid_amount?.toString() || '');

  const [items, setItems] = useState<InvoiceItem[]>(initialData?.items || [
    { name: '', quantity: 1, price: 0, total: 0 }
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  };

  const paidAmount = parseFloat(paidAmountStr) || 0;
  const remainingAmount = calculateTotal() - paidAmount;

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };
    if (field === 'quantity' || field === 'price') {
      item.total = Number(item.quantity || 0) * Number(item.price || 0);
    }
    newItems[index] = item;
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { name: '', quantity: 1, price: 0, total: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!customerName.trim()) return toast.error('يرجى إدخال اسم العميل');
    if (items.some(item => !item.name.trim())) return toast.error('يرجى إدخال أسماء جميع الأصناف');

    setIsSaving(true);
    try {
      const invoiceData = {
        customer_name: customerName,
        date: date,
        total_amount: calculateTotal(),
        paid_amount: paidAmount,
        remaining_amount: remainingAmount,
        currency: currency,
        notes: notes,
        terms: terms
      };

      if (initialData?.id) {
        await api.updateInvoice(initialData.id, invoiceData, items);
        toast.success('تم تحديث الفاتورة');
      } else {
        await api.addInvoice(invoiceData, items);
        toast.success('تم حفظ الفاتورة');
      }
      onSuccess();
    } catch (error) {
      toast.error('فشل في الحفظ');
    } finally {
      setIsSaving(false);
    }
  };

  const generateExport = async (type: 'pdf' | 'png') => {
    const toastId = toast.loading(`جاري تصدير الفاتورة (A5)...`);
    setIsExporting(true);

    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.left = '-9999px';
      iframe.style.width = '148mm'; // العودة لمقاس A5
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) throw new Error("Iframe creation failed");

      const htmlContent = `
        <html dir="rtl">
          <head>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
            <style>
              body { font-family: 'Cairo', sans-serif; background: white; padding: 20px; color: #1e293b; margin: 0; width: 148mm; box-sizing: border-box; }
              .invoice-box { border: 1px solid #eee; padding: 15px; border-radius: 10px; }
              .header { display: flex; justify-content: space-between; align-items: start; border-bottom: 4px solid #4f46e5; padding-bottom: 15px; margin-bottom: 15px; }
              .biz-info h1 { margin: 0; font-size: 16px; color: #1e293b; font-weight: 900; }
              .biz-info p { margin: 2px 0; font-size: 10px; color: #64748b; font-weight: bold; }
              .logo-area { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 5px; flex: 1; }
              .logo { width: 60px; height: 60px; border-radius: 12px; object-fit: cover; }
              .inv-title { background: #e11d48; color: white; padding: 2px 15px; border-radius: 4px; font-weight: 900; font-size: 12px; display: inline-block; margin-top: 5px; }
              .details-bar { display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 11px; background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
              th { background: #334155; color: white; padding: 8px; text-align: right; font-size: 10px; border: 1px solid #334155; }
              td { padding: 6px 8px; border: 1px solid #e2e8f0; font-size: 10px; font-weight: 700; }
              .footer { border-top: 2px solid #f1f5f9; padding-top: 10px; display: flex; justify-content: space-between; align-items: end; }
              .totals-box { width: 160px; }
              .total-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 11px; font-weight: 900; }
              .total-row.main { color: #4f46e5; border-top: 2px solid #e2e8f0; margin-top: 5px; padding-top: 5px; font-size: 13px; }
              .terms { font-size: 9px; color: #64748b; flex: 1; margin-left: 20px; border-right: 3px solid #cbd5e1; padding-right: 10px; }
              .num { font-family: 'Arial', sans-serif; }
            </style>
          </head>
          <body>
            <div class="invoice-box" id="capture-area">
              <div class="header">
                <div class="biz-info" style="width: 30%;">
                  <h1>${settings?.business_name || 'اسم النشاط'}</h1>
                  <p>${settings?.business_address || ''}</p>
                  <p class="num">${settings?.my_phone || ''}</p>
                </div>
                <div class="logo-area" style="width: 40%;">
                  ${settings?.business_logo ? `<img src="${settings.business_logo}" class="logo">` : '<div style="width:50px;height:50px;background:#f1f5f9;border-radius:10px;"></div>'}
                  <div class="inv-title">فاتورة مبيعات</div>
                </div>
                <div class="biz-info" style="text-align: left; width: 30%;">
                   <p class="num" style="font-size: 14px; color: #4f46e5; font-weight: 900;">#${initialData?.id || 'جديدة'}</p>
                </div>
              </div>
              <div class="details-bar">
                <div><strong style="color:#4f46e5;">المطلوب من الأخ:</strong> <span style="margin-right: 5px; font-size: 12px;">${customerName}</span></div>
                <div><strong>التاريخ:</strong> <span class="num" style="margin-right: 5px;">${format(new Date(date), 'dd/MM/yyyy')}</span></div>
              </div>
              <table>
                <thead>
                  <tr><th style="width: 30px;">#</th><th>الصنف</th><th style="width: 40px;">الكمية</th><th style="width: 60px;">السعر</th><th style="width: 70px;">الإجمالي</th></tr>
                </thead>
                <tbody>
                  ${items.map((item, i) => `
                    <tr><td class="num" style="text-align:center;">${i + 1}</td><td>${item.name}</td><td class="num">${item.quantity}</td><td class="num">${item.price.toLocaleString('en-US')}</td><td class="num">${(item.quantity * item.price).toLocaleString('en-US')}</td></tr>
                  `).join('')}
                </tbody>
              </table>
              <div class="footer">
                <div class="terms"><strong>ملاحظات:</strong><br/>${terms}</div>
                <div class="totals-box">
                  <div class="total-row"><span>الإجمالي:</span><span class="num">${calculateTotal().toLocaleString('en-US')}</span></div>
                  <div class="total-row" style="color:#059669;"><span>الواصل:</span><span class="num">${paidAmount.toLocaleString('en-US')}</span></div>
                  <div class="total-row main" style="color:#e11d48;"><span>الباقي:</span><span class="num">${remainingAmount.toLocaleString('en-US')} ${currency}</span></div>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;

      doc.open(); doc.write(htmlContent); doc.close();
      await new Promise(r => setTimeout(r, 1500));
      const captureArea = doc.getElementById('capture-area');
      const canvas = await html2canvas(captureArea!, { scale: 2, useCORS: true, logging: false });
      document.body.removeChild(iframe);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

      if (type === 'pdf') {
        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a5', compress: true });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        const pdfBase64 = pdf.output('datauristring');
        await saveAndShareFile(pdfBase64, `فاتورة_${customerName}.pdf`);
      } else {
        await saveAndShareFile(dataUrl, `فاتورة_${customerName}.jpg`);
      }
      toast.success('تم التصدير بنجاح', { id: toastId });
    } catch (error) {
      toast.error('خطأ في التصدير');
    } finally {
      setIsExporting(false);
    }
  };

  const saveAndShareFile = async (base64Data: string, fileName: string) => {
    try {
      if (!Capacitor.isNativePlatform()) {
        const link = document.createElement('a');
        link.download = fileName; link.href = base64Data; link.click();
        return;
      }
      const content = base64Data.split('base64,')[1];
      const res = await Filesystem.writeFile({ path: fileName, data: content, directory: Directory.Cache });
      await Share.share({ title: fileName, url: res.uri });
    } catch (e) { console.error(e); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pb-20">
      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-black text-slate-800">{initialData?.id ? 'تعديل الفاتورة' : 'إنشاء فاتورة جديدة'}</h2>
          <button onClick={onCancel} className="p-2 bg-slate-50 rounded-full"><X size={20} /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 px-1">اسم العميل</label>
            <div className="relative">
              <User size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-500" />
              <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pr-10 pl-4 text-sm font-bold focus:ring-2" placeholder="اسم المستلم"/>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 px-1">التاريخ</label>
            <div className="relative">
              <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-500" />
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pr-10 pl-4 text-sm font-sans font-bold"/>
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 px-1">العملة</label>
          <div className="relative">
            <Banknote size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-500 z-10" />
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pr-10 pl-2 text-sm font-bold appearance-none">
              {CURRENCIES.map(curr => <option key={curr.value} value={curr.value}>{curr.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-black text-slate-800 flex items-center gap-2"><ShoppingBag size={18} className="text-indigo-600" /> الأصناف</h3>
          <button onClick={addItem} className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full">+ صنف</button>
        </div>
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-3">
              <div className="flex gap-2">
                <input type="text" value={item.name} onChange={e => handleItemChange(index, 'name', e.target.value)} className="flex-1 bg-white border border-slate-200 rounded-xl py-2 px-3 text-sm font-bold" placeholder="اسم الصنف..."/>
                <button onClick={() => removeItem(index)} className="p-2 text-rose-500"><Trash2 size={18} /></button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input type="number" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-sm font-sans" placeholder="كمية"/>
                <input type="number" value={item.price} onChange={e => handleItemChange(index, 'price', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-sm font-sans" placeholder="سعر"/>
                <div className="bg-slate-100 rounded-xl py-2 px-3 text-sm font-sans font-black">{item.total.toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-indigo-600 p-6 rounded-[2.5rem] shadow-lg text-white space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black opacity-80">الواصل</label>
            <input type="text" inputMode="decimal" value={paidAmountStr} onChange={e => setPaidAmountStr(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-2xl py-3 px-4 text-base font-black text-white outline-none" placeholder="0"/>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black opacity-80">الباقي</label>
            <div className="w-full py-3 px-4 text-base font-black">{remainingAmount.toLocaleString()}</div>
          </div>
        </div>
        <div className="pt-4 border-t border-white/10 flex justify-between items-center">
          <span className="text-xs font-black opacity-80">الإجمالي النهائي:</span>
          <span className="text-2xl font-black">{calculateTotal().toLocaleString()} {currency}</span>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-4">
        <textarea value={terms} onChange={e => setTerms(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-xs font-bold" rows={2}/>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 text-white py-4 rounded-3xl font-black shadow-lg flex items-center justify-center gap-2">
          <Save size={20} /> {initialData?.id ? 'تحديث الفاتورة' : 'حفظ الفاتورة'}
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => generateExport('pdf')} className="bg-slate-800 text-white rounded-3xl flex items-center justify-center"><Printer size={20} /></button>
          <button onClick={() => generateExport('png')} className="bg-slate-100 text-slate-700 rounded-3xl flex items-center justify-center"><Share2 size={20} /></button>
        </div>
      </div>
    </motion.div>
  );
}
