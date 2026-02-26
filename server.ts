import express from "express";
import { createServer as createViteServer } from "vite";
import db from "./src/lib/db.ts";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // API Routes
  
  // Customers
  app.get("/api/customers", (req, res) => {
    const customers = db.prepare(`
      SELECT c.*, 
      COALESCE(SUM(CASE WHEN t.type = 'debit' THEN t.amount ELSE -t.amount END), 0) as balance
      FROM customers c
      LEFT JOIN transactions t ON c.id = t.customer_id
      GROUP BY c.id
      ORDER BY c.name ASC
    `).all();
    res.json(customers);
  });

  app.post("/api/customers", (req, res) => {
    const { name, phone, notes } = req.body;
    const result = db.prepare('INSERT INTO customers (name, phone, notes) VALUES (?, ?, ?)').run(name, phone, notes);
    res.json({ id: result.lastInsertRowid });
  });

  app.put("/api/customers/:id", (req, res) => {
    const { name, phone, notes } = req.body;
    db.prepare('UPDATE customers SET name = ?, phone = ?, notes = ? WHERE id = ?').run(name, phone, notes, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/customers/:id", (req, res) => {
    db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // Transactions
  app.get("/api/transactions/:customerId", (req, res) => {
    const transactions = db.prepare('SELECT * FROM transactions WHERE customer_id = ? ORDER BY id ASC').all(req.params.customerId);
    res.json(transactions);
  });

  app.post("/api/transactions", (req, res) => {
    const { customer_id, type, amount, note, date, due_date } = req.body;
    const result = db.prepare('INSERT INTO transactions (customer_id, type, amount, note, date, due_date) VALUES (?, ?, ?, ?, ?, ?)').run(
      customer_id, type, amount, note, date || new Date().toISOString(), due_date
    );
    res.json({ id: result.lastInsertRowid });
  });

  app.delete("/api/transactions/:id", (req, res) => {
    db.prepare('DELETE FROM transactions WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  app.put("/api/transactions/:id", (req, res) => {
    const { type, amount, note, date, due_date } = req.body;
    db.prepare('UPDATE transactions SET type = ?, amount = ?, note = ?, date = ?, due_date = ? WHERE id = ?').run(
      type, amount, note, date, due_date, req.params.id
    );
    res.json({ success: true });
  });

  // Dashboard Stats
  app.get("/api/stats", (req, res) => {
    const stats = db.prepare(`
      SELECT 
        SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END) as total_debit,
        SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) as total_credit,
        (SELECT COUNT(*) FROM customers) as customer_count,
        (SELECT COUNT(*) FROM transactions WHERE due_date IS NOT NULL AND due_date < date('now') AND type = 'debit') as overdue_count
      FROM transactions
    `).get();
    res.json(stats || { total_debit: 0, total_credit: 0, customer_count: 0, overdue_count: 0 });
  });

  // Settings
  app.get("/api/settings", (req, res) => {
    const settings = db.prepare('SELECT * FROM settings').all();
    const settingsObj = settings.reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    res.json(settingsObj);
  });

  app.post("/api/settings", (req, res) => {
    const { settings } = req.body;
    const update = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    const transaction = db.transaction((items) => {
      for (const [key, value] of Object.entries(items)) {
        update.run(key, value);
      }
    });
    transaction(settings);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
