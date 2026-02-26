import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ChevronRight, User, Hash, FileText, Calendar, Clock, Check, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { Customer, Transaction } from '../types';
import { toast } from 'react-hot-toast';

interface TransactionFormProps {
  initialCustomerId: number | null;
  initialData?: Transaction;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function TransactionForm({ initialCustomerId, initialData, onSuccess, onCancel }: TransactionFormProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [customerId, setCustomerId] = useState<string>(initialCustomerId?.toString() || initialData?.customer_id.toString() || '');
  const [type, setType] = useState<'debit' | 'credit'>(initialData?.type || 'debit');
  const [amount, setAmount] = useState(initialData?.amount.toString() || '');
  const [note, setNote] = useState(initialData?.note || '');
  const [date, setDate] = useState(initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(initialData?.due_date ? new Date(initialData.due_date).toISOString().split('T')[0] : '');
  
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const data = await api.getCustomers();
      setCustomers(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || isNaN(Number(amount))) {
      toast.error('يرجى إدخال مبلغ صحيح');
      return;
    }

    try {
      let finalCustomerId = Number(customerId);

      if (isNewCustomer) {
        if (!newCustomerName) {
          toast.error('يرجى إدخال اسم العميل');
          return;
        }
        const res = await api.addCustomer({ name: newCustomerName, phone: newCustomerPhone });
        finalCustomerId = res.id;
      }

      if (!finalCustomerId) {
        toast.error('يرجى اختيار عميل');
        return;
      }

      if (initialData) {
        await api.updateTransaction(initialData.id, {
          type,
          amount: Number(amount),
          note,
          date: new Date(date).toISOString(),
          due_date: dueDate ? new Date(dueDate).toISOString() : undefined
        });
        toast.success('تم تحديث العملية بنجاح');
      } else {
        await api.addTransaction({
          customer_id: finalCustomerId,
          type,
          amount: Number(amount),
          note,
          date: new Date(date).toISOString(),
          due_date: dueDate ? new Date(dueDate).toISOString() : undefined
        });
        toast.success('تم إضافة العملية بنجاح');
      }

      onSuccess();
    } catch (error) {
      toast.error(initialData ? 'فشل تحديث العملية' : 'فشل حفظ العملية');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-4">
        <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ChevronRight size={24} />
        </button>
        <h2 className="text-lg font-bold text-slate-800">{initialData ? 'تعديل العملية' : 'إضافة عملية جديدة'}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 pb-10">
        {/* Transaction Type Toggle */}
        <div className="flex p-1 bg-slate-100 rounded-2xl">
          <button
            type="button"
            onClick={() => setType('debit')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-[13px] transition-all ${type === 'debit' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
          >
            مدين (عليه)
          </button>
          <button
            type="button"
            onClick={() => setType('credit')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-[13px] transition-all ${type === 'credit' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'}`}
          >
            دائن (سدد)
          </button>
        </div>

        {/* Customer Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <label className="text-[13px] font-bold text-slate-700">العميل</label>
            <button 
              type="button"
              onClick={() => setIsNewCustomer(!isNewCustomer)}
              className="text-[11px] text-indigo-600 font-bold"
            >
              {isNewCustomer ? 'اختيار من القائمة' : '+ عميل جديد'}
            </button>
          </div>

          {isNewCustomer ? (
            <div className="space-y-3 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400" size={16} />
                <input 
                  type="text"
                  placeholder="اسم العميل الجديد"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="w-full bg-white border border-indigo-200 rounded-xl py-2.5 pr-10 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div className="relative">
                <Hash className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400" size={16} />
                <input 
                  type="text"
                  placeholder="رقم الهاتف (اختياري)"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  className="w-full bg-white border border-indigo-200 rounded-xl py-2.5 pr-10 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
          ) : (
            <select 
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none"
            >
              <option value="">اختر عميل...</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Amount */}
        <div className="space-y-2">
          <label className="text-[13px] font-bold text-slate-700 px-1">المبلغ</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">د.أ</span>
            <input 
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl py-3 px-4 text-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {/* Note */}
        <div className="space-y-2">
          <label className="text-[13px] font-bold text-slate-700 px-1">ملاحظة</label>
          <div className="relative">
            <FileText className="absolute right-3 top-3 text-slate-400" size={16} />
            <textarea 
              placeholder="اكتب ملاحظة هنا..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full bg-white border border-slate-200 rounded-2xl py-2.5 pr-10 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 px-1">تاريخ العملية</label>
            <input 
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 px-1">موعد الاستحقاق</label>
            <input 
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex gap-3">
          {initialData && (
            <button 
              type="button"
              onClick={async () => {
                if (confirm('هل أنت متأكد من حذف هذه العملية؟')) {
                  try {
                    await api.deleteTransaction(initialData.id);
                    toast.success('تم حذف العملية');
                    onSuccess();
                  } catch (e) {
                    toast.error('فشل حذف العملية');
                  }
                }
              }}
              className="flex-1 bg-rose-50 text-rose-600 py-3.5 rounded-2xl font-bold text-base border border-rose-100 hover:bg-rose-100 transition-all flex items-center justify-center gap-2"
            >
              <Trash2 size={20} />
              حذف
            </button>
          )}
          <button 
            type="submit"
            className={`${initialData ? 'flex-[2]' : 'w-full'} bg-indigo-600 text-white py-3.5 rounded-2xl font-bold text-base shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2`}
          >
            <Check size={20} />
            {initialData ? 'حفظ التعديلات' : 'حفظ العملية'}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
