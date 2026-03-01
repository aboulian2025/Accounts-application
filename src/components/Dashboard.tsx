import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight, ArrowDownLeft, Users, Plus, Search, User, Phone, Wallet, TrendingUp, ArrowLeftRight, Banknote } from 'lucide-react';
import { Stats, Customer } from '../types';
import { api } from '../lib/api';
import { toast } from 'react-hot-toast';

interface DashboardProps {
  stats: Stats | null;
  onSelectCustomer: (id: number) => void;
  settings: any;
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

export default function Dashboard({ stats, onSelectCustomer, settings }: DashboardProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', currency: settings?.currency || 'د.أ' });

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    if (settings?.currency) {
      setNewCustomer(prev => ({ ...prev, currency: settings.currency }));
    }
  }, [settings]);

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

  const handleAddCustomer = async () => {
    if (!newCustomer.name.trim()) {
      toast.error('الاسم مطلوب');
      return;
    }
    try {
      await api.addCustomer(newCustomer);
      toast.success('تم إضافة العميل بنجاح');
      setNewCustomer({ name: '', phone: '', currency: settings?.currency || 'د.أ' });
      setIsAddingCustomer(false);
      loadCustomers();
    } catch (error) {
      toast.error('فشل إضافة العميل');
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.phone?.includes(searchQuery)
  );

  const totalRemaining = (stats?.total_debit || 0) - (stats?.total_credit || 0);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-[1.5rem] shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center text-white">
                <TrendingUp size={16} />
              </div>
              <span className="text-[10px] font-black text-emerald-600 uppercase">إجمالي المستحقات</span>
            </div>
            <p className="text-xl font-black text-emerald-700 font-sans">{(stats?.total_debit || 0).toLocaleString('en-US')}</p>
            <p className="text-[9px] text-emerald-500 font-bold mt-1">(ما تطلبه من العملاء)</p>
          </div>

          <div className="bg-rose-50 border border-rose-100 p-4 rounded-[1.5rem] shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 bg-rose-500 rounded-lg flex items-center justify-center text-white">
                <Wallet size={16} />
              </div>
              <span className="text-[10px] font-black text-rose-600 uppercase">إجمالي التحصيلات</span>
            </div>
            <p className="text-xl font-black text-rose-700 font-sans">{(stats?.total_credit || 0).toLocaleString('en-US')}</p>
            <p className="text-[9px] text-rose-500 font-bold mt-1">(المبالغ المسددة فعلياً)</p>
          </div>
        </div>

        <div className="bg-indigo-600 p-4 rounded-[1.5rem] shadow-lg shadow-indigo-100 flex justify-between items-center text-white">
          <div>
            <p className="text-[10px] font-black opacity-80 uppercase mb-1">صافي الرصيد المتبقي في السوق</p>
            <p className="text-2xl font-black font-sans">{Math.abs(totalRemaining).toLocaleString('en-US')}</p>
          </div>
          <div className="bg-white/20 p-3 rounded-2xl">
            <ArrowLeftRight size={24} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 p-5 shadow-sm">
        {!isAddingCustomer ? (
          <button 
            onClick={() => setIsAddingCustomer(true)}
            className="w-full py-3.5 bg-slate-50 text-indigo-600 border border-indigo-50 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-indigo-50 active:scale-[0.98] transition-all"
          >
            <Plus size={20} />
            إضافة عميل جديد للقائمة
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-black text-slate-800 text-sm">بيانات العميل الجديد</h3>
              <button onClick={() => setIsAddingCustomer(false)} className="text-[10px] font-black text-rose-500">إلغاء</button>
            </div>
            <input 
              type="text"
              placeholder="اسم العميل الرباعي"
              value={newCustomer.name}
              onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="رقم الهاتف"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-sans"
              />
              <div className="relative">
                <Banknote size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-500 z-10" />
                <select
                  value={newCustomer.currency}
                  onChange={(e) => setNewCustomer({ ...newCustomer, currency: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pr-10 pl-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold appearance-none"
                >
                  {CURRENCIES.map(curr => (
                    <option key={curr.value} value={curr.value}>{curr.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={handleAddCustomer}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-black shadow-lg shadow-indigo-100"
            >
              حفظ وتثبيت العميل
            </button>
          </div>
        )}
      </div>

      <div className="space-y-4 pb-10">
        <div className="flex items-center justify-between px-2">
          <h3 className="font-black text-slate-800 text-base">قائمة العملاء</h3>
          <div className="bg-slate-100 px-3 py-1 rounded-full">
            <span className="text-[10px] font-black text-slate-500">{customers.length} عميل مسجل</span>
          </div>
        </div>

        <div className="relative group">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
          <input 
            type="text"
            placeholder="بحث بالاسم أو برقم الهاتف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border-2 border-slate-50 rounded-2xl py-3.5 pr-12 pl-4 text-sm focus:outline-none focus:border-indigo-100 focus:ring-4 focus:ring-indigo-500/5 transition-all font-bold"
          />
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-10 text-slate-400 text-sm font-bold animate-pulse">جاري جلب القائمة...</div>
          ) : filteredCustomers.length > 0 ? (
            filteredCustomers.map((customer) => (
              <button
                key={customer.id}
                onClick={() => onSelectCustomer(customer.id)}
                className="w-full bg-white border border-slate-100 p-4 rounded-[1.5rem] shadow-sm flex items-center justify-between hover:border-indigo-200 active:scale-[0.98] transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${customer.balance >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    <User size={24} />
                  </div>
                  <div className="text-right">
                    <h4 className="font-black text-slate-800 text-sm">{customer.name}</h4>
                    <div className="flex items-center gap-2">
                      {customer.phone && (
                        <p className="text-[10px] text-slate-400 flex items-center gap-1 font-sans mt-0.5 font-bold">
                          <Phone size={10} />
                          {customer.phone}
                        </p>
                      )}
                      <p className="text-[10px] bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded-md font-bold border border-slate-100">{customer.currency || settings?.currency}</p>
                    </div>
                  </div>
                </div>
                <div className="text-left border-r pr-4 border-slate-50">
                  <p className={`text-base font-black ${customer.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'} font-sans`}>
                    {Math.abs(customer.balance).toLocaleString('en-US')}
                  </p>
                  <p className={`text-[9px] font-black px-2 py-0.5 rounded-full inline-block mt-1 ${customer.balance >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {customer.balance >= 0 ? 'متبقي عليه' : 'له عندنا'}
                  </p>
                </div>
              </button>
            ))
          ) : (
            <div className="text-center py-16 bg-white rounded-[2rem] border-2 border-dashed border-slate-100">
              <Users size={48} className="text-slate-100 mx-auto mb-4" />
              <p className="text-slate-400 font-black text-sm">لم يتم العثور على أي عميل بهذا الاسم</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
