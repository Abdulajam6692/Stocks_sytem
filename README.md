Stocks System – Full-Stack a Demo stocks

A complete real-time stock trading simulation platform built using Node.js, Express, MySQL, Socket.IO, and React.
Users can buy/sell stocks, track holdings, view P/L, subscribe/unsubscribe to tickers, and access their personal transaction history.
This project demonstrates authentication, real-time updates, REST APIs, and clean React UI.

**Tech Stack**
 -Backend
 -Node.js
 -Express.js
 -MySQL (mysql2)
 -Socket.IO (real-time price updates + user updates)
 -JSON Web Tokens (JWT) for authentication
 -bcrypt for password hashing
**Frontend**
 -React (Vite)
 -Socket.IO Client
 -Modern UI with custom CSS

 Stock systems/
│── backend/
│   ├── server.js         # Main Express + Socket.IO backend
│   ├── db.js             # MySQL connection pool
│   ├── package.json
│
│── frontend/
│   └── my-react-app/
│       ├── src/
│       │   ├── components/
│       │   │   ├── Login.jsx
│       │   │   ├── Signup.jsx
│       │   │   ├── Dashboard.jsx
│       │   │   ├── History.jsx
│       │   │   ├── *.css
│       │   ├── main.jsx
│       │   ├── App.jsx
│       ├── package.json
│
│── README.md
│── .gitignore



Backend Overview (server.js)

Backend is a fully-functional REST API + real-time price engine.

Key Features
1. User Authentication

Login + Signup

Password hashing using bcrypt

JWT Token generation & verification

Token sent via headers to authenticated routes

2. User Profile

GET /me returns the authenticated user

Stores holdings & subscriptions as JSON

3. Trading Engine

POST /buy

POST /sell

Auto-calculates:

new quantity

average buy price

full buy/sell cycle storage into history

profit/loss

4. History

GET /history?email=...

Returns only entries belonging to logged-in user

5. Real-Time Live Prices (Socket.IO)

Every 5 seconds backend:

Randomizes each stock price (+10 / –10)

Updates MySQL



Frontend Overview (my-react-app)
Built using:

React + Vite

Socket.IO client

Custom modern UI with animations

Functional components + useEffect + useRef

Core Screens
1. Login + Signup

Show/Hide password toggle (eye icons)

JWT stored in localStorage

User stored in localStorage

2. Dashboard

Includes:

Live stock list (auto updating)

Interactive line chart

Buy/Sell buttons

Quantity selector

Current holdings

Total P/L updated live

Real-time updates from backend via socket.io

3. Trade History

Table of BUY/SELL cycles

Price, quantity, timestamp

Profit/Loss color coded

Only logged-in user's history shown




Running the Backend
Install dependencies
cd backend
npm install

Start server
node server.js


Backend runs at:

http://localhost:4000

▶️ Running the Frontend
Install dependencies
cd frontend/my-react-app
npm install

Start Vite dev server
npm run dev


Frontend runs at:

http://localhost:5173



How to Download & Run This Project

Anyone can clone:

git clone https://github.com/Abdulajam6692/Stocks_sytem.git
cd Stocks_sytem
