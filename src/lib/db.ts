import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(process.cwd(), 'data.db');
const db = new Database(dbPath);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('debit', 'credit')),
    amount REAL NOT NULL,
    note TEXT,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    due_date DATETIME,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Default settings
const defaultSettings = [
  ['business_name', 'دفتر الذمم الشخصي'],
  ['business_name_en', 'Personal Ledger'],
  ['business_address', ''],
  ['business_address_en', ''],
  ['business_location', ''],
  ['business_logo', ''],
  ['currency', 'د.أ'],
  ['my_phone', ''],
  ['reminder_template', 'السلام عليكم، نود تذكيركم بأن الرصيد المستحق عليكم هو {amount} {currency}. يرجى السداد في أقرب وقت ممكن. شاكرين تعاونكم.'],
  ['cloud_sync_enabled', 'false'],
  ['last_sync', '']
];

const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
for (const [key, value] of defaultSettings) {
  insertSetting.run(key, value);
}

export default db;
