import { getDB } from './db';
import { Customer, Transaction, Stats, AppSettings, Invoice, InvoiceItem } from '../types';

export const api = {

  async getStats(): Promise<Stats> {
    const db = getDB();
    const result = await db.query(`
      SELECT
        SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END) as total_debit,
        SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) as total_credit,
        (SELECT COUNT(*) FROM customers) as customer_count,
        (SELECT COUNT(*) FROM transactions WHERE due_date IS NOT NULL AND due_date < date('now') AND type = 'debit') as overdue_count
      FROM transactions
    `);
    const stats = result.values?.[0];
    return {
      total_debit: stats?.total_debit || 0,
      total_credit: stats?.total_credit || 0,
      customer_count: stats?.customer_count || 0,
      overdue_count: stats?.overdue_count || 0
    };
  },

  async getCustomers(): Promise<Customer[]> {
    const db = getDB();
    const result = await db.query(`
      SELECT c.*, COALESCE(SUM(CASE WHEN t.type = 'debit' THEN t.amount ELSE -t.amount END), 0) as balance
      FROM customers c LEFT JOIN transactions t ON c.id = t.customer_id
      GROUP BY c.id ORDER BY c.name ASC
    `);
    return result.values || [];
  },

  async addCustomer(customer: Partial<Customer>) {
    const db = getDB();
    const result = await db.run(`INSERT INTO customers (name, phone, notes, currency) VALUES (?, ?, ?, ?)`, [customer.name, customer.phone || '', customer.notes || '', customer.currency || '']);
    return { id: result.changes?.lastId };
  },

  async updateCustomer(id: number, customer: Partial<Customer>) {
    const db = getDB();
    await db.run(`UPDATE customers SET name = ?, phone = ?, notes = ? WHERE id = ?`, [customer.name, customer.phone || '', customer.notes || '', id]);
  },

  async deleteCustomer(id: number) {
    const db = getDB();
    await db.run(`DELETE FROM transactions WHERE customer_id = ?`, [id]);
    await db.run(`DELETE FROM customers WHERE id = ?`, [id]);
  },

  async getTransactions(customerId: number): Promise<Transaction[]> {
    const db = getDB();
    const result = await db.query(`SELECT * FROM transactions WHERE customer_id = ? ORDER BY date ASC`, [customerId]);
    return result.values || [];
  },

  async addTransaction(transaction: Partial<Transaction>) {
    const db = getDB();
    const result = await db.run(`INSERT INTO transactions (customer_id, type, amount, note, date, due_date) VALUES (?, ?, ?, ?, ?, ?)`, [transaction.customer_id, transaction.type, transaction.amount, transaction.note || '', transaction.date || new Date().toISOString(), transaction.due_date || null]);
    return { id: result.changes?.lastId };
  },

  async deleteTransaction(id: number) {
    const db = getDB();
    await db.run(`DELETE FROM transactions WHERE id = ?`, [id]);
  },

  // --- دوال الفواتير المحسنة ---
  async addInvoice(invoice: Partial<Invoice>, items: InvoiceItem[]) {
    const db = getDB();
    const result = await db.run(
      `INSERT INTO invoices (customer_name, date, total_amount, paid_amount, remaining_amount, currency, notes, terms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invoice.customer_name,
        invoice.date,
        invoice.total_amount,
        invoice.paid_amount || 0,
        invoice.remaining_amount || 0,
        invoice.currency || '',
        invoice.notes || '',
        invoice.terms || ''
      ]
    );
    const invoiceId = result.changes?.lastId;
    if (invoiceId && items && items.length > 0) {
      for (const item of items) {
        await db.run(
          `INSERT INTO invoice_items (invoice_id, name, quantity, price, total) VALUES (?, ?, ?, ?, ?)`,
          [invoiceId, item.name, item.quantity, item.price, item.total]
        );
      }
    }
    return { id: invoiceId };
  },

  // ✅ ميزة تحديث الفاتورة الحالية
  async updateInvoice(id: number, invoice: Partial<Invoice>, items: InvoiceItem[]) {
    const db = getDB();

    // 1. تحديث بيانات الفاتورة الرئيسية
    await db.run(
      `UPDATE invoices SET
        customer_name = ?, date = ?, total_amount = ?, paid_amount = ?,
        remaining_amount = ?, currency = ?, notes = ?, terms = ?
       WHERE id = ?`,
      [
        invoice.customer_name, invoice.date, invoice.total_amount, invoice.paid_amount || 0,
        invoice.remaining_amount || 0, invoice.currency || '', invoice.notes || '', invoice.terms || '',
        id
      ]
    );

    // 2. تحديث الأصناف (حذف القديم وإضافة الجديد لضمان الدقة)
    await db.run(`DELETE FROM invoice_items WHERE invoice_id = ?`, [id]);
    if (items && items.length > 0) {
      for (const item of items) {
        await db.run(
          `INSERT INTO invoice_items (invoice_id, name, quantity, price, total) VALUES (?, ?, ?, ?, ?)`,
          [id, item.name, item.quantity, item.price, item.total]
        );
      }
    }
  },

  async getInvoices(): Promise<Invoice[]> {
    const db = getDB();
    const result = await db.query(`SELECT * FROM invoices ORDER BY id DESC`);
    return result.values || [];
  },

  async getInvoiceDetails(id: number): Promise<Invoice | null> {
    const db = getDB();
    const res = await db.query(`SELECT * FROM invoices WHERE id = ?`, [id]);
    if (!res.values || res.values.length === 0) return null;
    const invoice = res.values[0];
    const itemsRes = await db.query(`SELECT * FROM invoice_items WHERE invoice_id = ?`, [id]);
    invoice.items = itemsRes.values || [];
    return invoice;
  },

  async deleteInvoice(id: number) {
    const db = getDB();
    await db.run(`DELETE FROM invoice_items WHERE invoice_id = ?`, [id]);
    await db.run(`DELETE FROM invoices WHERE id = ?`, [id]);
  },

  async getSettings(): Promise<AppSettings> {
    const db = getDB();
    const result = await db.query(`SELECT * FROM settings`);
    const settings: any = {};
    result.values?.forEach((row: any) => { settings[row.key] = row.value; });
    return settings;
  },

  async updateSettings(settings: Partial<AppSettings>) {
    const db = getDB();
    for (const [key, value] of Object.entries(settings)) {
      await db.run(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`, [key, value as string]);
    }
  },
};
