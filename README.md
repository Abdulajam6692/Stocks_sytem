Stock Trading System – Full-Stack Demo Application

A fully deployed, end-to-end full-stack stock trading simulation platform that demonstrates real-time data handling, secure authentication, RESTful APIs, WebSockets, and a modern React UI.

This project simulates a real-world stock broker client dashboard where users can buy/sell stocks, track holdings, calculate profit/loss, subscribe to tickers, and view personal transaction history with live price updates.

🚀 Live Deployment

✅ This is a deployed full-stack application

Frontend: React (Vite)

Backend: Node.js + Express + Socket.IO

Database: MySQL

Backend and frontend are connected exactly as in a production-style full-stack setup.

🧩 Key Features
🔐 Authentication & Security

User Signup & Login

Password hashing using bcrypt

Authentication using JWT (JSON Web Tokens)

Secure protected routes using token verification

📊 Trading Engine

Buy and Sell stocks

Automatic calculation of:

Quantity

Average Buy Price

Profit / Loss

Complete buy–sell cycle stored in transaction history

📈 Real-Time Stock Prices

Live stock price updates using Socket.IO

Prices auto-update every second

Price fluctuations simulated (+10 / −10)

Updates reflected instantly on all connected clients

📁 User-Specific Data

Holdings stored per user

Subscribed stocks per user

Trade history visible only to the logged-in user

📜 Trade History

Buy/Sell transaction log

Timestamped entries

Profit/Loss color-coded for clarity

🛠️ Tech Stack
Backend

Node.js

Express.js

MySQL (mysql2)

Socket.IO (real-time updates)

JWT (authentication)

bcrypt (password hashing)

Frontend

React (Vite)

Socket.IO Client

Stocks_system/
│
├── backend/
│   ├── server.js          # Express + Socket.IO backend
│   ├── db.js              # MySQL connection pool
│   ├── package.json
│
├── frontend/
│   └── my-react-app/
│       ├── src/
│       │   ├── components/
│       │   │   ├── Login.jsx
│       │   │   ├── Signup.jsx
│       │   │   ├── Dashboard.jsx
│       │   │   ├── History.jsx
│       │   │   ├── *.css
│       │   ├── App.jsx
│       │   ├── main.jsx
│       ├── package.json
│
├── README.md
├── .gitignore


Custom modern UI with CSS animations

Functional components with Hooks (useEffect, useRef)


⚙️ Backend Overview
REST APIs

POST /signup – Create user account

POST /login – Authenticate user

GET /me – Fetch authenticated user details

POST /buy – Buy stock

POST /sell – Sell stock

GET /history – Fetch user-specific trade history

Real-Time Engine

Socket.IO broadcasts stock price updates every second

Backend updates prices in MySQL

Frontend listens and updates UI instantly

🖥️ Frontend Overview
Core Screens
🔑 Login & Signup

Show/Hide password toggle

JWT stored in localStorage

User session maintained on refresh

📊 Dashboard

Live stock list

Interactive line chart

Buy/Sell controls

Quantity selector

Current holdings

Total P/L updated in real-time

📜 Trade History

BUY / SELL cycle table

Timestamped transactions

Profit/Loss highlighted with colors

▶️ How to Run Locally
Backend
cd backend
npm install
node server.js


Backend runs at:

http://localhost:4000

Frontend
cd frontend/my-react-app
npm install
npm run dev


Frontend runs at:

http://localhost:5173

📥 Clone the Repository
git clone https://github.com/Abdulajam6692/Stocks_sytem.git
cd Stocks_sytem
