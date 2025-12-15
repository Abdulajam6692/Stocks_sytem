// backend/db.js
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = pool;

/*
   here blow is the database creation 

   CREATE DATABASE stock_system


   CREATE TABLE IF NOT EXIST users {
   id INT PK AUTO_INCREMENT
   name VARCHAR(100)
   email VARCHAR(100) UNIQUE
   password_hash VARCHAR(255)
   subscriptions JSON
   holdings JSON
   total_pl DECIMAL(10,2)
   created_at TIMESTAMP
  }

  CREATE TABLE IF NOT EXIST stocks{
  ticker VARCHAR(10) PK
  name VARCHAR(50)
  current_price DECIMAL(10,2)
  last_updated TIMESTAMP
  }
   

  CREATE TABLE IF NOT EXIST history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    email VARCHAR(255) NOT NULL,
    ticker VARCHAR(20) NOT NULL,
    action ENUM('BUY', 'SELL') NOT NULL,
    qty INT NOT NULL,
    buy_price DECIMAL(10,2),
    sell_price DECIMAL(10,2),
    pl DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_history_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

*/