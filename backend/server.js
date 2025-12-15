/*// server.js - JWT-enabled, uses user_id for history entries
const express = require("express");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const pool = require("./db"); // your mysql2/promise pool instance
const jwt = require("jsonwebtoken");

const http = require("http");
const { Server } = require("socket.io");

const JWT_SECRET = process.env.JWT_SECRET || "replace_this_with_a_strong_secret";
const TOKEN_EXPIRY = "8h";

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

// ---------------- helpers ----------------
function safeJSON(val, fallback) {
  try {
    if (val === undefined || val === null) return fallback;
    return typeof val === "string" ? JSON.parse(val) : val;
  } catch {
    return fallback;
  }
}

function sanitizeUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    subscriptions: safeJSON(row.subscriptions, []),
    holdings: safeJSON(row.holdings, {}),
    total_pl: Number(row.total_pl || 0),
    created_at: row.created_at,
  };
}

// ---------------- socket ----------------
io.on("connection", (socket) => {
  console.log("✅ Client connected:", socket.id);
  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});

// ---------------- auth middleware ----------------
function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ ok: false, error: "Missing auth token" });

    const payload = jwt.verify(token, JWT_SECRET);
    // Expect payload to have: { id, email, name }
    req.user = { id: payload.id, email: payload.email, name: payload.name };
    next();
  } catch (err) {
    return res.status(401).json({ ok: false, error: "Invalid or expired token" });
  }
}

// ---------------- auth routes ----------------
app.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ ok: false, error: "name,email,password required" });

    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      "INSERT INTO users (name,email,password_hash,subscriptions,holdings) VALUES (?,?,?,'[]','{}')",
      [name, email, hash]
    );

    const [rows] = await pool.query("SELECT * FROM users WHERE email=?", [email]);
    const user = sanitizeUser(rows[0]);

    // issue token
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
    return res.json({ ok: true, user, token });
  } catch (err) {
    console.error("SIGNUP ERROR:", err);
    if (err && err.code === "ER_DUP_ENTRY") return res.status(400).json({ ok: false, error: "Email already exists" });
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ ok: false, error: "email,password required" });

    const [rows] = await pool.query("SELECT * FROM users WHERE email=?", [email]);
    const row = rows[0];
    if (!row) return res.status(401).json({ ok: false, error: "Invalid credentials" });

    const match = await bcrypt.compare(password, row.password_hash || "");
    if (!match) return res.status(401).json({ ok: false, error: "Invalid credentials" });

    const user = sanitizeUser(row);
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });

    return res.json({ ok: true, user, token });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

// quick endpoint to verify token and return user (frontend can call this on app start)
app.get("/me", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await pool.query("SELECT * FROM users WHERE id=?", [userId]);
    if (!rows || rows.length === 0) return res.status(404).json({ ok: false, error: "User not found" });
    return res.json({ ok: true, user: sanitizeUser(rows[0]) });
  } catch (err) {
    console.error("GET /me ERROR:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

// ---------------- subscribe ----------------
app.post("/subscribe", authMiddleware, async (req, res) => {
  try {
    const ticker = req.body.ticker;
    if (!ticker) return res.status(400).json({ ok: false, error: "ticker required" });

    const email = req.user.email;
    const [rows] = await pool.query("SELECT subscriptions, holdings FROM users WHERE email=?", [email]);
    const userRow = rows[0];
    if (!userRow) return res.status(404).json({ ok: false, error: "User not found" });

    const subs = safeJSON(userRow.subscriptions, []);
    const holdings = safeJSON(userRow.holdings, {});

    if (!subs.includes(ticker)) subs.push(ticker);

    if (!holdings[ticker]) {
      const [stkRows] = await pool.query("SELECT current_price FROM stocks WHERE ticker=?", [ticker]);
      if (!stkRows || stkRows.length === 0) return res.status(400).json({ ok: false, error: "Ticker not supported" });
      holdings[ticker] = { qty: 1, avg_buy: Number(stkRows[0].current_price) };
    }

    await pool.query("UPDATE users SET subscriptions=?, holdings=? WHERE email=?", [JSON.stringify(subs), JSON.stringify(holdings), email]);

    const [updatedRows] = await pool.query("SELECT * FROM users WHERE email=?", [email]);
    const updatedUser = sanitizeUser(updatedRows[0]);
    io.emit("user_update", updatedUser);
    return res.json({ ok: true, user: updatedUser });
  } catch (err) {
    console.error("SUBSCRIBE ERROR:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

app.post("/unsubscribe", authMiddleware, async (req, res) => {
  try {
    const { ticker } = req.body;
    if (!ticker) return res.status(400).json({ ok: false, error: "ticker required" });

    const email = req.user.email;
    const [rows] = await pool.query("SELECT subscriptions, holdings FROM users WHERE email=?", [email]);
    const userRow = rows[0];
    if (!userRow) return res.status(404).json({ ok: false, error: "User not found" });

    const subs = safeJSON(userRow.subscriptions, []);
    const holdings = safeJSON(userRow.holdings, {});

    const newSubs = subs.filter(t => t !== ticker);
    if (holdings.hasOwnProperty(ticker)) delete holdings[ticker];

    await pool.query("UPDATE users SET subscriptions=?, holdings=? WHERE email=?", [JSON.stringify(newSubs), JSON.stringify(holdings), email]);

    const [updatedRows] = await pool.query("SELECT * FROM users WHERE email=?", [email]);
    const updatedUser = sanitizeUser(updatedRows[0]);
    io.emit("user_update", updatedUser);
    return res.json({ ok: true, user: updatedUser });
  } catch (err) {
    console.error("UNSUBSCRIBE ERROR:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

// ---------------- holdings replace (optional) ----------------
app.post("/holdings", authMiddleware, async (req, res) => {
  try {
    const { holdings } = req.body;
    if (typeof holdings !== "object") return res.status(400).json({ ok: false, error: "holdings required" });

    const email = req.user.email;
    const [rows] = await pool.query("SELECT id FROM users WHERE email=?", [email]);
    if (!rows || rows.length === 0) return res.status(404).json({ ok: false, error: "User not found" });

    await pool.query("UPDATE users SET holdings=? WHERE email=?", [JSON.stringify(holdings), email]);

    const [updatedRows] = await pool.query("SELECT * FROM users WHERE email=?", [email]);
    const updatedUser = sanitizeUser(updatedRows[0]);
    io.emit("user_update", updatedUser);
    return res.json({ ok: true, user: updatedUser });
  } catch (err) {
    console.error("HOLDINGS ERROR:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

app.post("/buy", authMiddleware, async (req, res) => {
  try {
    const { ticker, qty = 1 } = req.body;
    if (!ticker) return res.status(400).json({ ok: false, error: "ticker required" });

    const email = req.user.email;
    const userId = req.user.id;

    const [userRows] = await pool.query("SELECT holdings FROM users WHERE email=?", [email]);
    const userRow = userRows[0];
    if (!userRow) return res.status(404).json({ ok: false, error: "User not found" });

    let holdings = safeJSON(userRow.holdings, {});

    const [stkRows] = await pool.query("SELECT current_price FROM stocks WHERE ticker=?", [ticker]);
    if (!stkRows || stkRows.length === 0) return res.status(400).json({ ok: false, error: "Ticker not supported" });
    const buyPrice = Number(stkRows[0].current_price);

    // MULTI BUY LOGIC
    if (holdings[ticker]) {
      const oldQty = holdings[ticker].qty;
      const oldAvg = holdings[ticker].avg_buy;
      const newQty = oldQty + qty;
      const newAvg = ((oldQty * oldAvg) + (qty * buyPrice)) / newQty;
      holdings[ticker] = {
        qty: newQty,
        avg_buy: Number(newAvg.toFixed(2))
      };
    } else {
      holdings[ticker] = {
        qty: qty,
        avg_buy: buyPrice
      };

      // STORE BUY HISTORY (first buy or new cycle)
      await pool.query(
        "INSERT INTO history (user_id,email,ticker,action,qty,buy_price,created_at) VALUES (?,?,?,?,?,?,NOW())",
        [userId, email, ticker, "BUY", qty, buyPrice]
      );
    }

    await pool.query("UPDATE users SET holdings=? WHERE email=?", [JSON.stringify(holdings), email]);

    const [updatedRows] = await pool.query("SELECT * FROM users WHERE email=?", [email]);
    io.emit("user_update", sanitizeUser(updatedRows[0]));
    res.json({ ok: true, user: sanitizeUser(updatedRows[0]) });

  } catch (err) {
    console.error("BUY ERROR:", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

app.post("/sell", authMiddleware, async (req, res) => {
  try {
    const { ticker } = req.body;
    if (!ticker) return res.status(400).json({ ok: false, error: "ticker required" });

    const email = req.user.email;
    const userId = req.user.id;

    const [userRows] = await pool.query("SELECT holdings FROM users WHERE email=?", [email]);
    const userRow = userRows[0];
    if (!userRow) return res.status(404).json({ ok: false, error: "User not found" });

    let holdings = safeJSON(userRow.holdings, {});
    if (!holdings[ticker]) return res.status(400).json({ ok: false, error: "Stock not held" });

    const qty = Number(holdings[ticker].qty);
    const avgBuy = Number(holdings[ticker].avg_buy);

    const [stkRows] = await pool.query("SELECT current_price FROM stocks WHERE ticker=?", [ticker]);
    if (!stkRows || stkRows.length === 0) return res.status(400).json({ ok: false, error: "Ticker not supported" });

    const sellPrice = Number(stkRows[0].current_price);
    const pl = Number(((sellPrice - avgBuy) * qty).toFixed(2));

    // STORE SELL HISTORY with user_id
    await pool.query(
      "INSERT INTO history (user_id,email,ticker,action,qty,buy_price,sell_price,pl,created_at) VALUES (?,?,?,?,?,?,?,?,NOW())",
      [userId, email, ticker, "SELL", qty, avgBuy, sellPrice, pl]
    );

    // remove holding
    delete holdings[ticker];
    await pool.query("UPDATE users SET holdings=? WHERE email=?", [JSON.stringify(holdings), email]);

    const [updatedRows] = await pool.query("SELECT * FROM users WHERE email=?", [email]);
    io.emit("user_update", sanitizeUser(updatedRows[0]));
    res.json({ ok: true, user: sanitizeUser(updatedRows[0]) });

  } catch (err) {
    console.error("SELL ERROR:", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

// ---------------- history (protected) ----------------
app.get("/history", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    // RETURN rows only for this user_id
    const [rows] = await pool.query("SELECT * FROM history WHERE user_id = ? ORDER BY id DESC", [userId]);

    return res.json({ ok: true, history: rows });
  } catch (err) {
    console.error("HISTORY ERROR:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

// ---------------- realtime engine ----------------
// (kept mostly same; emits user_update for every user as before)
setInterval(async () => {
  try {
    console.log("⏱️ Updating stock prices...");
    const [stocks] = await pool.query("SELECT * FROM stocks");

    for (const s of stocks) {
      const change = Math.random() * 20 - 10;
      const newPrice = Math.max(10, Number(s.current_price) + change);
      await pool.query("UPDATE stocks SET current_price=?, last_updated=NOW() WHERE ticker=?", [newPrice.toFixed(2), s.ticker]);
    }

    // recompute PL for all users
    const [users] = await pool.query("SELECT * FROM users");
    for (const u of users) {
      const holdings = safeJSON(u.holdings, {});
      let totalPL = 0;
      for (const t of Object.keys(holdings)) {
        const [stkRows] = await pool.query("SELECT current_price FROM stocks WHERE ticker=?", [t]);
        if (!stkRows || stkRows.length === 0) continue;
        const cp = Number(stkRows[0].current_price);
        totalPL += (cp - Number(holdings[t].avg_buy)) * Number(holdings[t].qty);
      }
      await pool.query("UPDATE users SET total_pl=? WHERE email=?", [totalPL.toFixed(2), u.email]);

      const [updatedRows] = await pool.query("SELECT * FROM users WHERE email=?", [u.email]);
      io.emit("user_update", sanitizeUser(updatedRows[0]));
    }

    const [latestStocks] = await pool.query("SELECT * FROM stocks");
    io.emit("price_update", latestStocks);
  } catch (err) {
    console.error("REALTIME ENGINE ERROR:", err);
  }
}, 1000);

// ---------------- server ----------------
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`✅ Backend running WITH SOCKET.IO at http://localhost:${PORT}`);
});
*/


















