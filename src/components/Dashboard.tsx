import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight, ArrowDownLeft, Users, Plus, Search, User, Phone } from 'lucide-react';
import { Stats, Customer } from '../types';
import { api } from '../lib/api';
import { toast } from 'react-hot-toast';

interface DashboardProps {
  stats: Stats | null;
  onSelectCustomer: (id: number) => void;
}

export default function Dashboard({ stats, onSelectCustomer }: DashboardProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });

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

  const handleAddCustomer = async () => {
    if (!newCustomer.name.trim()) {
      toast.error('الاسم مطلوب');
      return;
    }
    try {
      await api.addCustomer(newCustomer);
      toast.success('تم إضافة العميل بنجاح');
      setNewCustomer({ name: '', phone: '' });
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

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white">
              <ArrowDownLeft size={18} />
            </div>
            <span className="text-[10px] font-medium text-emerald-600">مدين (عليه)</span>
          </div>
          <p className="text-lg font-bold text-emerald-700">{(stats?.total_debit || 0).toLocaleString()} <span className="text-[10px] font-normal">د.أ</span></p>
        </div>

        <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 bg-rose-500 rounded-lg flex items-center justify-center text-white">
              <ArrowUpRight size={18} />
            </div>
            <span className="text-[10px] font-medium text-rose-600">دائن (سدد)</span>
          </div>
          <p className="text-lg font-bold text-rose-700">{(stats?.total_credit || 0).toLocaleString()} <span className="text-[10px] font-normal">د.أ</span></p>
        </div>
      </div>

      {/* Add Customer Section */}
      <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm">
        {!isAddingCustomer ? (
          <button 
            onClick={() => setIsAddingCustomer(true)}
            className="w-full py-2.5 bg-indigo-600 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 active:scale-95 transition-transform"
          >
            <Plus size={18} />
            إضافة عميل جديد
          </button>
        ) : (
          <div className="space-y-3">
            <h3 className="font-bold text-slate-800 text-sm mb-2">إضافة عميل جديد</h3>
            <input 
              type="text"
              placeholder="اسم العميل"
              value={newCustomer.name}
              onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <input 
              type="text"
              placeholder="رقم الهاتف"
              value={newCustomer.phone}
              onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <div className="flex gap-2">
              <button 
                onClick={handleAddCustomer}
                className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-xs font-bold"
              >
                حفظ العميل
              </button>
              <button 
                onClick={() => setIsAddingCustomer(false)}
                className="flex-1 bg-slate-100 text-slate-600 py-2.5 rounded-xl text-xs font-bold"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Customers List Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-bold text-slate-800 text-sm">قائمة العملاء</h3>
          <span className="text-[10px] text-slate-400">{customers.length} عميل</span>
        </div>

        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="بحث عن عميل..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl py-2.5 pr-10 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-10 text-slate-400 text-sm">جاري التحميل...</div>
          ) : filteredCustomers.length > 0 ? (
            filteredCustomers.map((customer) => (
              <button
                key={customer.id}
                onClick={() => onSelectCustomer(customer.id)}
                className="w-full bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex items-center justify-between hover:border-indigo-100 active:scale-[0.98] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
                    <User size={20} />
                  </div>
                  <div className="text-right">
                    <h4 className="font-bold text-slate-800 text-[13px]">{customer.name}</h4>
                    {customer.phone && (
                      <p className="text-[9px] text-slate-500 flex items-center gap-1">
                        <Phone size={9} />
                        {customer.phone}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-left">
                  <p className={`text-[13px] font-bold ${customer.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {Math.abs(customer.balance).toLocaleString()}
                    <span className="text-[9px] font-normal mr-1">د.أ</span>
                  </p>
                  <p className="text-[9px] text-slate-400">
                    {customer.balance >= 0 ? 'لي عنده' : 'عليّ له'}
                  </p>
                </div>
              </button>
            ))
          ) : (
            <div className="text-center py-10 bg-white rounded-3xl border border-dashed border-slate-200">
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mx-auto mb-2">
                <Users size={24} />
              </div>
              <p className="text-slate-400 text-xs">لا يوجد عملاء مضافين حالياً</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
