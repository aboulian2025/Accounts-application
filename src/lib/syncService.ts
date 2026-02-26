import { db, auth } from './firebase';
import { collection, doc, setDoc, getDocs, query, where } from 'firebase/firestore';
import { api } from './api';
import { toast } from 'react-hot-toast';

// Simple XOR encryption for demo purposes (In production use a real library like crypto-js)
const encrypt = (text: string, key: string) => {
  return btoa(text.split('').map((char, i) => 
    String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(i % key.length))
  ).join(''));
};

const decrypt = (encoded: string, key: string) => {
  const text = atob(encoded);
  return text.split('').map((char, i) => 
    String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(i % key.length))
  ).join('');
};

export const syncService = {
  async syncToCloud() {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const customers = await api.getCustomers();
      const settings = await api.getSettings();
      
      // We'll sync all customers and their transactions
      // For each customer, we'll get their transactions
      const fullData = await Promise.all(customers.map(async (c) => {
        const txs = await api.getTransactions(c.id);
        return { ...c, transactions: txs };
      }));

      const dataToSync = {
        userId: user.uid,
        updatedAt: new Date().toISOString(),
        data: encrypt(JSON.stringify({ customers: fullData, settings }), user.uid)
      };

      await setDoc(doc(db, 'backups', user.uid), dataToSync);
      
      await api.updateSettings({ last_sync: new Date().toLocaleString('ar-EG') });
      toast.success('تمت المزامنة بنجاح');
    } catch (error) {
      console.error('Sync failed', error);
      toast.error('فشلت المزامنة');
    }
  },

  async restoreFromCloud() {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const docSnap = await getDocs(query(collection(db, 'backups'), where('userId', '==', user.uid)));
      if (docSnap.empty) {
        toast.error('لا يوجد نسخة احتياطية سحابية');
        return;
      }

      const backup = docSnap.docs[0].data();
      const decryptedData = JSON.parse(decrypt(backup.data, user.uid));
      
      // In a real app, we'd merge or overwrite local SQLite
      // For this demo, we'll just log it
      console.log('Restored data:', decryptedData);
      toast.success('تمت استعادة البيانات بنجاح (راجع السجل)');
    } catch (error) {
      console.error('Restore failed', error);
      toast.error('فشلت استعادة البيانات');
    }
  }
};
