import { db, auth } from './firebase';
import { collection, doc, setDoc, getDocs, query, where } from 'firebase/firestore';
import { api } from './api';
import { getDB } from './db';
import { toast } from 'react-hot-toast';

// ✅ التشفير وفك التشفير مع دعم العربية
const encrypt = (text: string, key: string) => {
  const utf8Text = encodeURIComponent(text).replace(/%([0-9A-F]{2})/g, (_, p1) =>
    String.fromCharCode(parseInt(p1, 16))
  );
  const xorText = utf8Text.split('').map((char, i) =>
    String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(i % key.length))
  ).join('');
  return btoa(xorText);
};

const decrypt = (encoded: string, key: string) => {
  try {
    const xorText = atob(encoded);
    const utf8Text = xorText.split('').map((char, i) =>
      String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(i % key.length))
    ).join('');
    return decodeURIComponent(utf8Text.split('').map((c) =>
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join(''));
  } catch (e) {
    console.error('Decryption failed', e);
    return '';
  }
};

export const syncService = {
  async syncToCloud() {
    const user = auth.currentUser;
    if (!user) return;

    try {
      // 1. جلب بيانات العملاء والعمليات
      const customers = await api.getCustomers();
      const fullCustomers = await Promise.all(customers.map(async (c) => {
        const txs = await api.getTransactions(c.id);
        return { ...c, transactions: txs };
      }));

      // 2. جلب بيانات الفواتير والأصناف
      const invoices = await api.getInvoices();
      const fullInvoices = await Promise.all(invoices.map(async (inv) => {
        const details = await api.getInvoiceDetails(inv.id);
        return details;
      }));

      // 3. جلب الإعدادات
      const settings = await api.getSettings();

      const dataToStore = JSON.stringify({
        customers: fullCustomers,
        invoices: fullInvoices,
        settings
      });

      const encryptedData = encrypt(dataToStore, user.uid);

      await setDoc(doc(db, 'backups', user.uid), {
        userId: user.uid,
        updatedAt: new Date().toISOString(),
        data: encryptedData
      });

      await api.updateSettings({ last_sync: new Date().toLocaleString('ar-EG') });
      console.log('✅ تم مزامنة كافة البيانات بما فيها الفواتير');
    } catch (error) {
      console.error('❌ فشل المزامنة الشاملة', error);
    }
  },

  async restoreFromCloud() {
    const user = auth.currentUser;
    if (!user) return;

    const toastId = toast.loading('جاري استعادة النسخة الاحتياطية الشاملة...');

    try {
      const q = query(collection(db, 'backups'), where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast.error('لا توجد نسخة احتياطية سحابية لهذا الحساب', { id: toastId });
        return;
      }

      const backup = querySnapshot.docs[0].data();
      const rawDecrypted = decrypt(backup.data, user.uid);
      if (!rawDecrypted) throw new Error('فشل فك تشفير البيانات');

      const restored = JSON.parse(rawDecrypted);
      const { customers, invoices, settings } = restored;

      const sqliteDB = getDB();
      const setCommands: any[] = [];

      // أوامر مسح كافة الجداول الحالية
      setCommands.push({ statement: 'DELETE FROM transactions', values: [] });
      setCommands.push({ statement: 'DELETE FROM customers', values: [] });
      setCommands.push({ statement: 'DELETE FROM invoice_items', values: [] });
      setCommands.push({ statement: 'DELETE FROM invoices', values: [] });

      // استعادة العملاء والعمليات
      if (customers && Array.isArray(customers)) {
        customers.forEach((c: any) => {
          setCommands.push({
            statement: 'INSERT INTO customers (id, name, phone, notes, currency) VALUES (?, ?, ?, ?, ?)',
            values: [c.id, c.name, c.phone || '', c.notes || '', c.currency || '']
          });
          if (c.transactions) {
            c.transactions.forEach((tx: any) => {
              setCommands.push({
                statement: 'INSERT INTO transactions (id, customer_id, type, amount, note, date, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
                values: [tx.id, c.id, tx.type, tx.amount, tx.note || '', tx.date, tx.due_date || null]
              });
            });
          }
        });
      }

      // استعادة الفواتير والأصناف
      if (invoices && Array.isArray(invoices)) {
        invoices.forEach((inv: any) => {
          setCommands.push({
            statement: 'INSERT INTO invoices (id, customer_name, date, total_amount, paid_amount, remaining_amount, currency, notes, terms) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            values: [inv.id, inv.customer_name, inv.date, inv.total_amount, inv.paid_amount || 0, inv.remaining_amount || 0, inv.currency || '', inv.notes || '', inv.terms || '']
          });
          if (inv.items) {
            inv.items.forEach((item: any) => {
              setCommands.push({
                statement: 'INSERT INTO invoice_items (invoice_id, name, quantity, price, total) VALUES (?, ?, ?, ?, ?)',
                values: [inv.id, item.name, item.quantity, item.price, item.total]
              });
            });
          }
        });
      }

      await sqliteDB.executeSet(setCommands);

      if (settings) {
        await api.updateSettings(settings);
      }

      toast.success('تمت استعادة كافة البيانات والفواتير بنجاح!', { id: toastId });
      setTimeout(() => { window.location.reload(); }, 2000);

    } catch (error) {
      console.error('❌ فشل الاستعادة الشاملة:', error);
      toast.error('فشل في استعادة البيانات', { id: toastId });
    }
  }
};
