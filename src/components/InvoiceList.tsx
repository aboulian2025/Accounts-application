import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, FileText, Trash2, ChevronRight, Search, Printer, Share2, Calendar } from 'lucide-react';
import { api } from '../lib/api';
import { Invoice, AppSettings } from '../types';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

interface InvoiceListProps {
  onAddInvoice: () => void;
  onViewInvoice: (invoice: Invoice) => void;
  settings: AppSettings | null;
  onBack: () => void;
}

export default function InvoiceList({ onAddInvoice, onViewInvoice, settings, onBack }: InvoiceListProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      const data = await api.getInvoices();
      setInvoices(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('هل أنت متأكد من حذف هذه الفاتورة؟')) return;
    try {
      await api.deleteInvoice(id);
      toast.success('تم حذف الفاتورة');
      loadInvoices();
    } catch (error) {
      toast.error('فشل الحذف');
    }
  };

  const filteredInvoices = invoices.filter(inv =>
    inv.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full">
            <ChevronRight size={24} />
          </button>
          <h2 className="text-xl font-black text-slate-800">سجل الفواتير</h2>
        </div>
        <button onClick={onAddInvoice} className="bg-indigo-600 text-white p-3 rounded-2xl shadow-lg shadow-indigo-100 active:scale-95 transition-all">
          <Plus size={24} />
        </button>
      </div>

      <div className="relative group">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="بحث باسم العميل..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white border-2 border-slate-50 rounded-2xl py-3.5 pr-12 pl-4 text-sm focus:outline-none focus:border-indigo-100 font-bold"
        />
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-10 text-slate-400 font-bold">جاري تحميل الفواتير...</div>
        ) : filteredInvoices.length > 0 ? (
          filteredInvoices.map((inv) => (
            <div
              key={inv.id}
              onClick={() => onViewInvoice(inv)}
              className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between hover:border-indigo-200 transition-all cursor-pointer active:scale-[0.98]"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                  <FileText size={24} />
                </div>
                <div>
                  <h4 className="font-black text-slate-800 text-sm">{inv.customer_name}</h4>
                  <p className="text-[10px] text-slate-400 flex items-center gap-1 font-sans mt-0.5 font-bold">
                    <Calendar size={10} />
                    {format(new Date(inv.date), 'dd/MM/yyyy')}
                  </p>
                </div>
              </div>
              <div className="text-left flex items-center gap-4">
                <div className="border-r pr-4 border-slate-50">
                  <p className="text-base font-black text-indigo-600 font-sans">
                    {inv.total_amount.toLocaleString('en-US')}
                  </p>
                  <p className="text-[9px] font-black text-slate-400 uppercase">{settings?.currency}</p>
                </div>
                <button
                  onClick={(e) => handleDelete(inv.id, e)}
                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-16 bg-white rounded-[2rem] border-2 border-dashed border-slate-100">
            <FileText size={48} className="text-slate-100 mx-auto mb-4" />
            <p className="text-slate-400 font-black text-sm">لا يوجد فواتير مسجلة</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
