import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';

let db: any;
const sqlite = new SQLiteConnection(CapacitorSQLite);

export const initDB = async () => {
  try {
    const platform = Capacitor.getPlatform();

    if (platform === 'web') {
      const initSqlJs = (window as any).initSqlJs;
      if (!initSqlJs) throw new Error("SQL.js not loaded");

      const SQL = await initSqlJs({
        locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
      });

      const savedData = localStorage.getItem('ledger_db');
      if (savedData) {
        db = new SQL.Database(new Uint8Array(JSON.parse(savedData)));
      } else {
        db = new SQL.Database();
      }

      const saveWebDB = () => {
        localStorage.setItem('ledger_db', JSON.stringify(Array.from(db.export())));
      };

      db.execute = async (sql: string) => { db.run(sql); saveWebDB(); return { changes: { changes: 1 } }; };
      db.run = async (sql: string, params?: any[]) => {
        db.run(sql, params);
        saveWebDB();
        const res = db.exec("SELECT last_insert_rowid()");
        return { changes: { lastId: res[0].values[0][0] } };
      };
      db.query = async (sql: string, params?: any[]) => {
        const res = db.exec(sql, params);
        if (res.length === 0) return { values: [] };
        const cols = res[0].columns;
        return { values: res[0].values.map((row: any) => Object.fromEntries(cols.map((c, i) => [c, row[i]]))) };
      };
      db.executeSet = async (set: any[]) => {
        for (const s of set) db.run(s.statement, s.values);
        saveWebDB();
      };

    } else {
      await sqlite.checkConnectionsConsistency();
      const isConn = await sqlite.isConnection("ledger_db", false);
      db = isConn.result ? await sqlite.retrieveConnection("ledger_db", false) : await sqlite.createConnection("ledger_db", false, "no-encryption", 1, false);
      await db.open();
    }

    // تحديث الجداول لتشمل حقول المدفوع والمتبقي والعملة
    await db.execute(`
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        notes TEXT,
        currency TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER NOT NULL, type TEXT NOT NULL, amount REAL NOT NULL, note TEXT, date TEXT DEFAULT CURRENT_TIMESTAMP, due_date TEXT);
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);

      CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_name TEXT NOT NULL,
        date TEXT NOT NULL,
        total_amount REAL NOT NULL,
        paid_amount REAL DEFAULT 0,
        remaining_amount REAL DEFAULT 0,
        currency TEXT,
        notes TEXT,
        terms TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS invoice_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        quantity REAL NOT NULL,
        price REAL NOT NULL,
        total REAL NOT NULL,
        FOREIGN KEY (invoice_id) REFERENCES invoices (id) ON DELETE CASCADE
      );
    `);

    // تحديث الأعمدة في حالة وجود قاعدة بيانات قديمة
    try { await db.execute(`ALTER TABLE customers ADD COLUMN currency TEXT`); } catch (e) {}
    try { await db.execute(`ALTER TABLE invoices ADD COLUMN currency TEXT`); } catch (e) {}
    try { await db.execute(`ALTER TABLE invoices ADD COLUMN paid_amount REAL DEFAULT 0`); } catch (e) {}
    try { await db.execute(`ALTER TABLE invoices ADD COLUMN remaining_amount REAL DEFAULT 0`); } catch (e) {}

  } catch (err) {
    console.error("DB Init Error", err);
    throw err;
  }
};

export const getDB = () => { if (!db) throw new Error("DB not init"); return db; };
