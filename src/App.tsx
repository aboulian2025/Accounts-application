import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { 
  LayoutDashboard, 
  Users, 
  PlusCircle, 
  Settings as SettingsIcon, 
  Search,
  ArrowRightLeft,
  ChevronLeft,
  Phone,
  MessageSquare,
  FileText,
  Trash2,
  Edit,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Bell,
  Cloud,
  LogOut,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from './lib/api';
import { Customer, Transaction, Stats, AppSettings } from './types';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

// Components
import Dashboard from './components/Dashboard';
import CustomerDetails from './components/CustomerDetails';
import TransactionForm from './components/TransactionForm';
import Settings from './components/Settings';

import { auth, signInWithGoogle } from './lib/firebase';
import { syncService } from './lib/syncService';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

type View = 'dashboard' | 'customers' | 'customer-details' | 'add-transaction' | 'edit-transaction' | 'settings' | 'login';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    refreshData();
  }, []);

  const isRefreshing = React.useRef(false);

  const refreshData = async () => {
    if (isRefreshing.current) return;
    isRefreshing.current = true;
    try {
      const [newStats, newSettings] = await Promise.all([
        api.getStats(),
        api.getSettings()
      ]);
      setStats(newStats);
      setSettings(newSettings);
    } catch (error) {
      console.error('Failed to fetch data', error);
      // Only show toast if it's not a rate limit error or if we want to inform the user
      if (error instanceof Error && error.message.includes('Rate exceeded')) {
        toast.error('تم تجاوز حد الطلبات، يرجى الانتظار قليلاً');
      } else {
        toast.error('خطأ في تحميل البيانات');
      }
    } finally {
      isRefreshing.current = false;
    }
  };

  const navigateTo = (view: View, customerId: number | null = null, transaction: Transaction | null = null) => {
    setCurrentView(view);
    setSelectedCustomerId(customerId);
    setSelectedTransaction(transaction);
    if (view === 'dashboard') refreshData();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-md mx-auto shadow-xl relative overflow-hidden">
      <Toaster position="top-center" />
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <ArrowRightLeft size={24} />
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight">{settings?.business_name || 'دفتر الذمم'}</h1>
            <p className="text-[10px] text-slate-500">الإدارة الشخصية للديون</p>
          </div>
        </div>
        <button 
          onClick={() => navigateTo('settings')}
          className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
        >
          <SettingsIcon size={22} />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {currentView === 'dashboard' && (
            <Dashboard 
              stats={stats} 
              onSelectCustomer={(id) => navigateTo('customer-details', id)}
            />
          )}
          {currentView === 'customer-details' && selectedCustomerId && (
            <CustomerDetails 
              customerId={selectedCustomerId} 
              onBack={() => navigateTo('dashboard')}
              onAddTransaction={() => navigateTo('add-transaction', selectedCustomerId)}
              onEditTransaction={(tx) => navigateTo('edit-transaction', selectedCustomerId, tx)}
              settings={settings}
            />
          )}
          {(currentView === 'add-transaction' || currentView === 'edit-transaction') && (
            <TransactionForm 
              initialCustomerId={selectedCustomerId}
              initialData={selectedTransaction || undefined}
              onSuccess={() => {
                if (selectedCustomerId) {
                  navigateTo('customer-details', selectedCustomerId);
                } else {
                  navigateTo('dashboard');
                }
              }}
              onCancel={() => {
                if (selectedCustomerId) {
                  navigateTo('customer-details', selectedCustomerId);
                } else {
                  navigateTo('dashboard');
                }
              }}
            />
          )}
          {currentView === 'settings' && (
            <Settings 
              settings={settings} 
              onUpdate={refreshData}
              onBack={() => navigateTo('dashboard')}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
