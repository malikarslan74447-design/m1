const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let db;

async function initDB() {
    try {
        db = await open({
            filename: path.join(__dirname, 'database.sqlite'),
            driver: sqlite3.Database
        });

        await db.exec(`
            CREATE TABLE IF NOT EXISTS items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                type TEXT NOT NULL,
                version TEXT NOT NULL,
                modInfo TEXT,
                iconUrl TEXT NOT NULL,
                downloadUrl TEXT NOT NULL,
                description TEXT
            )
        `);
        console.log("Local SQLite Database Ready!");
    } catch (err) {
        console.error("DB Init Error:", err);
    }
}
initDB();

// Fetch All Items / Search
app.get('/api/items', async (req, res) => {
    try {
        const { type, search } = req.query;
        let query = 'SELECT * FROM items';
        let params = [];

        if (type && search) {
            query += ' WHERE type = ? AND LOWER(title) LIKE ?';
            params = [type, `%${search.toLowerCase()}%`];
        } else if (type) {
            query += ' WHERE type = ?';
            params = [type];
        } else if (search) {
            query += ' WHERE LOWER(title) LIKE ?';
            params = [`%${search.toLowerCase()}%`];
        }

        query += ' ORDER BY id DESC';
        const items = await db.all(query, params);
        res.json({ data: items });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add Item
app.post('/api/admin/items', async (req, res) => {
    try {
        const { title, type, version, modInfo, iconUrl, downloadUrl, description } = req.body;
        await db.run(
            `INSERT INTO items (title, type, version, modInfo, iconUrl, downloadUrl, description) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [title, type, version, modInfo || '', iconUrl, downloadUrl, description || '']
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete Item
app.delete('/api/admin/items/:id', async (req, res) => {
    try {
        await db.run(`DELETE FROM items WHERE id = ?`, [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