const express = require("express");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const http = require("http");
const { Server } = require("socket.io");
const pool = require("./db"); // pg Pool

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "replace_with_strong_secret";
const TOKEN_EXPIRY = "8h";

/* ---------------- helpers ---------------- */

function safeJSON(val, fallback) {
  try {
    if (!val) return fallback;
    return typeof val === "string" ? JSON.parse(val) : val;
  } catch {
    return fallback;
  }
}

function sanitizeUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    subscriptions: safeJSON(row.subscriptions, []),
    holdings: safeJSON(row.holdings, {}),
    total_pl: Number(row.total_pl || 0),
    created_at: row.created_at,
  };
}

/* ---------------- socket ---------------- */

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
  socket.on("disconnect", () => console.log("Client disconnected:", socket.id));
});

/* ---------------- auth middleware ---------------- */

function authMiddleware(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ ok: false, error: "Missing token" });

    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ ok: false, error: "Invalid token" });
  }
}

/* ---------------- auth routes ---------------- */

app.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ ok: false });

    const hash = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users (name,email,password_hash,subscriptions,holdings)
       VALUES ($1,$2,$3,$4,$5)`,
      [name, email, hash, JSON.stringify([]), JSON.stringify({})]
    );

    const { rows } = await pool.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );

    const user = sanitizeUser(rows[0]);
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    res.json({ ok: true, user, token });
  } catch (err) {
    console.error("SIGNUP ERROR:", err);
    res.status(500).json({ ok: false });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const { rows } = await pool.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );

    if (!rows.length) return res.status(401).json({ ok: false });

    const match = await bcrypt.compare(password, rows[0].password_hash);
    if (!match) return res.status(401).json({ ok: false });

    const user = sanitizeUser(rows[0]);
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    res.json({ ok: true, user, token });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ ok: false });
  }
});

app.get("/me", authMiddleware, async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM users WHERE id=$1",
    [req.user.id]
  );
  if (!rows.length) return res.status(404).json({ ok: false });
  res.json({ ok: true, user: sanitizeUser(rows[0]) });
});

/* ---------------- stocks ---------------- */

app.get("/stocks", async (_, res) => {
  const { rows } = await pool.query("SELECT * FROM stocks");
  res.json({ ok: true, stocks: rows });
});

/* ---------------- trading ---------------- */

app.post("/buy", authMiddleware, async (req, res) => {
  const { ticker, qty = 1 } = req.body;
  const { id, email } = req.user;

  const userRes = await pool.query(
    "SELECT holdings FROM users WHERE id=$1",
    [id]
  );

  let holdings = safeJSON(userRes.rows[0].holdings, {});

  const stockRes = await pool.query(
    "SELECT current_price FROM stocks WHERE ticker=$1",
    [ticker]
  );

  const buyPrice = Number(stockRes.rows[0].current_price);

  if (!holdings[ticker]) {
    holdings[ticker] = { qty, avg_buy: buyPrice };

    await pool.query(
      `INSERT INTO history
       (user_id,email,ticker,action,qty,buy_price,created_at)
       VALUES ($1,$2,$3,'BUY',$4,$5,CURRENT_TIMESTAMP)`,
      [id, email, ticker, qty, buyPrice]
    );
  } else {
    const old = holdings[ticker];
    const newQty = old.qty + qty;
    const newAvg =
      (old.qty * old.avg_buy + qty * buyPrice) / newQty;

    holdings[ticker] = { qty: newQty, avg_buy: Number(newAvg.toFixed(2)) };
  }

  await pool.query(
    "UPDATE users SET holdings=$1 WHERE id=$2",
    [JSON.stringify(holdings), id]
  );

  const { rows } = await pool.query("SELECT * FROM users WHERE id=$1", [id]);
  io.emit("user_update", sanitizeUser(rows[0]));
  res.json({ ok: true, user: sanitizeUser(rows[0]) });
});

app.post("/sell", authMiddleware, async (req, res) => {
  const { ticker } = req.body;
  const { id, email } = req.user;

  const userRes = await pool.query(
    "SELECT holdings FROM users WHERE id=$1",
    [id]
  );

  let holdings = safeJSON(userRes.rows[0].holdings, {});
  const stock = holdings[ticker];

  const priceRes = await pool.query(
    "SELECT current_price FROM stocks WHERE ticker=$1",
    [ticker]
  );

  const sellPrice = Number(priceRes.rows[0].current_price);
  const pl = Number(((sellPrice - stock.avg_buy) * stock.qty).toFixed(2));

  await pool.query(
    `INSERT INTO history
     (user_id,email,ticker,action,qty,buy_price,sell_price,pl,created_at)
     VALUES ($1,$2,$3,'SELL',$4,$5,$6,$7,CURRENT_TIMESTAMP)`,
    [id, email, ticker, stock.qty, stock.avg_buy, sellPrice, pl]
  );

  delete holdings[ticker];

  await pool.query(
    "UPDATE users SET holdings=$1 WHERE id=$2",
    [JSON.stringify(holdings), id]
  );

  const { rows } = await pool.query("SELECT * FROM users WHERE id=$1", [id]);
  io.emit("user_update", sanitizeUser(rows[0]));
  res.json({ ok: true, user: sanitizeUser(rows[0]) });
});

/* ---------------- history ---------------- */

app.get("/history", authMiddleware, async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM history WHERE user_id=$1 ORDER BY id DESC",
    [req.user.id]
  );
  res.json({ ok: true, history: rows });
});

/* ---------------- realtime engine ---------------- */

setInterval(async () => {
  const { rows: stocks } = await pool.query("SELECT * FROM stocks");

  for (const s of stocks) {
    const change = Math.random() * 20 - 10;
    const newPrice = Math.max(10, Number(s.current_price) + change);

    await pool.query(
      "UPDATE stocks SET current_price=$1, last_updated=CURRENT_TIMESTAMP WHERE ticker=$2",
      [newPrice.toFixed(2), s.ticker]
    );
  }

  io.emit("price_update", (await pool.query("SELECT * FROM stocks")).rows);
}, 1000);

/* ---------------- server ---------------- */

const PORT = process.env.PORT || 4000;
server.listen(PORT, () =>
  console.log(`Backend running on port ${PORT}`)
);
