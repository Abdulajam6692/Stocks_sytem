/*// src/components/History.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./history.css";

function History() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Validate presence of token & user in localStorage
    const token = localStorage.getItem("token");
    const stored = localStorage.getItem("user");
    if (!token || !stored) {
      // not logged in
      navigate("/");
      return;
    }

    // Optionally verify token by calling /me
    verifyAndFetch(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verifyAndFetch = async (token) => {
    try {
      setLoading(true);
      setError("");

      // verify token and refresh local user if backend provides fresh user object
      const meRes = await fetch("http://localhost:4000/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (meRes.status === 401) {
        // invalid token -> logout
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/");
        return;
      }

      const meData = await meRes.json();
      if (!meData.ok) {
        // treat as unauthenticated
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/");
        return;
      }

      // update stored user object (optional)
      localStorage.setItem("user", JSON.stringify(meData.user));

      // fetch history
      await fetchHistoryWithToken(token);
    } catch (err) {
      console.error("verifyAndFetch error", err);
      setError("Server unreachable");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoryWithToken = async (token) => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("http://localhost:4000/history", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        // token expired/invalid
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/");
        return;
      }

      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "Failed to load history");
        setHistory([]);
      } else {
        setHistory(Array.isArray(data.history) ? data.history : []);
      }
    } catch (err) {
      console.error("fetch history failed", err);
      setError("Server unreachable");
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const gotoDashboard = () => navigate("/dashboard");

  const fmtPrice = (val) => {
    if (val === null || val === undefined) return "-";
    const n = Number(val);
    if (!Number.isFinite(n)) return "-";
    return `₹ ${n.toFixed(2)}`;
  };

  const fmtPL = (val) => {
    if (val === null || val === undefined) return "-";
    const n = Number(val);
    if (!Number.isFinite(n)) return "-";
    const signClass = n >= 0 ? "pl-pos" : "pl-neg";
    return <span className={signClass}>{`₹ ${n.toFixed(2)}`}</span>;
  };

  return (
    <div className="history-page" style={{ padding: 20, maxWidth: 1100, margin: "0 auto" }}>
      <header className="history-top" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1>Trade History</h1>
        <div>
          <button className="btn-outline" onClick={gotoDashboard}>Back to Dashboard</button>
        </div>
      </header>

      <main className="history-main">
        {loading ? (
          <div className="center">Loading history...</div>
        ) : error ? (
          <div className="center error">{error}</div>
        ) : history.length === 0 ? (
          <div className="center">No history available.</div>
        ) : (
          <div className="history-table-wrap" style={{ overflowX: "auto" }}>
            <table className="history-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <th style={{ padding: 8 }}>#</th>
                  <th style={{ padding: 8 }}>Action</th>
                  <th style={{ padding: 8 }}>Ticker</th>
                  <th style={{ padding: 8 }}>Qty</th>
                  <th style={{ padding: 8 }}>Price</th>
                  <th style={{ padding: 8 }}>P/L</th>
                  <th style={{ padding: 8 }}>Time</th>
                </tr>
              </thead>

              <tbody>
                {history.map((h, idx) => {
                  const buyPrice = h.buy_price ?? null;
                  const sellPrice = h.sell_price ?? null;
                  let displayPrice = null;

                  if (h.action === "BUY") displayPrice = buyPrice ?? sellPrice;
                  else if (h.action === "SELL") displayPrice = sellPrice ?? buyPrice;
                  else displayPrice = buyPrice ?? sellPrice;

                  const plVal = (h.pl === null || h.pl === undefined) ? null : h.pl;

                  return (
                    <tr key={h.id ?? idx} style={{ borderBottom: "1px dashed rgba(255,255,255,0.03)" }}>
                      <td style={{ padding: 8 }}>{idx + 1}</td>
                      <td style={{ padding: 8 }}>
                        <span className={h.action === "BUY" ? "action-buy" : "action-sell"}>{h.action}</span>
                      </td>
                      <td style={{ padding: 8 }}>{h.ticker}</td>
                      <td style={{ padding: 8 }}>{h.qty}</td>
                      <td style={{ padding: 8 }}>{fmtPrice(displayPrice)}</td>
                      <td style={{ padding: 8 }}>{fmtPL(plVal)}</td>
                      <td style={{ padding: 8 }}>{new Date(h.created_at).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

export default History;
*/




// src/components/History.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./history.css";

const API_BASE = "https://stocks-backend-pths.onrender.com";

function History() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const stored = localStorage.getItem("user");

    if (!token || !stored) {
      navigate("/");
      return;
    }

    verifyAndFetch(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verifyAndFetch = async (token) => {
    try {
      setLoading(true);
      setError("");

      const meRes = await fetch(`${API_BASE}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!meRes.ok) return logout();

      const meData = await meRes.json();
      if (!meData.ok) return logout();

      localStorage.setItem("user", JSON.stringify(meData.user));
      await fetchHistory(token);
    } catch (err) {
      console.error("verifyAndFetch error", err);
      setError("Server unreachable");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (token) => {
    try {
      const res = await fetch(`${API_BASE}/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) return logout();

      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "Failed to load history");
        setHistory([]);
      } else {
        setHistory(Array.isArray(data.history) ? data.history : []);
      }
    } catch (err) {
      console.error("fetchHistory error", err);
      setError("Server unreachable");
      setHistory([]);
    }
  };

  const logout = () => {
    localStorage.clear();
    navigate("/");
  };

  const gotoDashboard = () => navigate("/dashboard");

  const fmtPrice = (val) => {
    if (val === null || val === undefined) return "-";
    const n = Number(val);
    return Number.isFinite(n) ? `₹ ${n.toFixed(2)}` : "-";
  };

  const fmtPL = (val) => {
    if (val === null || val === undefined) return "-";
    const n = Number(val);
    if (!Number.isFinite(n)) return "-";
    return (
      <span className={n >= 0 ? "pl-pos" : "pl-neg"}>
        ₹ {n.toFixed(2)}
      </span>
    );
  };

  return (
    <div className="history-page" style={{ padding: 20, maxWidth: 1100, margin: "0 auto" }}>
      <header className="history-top" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1>Trade History</h1>
        <button className="btn-outline" onClick={gotoDashboard}>
          Back to Dashboard
        </button>
      </header>

      <main className="history-main">
        {loading ? (
          <div className="center">Loading history...</div>
        ) : error ? (
          <div className="center error">{error}</div>
        ) : history.length === 0 ? (
          <div className="center">No history available.</div>
        ) : (
          <div className="history-table-wrap" style={{ overflowX: "auto" }}>
            <table className="history-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Action</th>
                  <th>Ticker</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>P/L</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, idx) => {
                  const displayPrice =
                    h.action === "BUY" ? h.buy_price : h.sell_price;

                  return (
                    <tr key={h.id ?? idx}>
                      <td>{idx + 1}</td>
                      <td>
                        <span className={h.action === "BUY" ? "action-buy" : "action-sell"}>
                          {h.action}
                        </span>
                      </td>
                      <td>{h.ticker}</td>
                      <td>{h.qty}</td>
                      <td>{fmtPrice(displayPrice)}</td>
                      <td>{fmtPL(h.pl)}</td>
                      <td>{new Date(h.created_at).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

export default History;
