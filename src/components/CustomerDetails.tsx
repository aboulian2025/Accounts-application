import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ChevronRight, 
  Phone, 
  MessageSquare, 
  FileText, 
  Plus, 
  Trash2, 
  ArrowUpRight, 
  ArrowDownLeft,
  Calendar,
  MoreVertical,
  Share2,
  Edit,
  MapPin,
  Building
} from 'lucide-react';
import { api } from '../lib/api';
import { Customer, Transaction, AppSettings } from '../types';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { toPng } from 'html-to-image';

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
  const statementRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, [customerId]);

  const isLoadingData = React.useRef(false);

  const loadData = async () => {
    if (isLoadingData.current) return;
    isLoadingData.current = true;
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
      // Ensure transactions are sorted by ID ASC (oldest to newest) for balance calculation
      setTransactions(txs.sort((a, b) => a.id - b.id));
    } catch (error) {
      console.error(error);
      if (error instanceof Error && error.message.includes('Rate exceeded')) {
        toast.error('تم تجاوز حد الطلبات، يرجى الانتظار قليلاً');
      }
    } finally {
      setLoading(false);
      isLoadingData.current = false;
    }
  };

  const handleDeleteTransaction = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذه العملية؟')) return;
    try {
      await api.deleteTransaction(id);
      toast.success('تم حذف العملية');
      loadData();
    } catch (error) {
      toast.error('فشل حذف العملية');
    }
  };

  const handleUpdateCustomer = async () => {
    if (!editForm.name.trim()) {
      toast.error('الاسم مطلوب');
      return;
    }
    try {
      await api.updateCustomer(customerId, { ...editForm });
      toast.success('تم تحديث بيانات العميل');
      setIsEditingCustomer(false);
      loadData();
    } catch (error) {
      toast.error('فشل تحديث البيانات');
    }
  };

  const sendReminder = () => {
    if (!customer?.phone) {
      toast.error('لا يوجد رقم هاتف لهذا العميل');
      return;
    }
    const amount = Math.abs(customer.balance).toLocaleString();
    const currency = settings?.currency || 'د.أ';
    const message = settings?.reminder_template
      .replace('{amount}', amount)
      .replace('{currency}', currency) || 
      `السلام عليكم، نود تذكيركم بأن الرصيد المستحق عليكم هو ${amount} ${currency}. يرجى السداد في أقرب وقت ممكن. شاكرين تعاونكم.`;
    
    const whatsappUrl = `https://wa.me/${customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const generatePDF = async () => {
    if (!customer || !settings || !statementRef.current) return;
    
    // Workaround for Arabic support in PDF: 
    // Capture the ledger as an image and insert it into the PDF
    try {
      toast.loading('جاري إنشاء ملف PDF...', { id: 'pdf-gen' });
      const dataUrl = await toPng(statementRef.current, { 
        cacheBust: true,
        backgroundColor: '#ffffff',
        pixelRatio: 2
      });
      
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      const imgProps = doc.getImageProperties(dataUrl);
      const pdfWidth = doc.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      doc.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      doc.save(`statement_${customer.name}.pdf`);
      toast.success('تم إنشاء ملف PDF بنجاح', { id: 'pdf-gen' });
    } catch (err) {
      console.error(err);
      toast.error('فشل إنشاء ملف PDF', { id: 'pdf-gen' });
    }
  };

  const generatePNG = async () => {
    if (!statementRef.current || !customer) return;
    try {
      toast.loading('جاري معالجة آخر 50 عملية...', { id: 'png-gen' });
      
      // Toggle export mode to filter transactions
      setIsExporting(true);
      
      // Wait for re-render
      await new Promise(resolve => setTimeout(resolve, 100));

      // Ensure all images are loaded before capture
      const images = statementRef.current.getElementsByTagName('img');
      await Promise.all(Array.from(images).map((img: HTMLImageElement) => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
      }));

      const dataUrl = await toPng(statementRef.current, { 
        cacheBust: true,
        backgroundColor: '#ffffff',
        pixelRatio: 3.111, // Targets ~1400px width (450 * 3.111)
        skipFonts: false,
        style: {
          padding: '15px',
          borderRadius: '0',
          margin: '0',
          fontFamily: 'Cairo, sans-serif'
        }
      });
      
      const link = document.createElement('a');
      link.download = `كشف_آخر_50_عملية_${customer.name}.png`;
      link.href = dataUrl;
      link.click();
      
      setIsExporting(false);
      toast.success('تم تصدير آخر 50 عملية بنجاح', { id: 'png-gen' });
    } catch (err) {
      console.error('PNG Export Error:', err);
      setIsExporting(false);
      toast.error('فشل تصدير الصورة', { id: 'png-gen' });
    }
  };

  if (loading) return <div className="text-center py-20">جاري التحميل...</div>;
  if (!customer) return <div className="text-center py-20">العميل غير موجود</div>;

  const totalDebit = transactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0);
  const totalCredit = transactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0);
  const totalTransactions = transactions.length;
  const finalBalance = totalDebit - totalCredit;

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4 text-sm"
    >
      {/* Header Info */}
      <div className="flex items-center gap-4 mb-1">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ChevronRight size={20} />
        </button>
        <h2 className="text-base font-bold text-slate-800">تفاصيل العميل</h2>
      </div>

      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            {isEditingCustomer ? (
              <div className="space-y-3 mb-4">
                <input 
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="اسم العميل"
                />
                <input 
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="رقم الهاتف"
                />
                <div className="flex gap-2">
                  <button onClick={handleUpdateCustomer} className="flex-1 bg-indigo-600 text-white py-2 rounded-xl text-xs font-bold">حفظ</button>
                  <button onClick={() => setIsEditingCustomer(false)} className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-xl text-xs font-bold">إلغاء</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-bold text-slate-800">{customer.name}</h3>
                  <button onClick={() => setIsEditingCustomer(true)} className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors">
                    <Edit size={14} />
                  </button>
                </div>
                <p className="text-slate-500 text-xs flex items-center gap-1">
                  <Phone size={12} />
                  {customer.phone || 'لا يوجد رقم'}
                </p>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-emerald-50 p-2 rounded-2xl text-center">
            <p className="text-[8px] font-medium text-emerald-600 uppercase mb-0.5">إجمالي المبلغ</p>
            <p className="text-[11px] font-bold text-emerald-700">{totalDebit.toLocaleString()} <span className="text-[7px] font-normal">{settings?.currency || 'د.أ'}</span></p>
          </div>
          <div className="bg-rose-50 p-2 rounded-2xl text-center">
            <p className="text-[8px] font-medium text-rose-600 uppercase mb-0.5">المبلغ المدفوع</p>
            <p className="text-[11px] font-bold text-rose-700">{totalCredit.toLocaleString()} <span className="text-[7px] font-normal">{settings?.currency || 'د.أ'}</span></p>
          </div>
          <div className={`p-2 rounded-2xl text-center ${finalBalance >= 0 ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'}`}>
            <p className="text-[8px] font-medium uppercase mb-0.5">المبلغ المتبقي</p>
            <p className="text-[11px] font-bold">{Math.abs(finalBalance).toLocaleString()} <span className="text-[7px] font-normal">{settings?.currency || 'د.أ'}</span></p>
          </div>
        </div>

          <div className="grid grid-cols-4 gap-2">
          <button 
            onClick={sendReminder}
            className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all"
          >
            <MessageSquare size={20} />
            <span className="text-[10px] font-bold">تذكير</span>
          </button>
          <button 
            onClick={generatePDF}
            className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all"
          >
            <FileText size={20} />
            <span className="text-[10px] font-bold">PDF</span>
          </button>
          <button 
            onClick={generatePNG}
            className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all"
          >
            <Share2 size={20} />
            <span className="text-[10px] font-bold">صورة</span>
          </button>
          <button 
            onClick={onAddTransaction}
            className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
          >
            <Plus size={20} />
            <span className="text-[10px] font-bold">عملية</span>
          </button>
        </div>
      </div>

      {/* Ledger Section */}
      <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm" ref={statementRef} style={{ width: '100%', maxWidth: '450px', margin: '0 auto' }}>
        {/* Store Header in View - Redesigned */}
        <div className="p-4 border-b border-slate-100 bg-white">
          <div className="flex items-center justify-between gap-2">
            {/* Right Side: Arabic Info */}
            <div className="flex-1 text-right space-y-0.5">
              <h4 className="font-bold text-slate-800 text-[10px]">{settings?.business_name}</h4>
              <p className="text-[7px] text-slate-500 flex items-center justify-end gap-1">
                {settings?.business_address}
                <MapPin size={7} />
              </p>
              <p className="text-[7px] text-slate-500 flex items-center justify-end gap-1">
                {settings?.my_phone}
                <Phone size={7} />
              </p>
            </div>

            {/* Center: Logo */}
            <div className="flex flex-col items-center justify-center px-2">
              {settings?.business_logo ? (
                <img 
                  src={settings.business_logo} 
                  alt="Logo" 
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-50 shadow-sm mb-1"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 border-2 border-slate-50 mb-1">
                  <Building size={20} />
                </div>
              )}
              <p className="text-[8px] font-bold text-indigo-600 uppercase tracking-widest">كشف حساب</p>
            </div>

            {/* Left Side: English Info */}
            <div className="flex-1 text-left space-y-0.5">
              <h4 className="font-bold text-slate-800 text-[10px]">{settings?.business_name_en}</h4>
              <p className="text-[7px] text-slate-500 flex items-center justify-start gap-1">
                <MapPin size={7} />
                {settings?.business_address_en}
              </p>
              <p className="text-[7px] text-slate-500 flex items-center justify-start gap-1">
                <Phone size={7} />
                {settings?.my_phone}
              </p>
            </div>
          </div>
          
          <div className="mt-3 flex justify-between items-center px-2 border-t border-slate-50 pt-2">
            <div className="text-right">
              <p className="text-[9px] font-bold text-slate-700">{customer.name}</p>
              <p className="text-[8px] text-slate-400">{customer.phone}</p>
            </div>
            <div className="text-left">
              <p className="text-[8px] text-slate-400">{format(new Date(), 'dd/MM/yyyy')}</p>
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <p className="text-[9px] text-slate-400 font-bold uppercase">سجل العمليات {isExporting && '(آخر 50)'}</p>
          <p className="text-[8px] text-indigo-400 italic">اضغط على العملية للتعديل</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-[10px] border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-600 uppercase tracking-wider border-y border-slate-200">
                <th className="px-2 py-2 font-bold border-l border-slate-200/50">التاريخ</th>
                <th className="px-2 py-2 font-bold border-l border-slate-200/50">الملاحظات</th>
                <th className="px-2 py-2 font-bold border-l border-slate-200/50">مدين</th>
                <th className="px-2 py-2 font-bold border-l border-slate-200/50">دائن</th>
                <th className="px-2 py-2 font-bold">الرصيد</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {transactions.length > 0 ? (
                (() => {
                  const txToDisplay = isExporting ? transactions.slice(-50) : transactions;
                  const startIndex = transactions.length - txToDisplay.length;
                  
                  // Calculate opening balance for the transactions before the slice
                  let openingBalance = 0;
                  for (let i = 0; i < startIndex; i++) {
                    const tx = transactions[i];
                    if (tx.type === 'debit') openingBalance += tx.amount;
                    else openingBalance -= tx.amount;
                  }

                  let runningBalance = openingBalance;
                  
                  return (
                    <>
                      {isExporting && startIndex > 0 && (
                        <tr className="bg-slate-50/80 italic font-bold text-slate-500">
                          <td colSpan={4} className="px-2 py-2 text-center border-l border-slate-100/50">رصيد سابق منقول</td>
                          <td className="px-2 py-2 bg-slate-100/50">{openingBalance.toLocaleString()}</td>
                        </tr>
                      )}
                      {txToDisplay.map((tx, index) => {
                        if (tx.type === 'debit') runningBalance += tx.amount;
                        else runningBalance -= tx.amount;
                        
                        return (
                          <tr 
                            key={tx.id} 
                            onClick={() => onEditTransaction(tx)}
                            className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'} hover:bg-indigo-50/30 transition-colors group cursor-pointer`}
                          >
                            <td className="px-2 py-1.5 text-[9px] text-slate-500 whitespace-nowrap border-l border-slate-100/50">
                              {format(new Date(tx.date), 'dd/MM/yyyy')}
                            </td>
                            <td className="px-2 py-1.5 border-l border-slate-100/50">
                              <p className="text-slate-700 font-medium leading-tight">{tx.note || '-'}</p>
                            </td>
                            <td className="px-2 py-1.5 text-emerald-600 font-bold border-l border-slate-100/50">
                              {tx.type === 'debit' ? tx.amount.toLocaleString() : '-'}
                            </td>
                            <td className="px-2 py-1.5 text-rose-600 font-bold border-l border-slate-100/50">
                              {tx.type === 'credit' ? tx.amount.toLocaleString() : '-'}
                            </td>
                            <td className="px-2 py-1.5 font-bold text-slate-900 bg-slate-50/50">
                              {runningBalance.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </>
                  );
                })()
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-400 italic bg-white">لا يوجد عمليات مسجلة حالياً</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Statement Summary Box - Professional Ledger Style */}
        <div className="px-6 py-5 bg-slate-50 border-t-2 border-slate-200">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${finalBalance > 0 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}></div>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">
                الحالة: {finalBalance > 0 ? 'رصيد مستحق' : finalBalance < 0 ? 'رصيد دائن' : 'خالص'}
              </p>
            </div>
            <div className="flex gap-8">
              <div className="text-center px-4 border-r border-slate-200">
                <p className="text-[7px] text-slate-400 uppercase tracking-wider mb-1">إجمالي مدين</p>
                <p className="text-[11px] font-black text-emerald-600">{totalDebit.toLocaleString()}</p>
              </div>
              <div className="text-center px-4 border-r border-slate-200">
                <p className="text-[7px] text-slate-400 uppercase tracking-wider mb-1">إجمالي دائن</p>
                <p className="text-[11px] font-black text-rose-600">{totalCredit.toLocaleString()}</p>
              </div>
              <div className="text-left px-4">
                <p className="text-[7px] text-slate-400 uppercase tracking-wider mb-1">الرصيد النهائي</p>
                <p className={`text-[12px] font-black ${finalBalance >= 0 ? 'text-indigo-600' : 'text-emerald-600'}`}>
                  {Math.abs(finalBalance).toLocaleString()} 
                  <span className="text-[8px] font-normal mr-1">{settings?.currency || 'د.أ'}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[10px] text-slate-400 font-medium tracking-widest uppercase">
            حقوق الملكية لهذا التطبيق - ameen assery
          </p>
        </div>
      </div>
    </motion.div>
  );
}
