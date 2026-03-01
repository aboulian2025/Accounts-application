export interface Customer {
  id: number;
  name: string;
  phone?: string;
  notes?: string;
  created_at: string;
  balance: number;
}

export interface Transaction {
  id: number;
  customer_id: number;
  type: 'debit' | 'credit';
  amount: number;
  note?: string;
  date: string;
  due_date?: string;
}

export interface Stats {
  total_debit: number;
  total_credit: number;
  customer_count: number;
  overdue_count: number;
}

export interface InvoiceItem {
  id?: number;
  invoice_id?: number;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Invoice {
  id: number;
  customer_name: string;
  date: string;
  total_amount: number;
  notes?: string;
  terms?: string;
  created_at: string;
  items?: InvoiceItem[];
}

export interface AppSettings {
  business_name: string;
  business_name_en: string;
  business_address: string;
  business_address_en: string;
  business_location: string;
  business_logo: string;
  currency: string;
  my_phone: string;
  reminder_template: string;
  cloud_sync_enabled: string;
  last_sync: string;
}
