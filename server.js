const express = require("express");
const sqlite3 = require("sqlite3").verbose();

const app = express();

app.use(express.json());
app.use(express.static("public"));

const db = new sqlite3.Database("./money.db", (err) => {
    if (err) {
        console.log(err.message);
    } else {
        console.log("SQLite connected");
    }
});

// INIT
db.serialize(() => {

    db.run(`CREATE TABLE IF NOT EXISTS wallet(
        id INTEGER PRIMARY KEY,
        total INTEGER
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS salary(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        money INTEGER
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS expense(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT,
        amount INTEGER,
        note TEXT
    )`);

    db.get("SELECT * FROM wallet WHERE id=1", (e, r) => {
        if (!r) {
            db.run("INSERT INTO wallet(id,total) VALUES(1,0)");
        }
    });

});

// GET DATA
app.get("/data", (req, res) => {

    db.get("SELECT total FROM wallet WHERE id=1", (e, w) => {

        db.all("SELECT * FROM salary ORDER BY id DESC", (e, s) => {

            db.all("SELECT * FROM expense ORDER BY id DESC", (e, x) => {

                res.send({
                    total: w.total,
                    salary: s,
                    expense: x
                });

            });

        });

    });

});

// WALLET EDIT
app.put("/wallet", (req, res) => {

    const total = Number(req.body.total);

    db.run("UPDATE wallet SET total=? WHERE id=1", [total], () => {

        res.send({ success: true });

    });

});

// SALARY ADD
app.post("/salary", (req, res) => {

    const money = Number(req.body.money);

    db.run("INSERT INTO salary(money) VALUES(?)", [money]);

    db.run("UPDATE wallet SET total=total+? WHERE id=1", [money]);

    res.send({ success: true });

});

// SALARY EDIT
app.put("/salary/:id", (req, res) => {

    const id = req.params.id;
    const money = Number(req.body.money);

    db.get("SELECT * FROM salary WHERE id=?", [id], (e, row) => {

        const diff = money - row.money;

        db.run("UPDATE wallet SET total=total+? WHERE id=1", [diff]);

        db.run("UPDATE salary SET money=? WHERE id=?", [money, id]);

        res.send({ success: true });

    });

});

// SALARY DELETE
app.delete("/salary/:id", (req, res) => {

    const id = req.params.id;

    db.get("SELECT * FROM salary WHERE id=?", [id], (e, row) => {

        db.run("UPDATE wallet SET total=total-? WHERE id=1", [row.money]);

        db.run("DELETE FROM salary WHERE id=?", [id]);

        res.send({ success: true });

    });

});

// EXPENSE ADD
app.post("/expense", (req, res) => {

    const { category, amount, note } = req.body;

    db.get("SELECT total FROM wallet WHERE id=1", (e, w) => {

        if (w.total < amount) {
            return res.send({
                success: false,
                message: "không đủ tiền"
            });
        }

        db.run(
            "INSERT INTO expense(category,amount,note) VALUES(?,?,?)",
            [category, amount, note]
        );

        db.run(
            "UPDATE wallet SET total=total-? WHERE id=1",
            [amount]
        );

        res.send({ success: true });

    });

});

// EXPENSE EDIT
app.put("/expense/:id", (req, res) => {

    const id = req.params.id;
    const { category, amount, note } = req.body;

    db.get("SELECT * FROM expense WHERE id=?", [id], (e, row) => {

        const diff = Number(amount) - row.amount;

        db.run("UPDATE wallet SET total=total-? WHERE id=1", [diff]);

        db.run(
            "UPDATE expense SET category=?,amount=?,note=? WHERE id=?",
            [category, amount, note, id]
        );

        res.send({ success: true });

    });

});

// EXPENSE DELETE
app.delete("/expense/:id", (req, res) => {

    const id = req.params.id;

    db.get("SELECT * FROM expense WHERE id=?", [id], (e, row) => {

        db.run("UPDATE wallet SET total=total+? WHERE id=1", [row.amount]);

        db.run("DELETE FROM expense WHERE id=?", [id]);

        res.send({ success: true });

    });

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});