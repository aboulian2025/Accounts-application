import { Customer, Transaction, Stats, AppSettings } from '../types';

const handleResponse = async (res: Response) => {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Error ${res.status}: ${res.statusText}`);
  }
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return res.json();
  }
  return res.text();
};

export const api = {
  async getStats(): Promise<Stats> {
    const res = await fetch('/api/stats');
    return handleResponse(res);
  },
  async getCustomers(): Promise<Customer[]> {
    const res = await fetch('/api/customers');
    return handleResponse(res);
  },
  async addCustomer(customer: Partial<Customer>): Promise<{ id: number }> {
    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customer),
    });
    return handleResponse(res);
  },
  async updateCustomer(id: number, customer: Partial<Customer>): Promise<void> {
    const res = await fetch(`/api/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customer),
    });
    return handleResponse(res);
  },
  async deleteCustomer(id: number): Promise<void> {
    const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
    return handleResponse(res);
  },
  async getTransactions(customerId: number): Promise<Transaction[]> {
    const res = await fetch(`/api/transactions/${customerId}`);
    return handleResponse(res);
  },
  async addTransaction(transaction: Partial<Transaction>): Promise<{ id: number }> {
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transaction),
    });
    return handleResponse(res);
  },
  async deleteTransaction(id: number): Promise<void> {
    const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
    return handleResponse(res);
  },
  async updateTransaction(id: number, transaction: Partial<Transaction>): Promise<void> {
    const res = await fetch(`/api/transactions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transaction),
    });
    return handleResponse(res);
  },
  async getSettings(): Promise<AppSettings> {
    const res = await fetch('/api/settings');
    return handleResponse(res);
  },
  async updateSettings(settings: Partial<AppSettings>): Promise<void> {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings }),
    });
    return handleResponse(res);
  },
};
