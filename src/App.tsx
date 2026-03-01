import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { 
  Settings as SettingsIcon,
  ArrowLeftRight,
  Cloud,
  FileText,
  LayoutDashboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from './lib/api';
import { Transaction, Stats, AppSettings, Invoice } from './types';

// Components
import Dashboard from './components/Dashboard';
import CustomerDetails from './components/CustomerDetails';
import TransactionForm from './components/TransactionForm';
import Settings from './components/Settings';
import InvoiceList from './components/InvoiceList';
import InvoiceForm from './components/InvoiceForm';

import { auth } from './lib/firebase';
import { syncService } from './lib/syncService';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

// Capacitor Plugins
import { App as CapacitorApp } from '@capacitor/app';

type View = 'dashboard' | 'customers' | 'customer-details' | 'add-transaction' | 'edit-transaction' | 'settings' | 'login' | 'invoices' | 'add-invoice';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    const backButtonHandler = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      if (currentView !== 'dashboard') {
        navigateTo('dashboard');
      } else {
        CapacitorApp.exitApp();
      }
    });
    return () => { backButtonHandler.then(h => h.remove()); };
  }, [currentView]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) autoSync();
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => { refreshData(); }, []);

  const refreshData = async () => {
    try {
      const [newStats, newSettings] = await Promise.all([
        api.getStats(),
        api.getSettings()
      ]);
      setStats(newStats);
      setSettings(newSettings);
    } catch (error) {
      console.error('Failed to fetch data', error);
    }
  };

  const autoSync = async () => {
    if (auth.currentUser) {
      try { await syncService.syncToCloud(); } catch (err) { }
    }
  };

  // ✅ تعديل دالة التنقل لجلب تفاصيل الفاتورة كاملة
  const handleViewInvoice = async (invoice: Invoice) => {
    const toastId = toast.loading('جاري تحميل تفاصيل الفاتورة...');
    try {
      const fullInvoice = await api.getInvoiceDetails(invoice.id);
      if (fullInvoice) {
        setSelectedInvoice(fullInvoice);
        setCurrentView('add-invoice');
        toast.dismiss(toastId);
      } else {
        toast.error('لم يتم العثور على تفاصيل الفاتورة', { id: toastId });
      }
    } catch (error) {
      toast.error('خطأ في تحميل البيانات', { id: toastId });
    }
  };

  const navigateTo = (view: View, customerId: number | null = null, transaction: Transaction | null = null, invoice: Invoice | null = null) => {
    setCurrentView(view);
    setSelectedCustomerId(customerId);
    setSelectedTransaction(transaction);
    setSelectedInvoice(invoice);
    if (view === 'dashboard' || view === 'invoices') refreshData();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-md mx-auto shadow-xl relative overflow-hidden font-sans">
      <Toaster position="top-center" />
      
      <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <ArrowLeftRight size={24} />
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight">{settings?.business_name || 'دفتر الذمم'}</h1>
            <div className="flex items-center gap-1">
              <p className="text-[10px] text-slate-500">الإدارة الاحترافية للديون</p>
              {user && settings?.cloud_sync_enabled === 'true' && (
                <Cloud size={10} className="text-emerald-500 animate-pulse" />
              )}
            </div>
          </div>
        </div>
        <button onClick={() => navigateTo('settings')} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full">
          <SettingsIcon size={22} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6 mb-20">
        <AnimatePresence mode="wait">
          {currentView === 'dashboard' && (
            <Dashboard stats={stats} settings={settings} onSelectCustomer={(id) => navigateTo('customer-details', id)} />
          )}
          {currentView === 'customer-details' && selectedCustomerId && (
            <CustomerDetails 
              customerId={selectedCustomerId} onBack={() => navigateTo('dashboard')}
              onAddTransaction={() => navigateTo('add-transaction', selectedCustomerId)}
              onEditTransaction={(tx) => navigateTo('edit-transaction', selectedCustomerId, tx)}
              settings={settings}
            />
          )}
          {currentView === 'invoices' && (
            <InvoiceList
              onAddInvoice={() => navigateTo('add-invoice')}
              onViewInvoice={handleViewInvoice} // استخدام الدالة الجديدة هنا
              settings={settings} onBack={() => navigateTo('dashboard')}
            />
          )}
          {currentView === 'add-invoice' && (
            <InvoiceForm
              settings={settings} initialData={selectedInvoice}
              onSuccess={() => navigateTo('invoices')} onCancel={() => navigateTo('invoices')}
            />
          )}
          {(currentView === 'add-transaction' || currentView === 'edit-transaction') && (
            <TransactionForm 
              initialCustomerId={selectedCustomerId} initialData={selectedTransaction || undefined}
              onSuccess={() => { refreshData(); if (selectedCustomerId) navigateTo('customer-details', selectedCustomerId); else navigateTo('dashboard'); }}
              onCancel={() => { if (selectedCustomerId) navigateTo('customer-details', selectedCustomerId); else navigateTo('dashboard'); }}
            />
          )}
          {currentView === 'settings' && (
            <Settings settings={settings} onUpdate={refreshData} onBack={() => navigateTo('dashboard')} />
          )}
        </AnimatePresence>
      </main>

      <nav className="bg-white border-t border-slate-200 px-6 py-3 flex justify-around items-center fixed bottom-0 w-full max-w-md z-20">
        <button onClick={() => navigateTo('dashboard')} className={`flex flex-col items-center gap-1 ${currentView === 'dashboard' ? 'text-indigo-600' : 'text-slate-400'}`}>
          <LayoutDashboard size={20} />
          <span className="text-[10px] font-black">الرئيسية</span>
        </button>
        <button onClick={() => navigateTo('invoices')} className={`flex flex-col items-center gap-1 ${currentView === 'invoices' || currentView === 'add-invoice' ? 'text-indigo-600' : 'text-slate-400'}`}>
          <FileText size={20} />
          <span className="text-[10px] font-black">الفواتير</span>
        </button>
        <button onClick={() => navigateTo('settings')} className={`flex flex-col items-center gap-1 ${currentView === 'settings' ? 'text-indigo-600' : 'text-slate-400'}`}>
          <SettingsIcon size={20} />
          <span className="text-[10px] font-black">الإعدادات</span>
        </button>
      </nav>
    </div>
  );
}
