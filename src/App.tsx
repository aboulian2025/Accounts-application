import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { 
  Settings as SettingsIcon,
  ArrowLeftRight,
  Cloud,
  FileText,
  LayoutDashboard,
  Download
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

const CURRENT_VERSION = "1.0.0";
const GITHUB_USERNAME = "aboulian2025";
const REPO_NAME = "Accounts-application";

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

  useEffect(() => {
    refreshData();
    // فحص التحديثات بعد ثانيتين من تشغيل التطبيق لضمان استقرار الاتصال
    const timer = setTimeout(() => checkForUpdates(), 2000);
    return () => clearTimeout(timer);
  }, []);

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

  const checkForUpdates = async () => {
    try {
      // ✅ استخدام jsDelivr لتجنب مشاكل الـ Cache والـ Raw URL
      const url = `https://cdn.jsdelivr.net/gh/${GITHUB_USERNAME}/${REPO_NAME}@main/version.json`;
      const response = await fetch(url);

      if (!response.ok) throw new Error('Network response was not ok');

      const data = await response.json();
      console.log('Update Check - Online:', data.latestVersion, 'Current:', CURRENT_VERSION);

      if (data.latestVersion !== CURRENT_VERSION) {
        toast((t) => (
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-bold">يتوفر إصدار جديد ({data.latestVersion})</p>
              <p className="text-[10px] text-slate-500">انقر للتنزيل من GitHub</p>
            </div>
            <button
              onClick={() => {
                window.open(data.downloadUrl, '_blank');
                toast.dismiss(t.id);
              }}
              className="bg-indigo-600 text-white p-2 rounded-lg shadow-lg active:scale-90 transition-transform"
            >
              <Download size={16} />
            </button>
          </div>
        ), { duration: 15000, position: 'top-center' });
      }
    } catch (error) {
      console.warn('Check update failed:', error);
    }
  };

  const autoSync = async () => {
    if (auth.currentUser) {
      try { await syncService.syncToCloud(); } catch (err) { }
    }
  };

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
        <button onClick={() => navigateTo('settings')} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
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
              onViewInvoice={handleViewInvoice}
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
