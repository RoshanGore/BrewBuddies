# ☕ BrewBuddies — QR-Based Dine-in Cafe & Customer Loyalty Platform

BrewBuddies is a full-stack, production-quality web application built for dine-in cafes. Customers scan a table-specific QR code to browse the menu, customize items, place dine-in orders directly to their table, track order status in real time, and earn/redeem loyalty points. Cafe owners and staff get a comprehensive dashboard to manage live orders, menu products, customer loyalty, table QR codes, and sales analytics.

---

## 🌟 Key Features

### 📱 Customer Side (Dine-In Mobile Experience)
1. **QR-Based Table Recognition**: Automatically detects table number from QR code (e.g. `/?table=4`) with instant on-screen table confirmation.
2. **Interactive Menu**: Category filtering (Espresso, Cold Brews, Artisan Bakery, Savory Bites, Desserts), search bar, vegetarian badge filter, item photo, and preparation time.
3. **Item Customization**: Add special instructions (e.g., "oat milk", "extra hot", "less sugar") directly to cart items.
4. **Frictionless Dine-in Checkout**: Customers simply enter their name & phone number to place their order. No forced lengthy password creation before ordering.
5. **Live Order Pipeline Tracker**: Visual real-time status tracker (`Placed` ➔ `Accepted` ➔ `Preparing` ➔ `Ready` ➔ `Served`) that auto-updates every 4 seconds.
6. **Loyalty Program**: Automatically earns 10 loyalty points for every $1 spent.
7. **Rewards Catalog**: Customers can redeem accumulated points for free coffees or instant bill discounts directly into their cart.
8. **Special Offers**: Promo coupons (e.g., `BREWFIRST` for 20% off) with 1-click cart application.
9. **Diner Profile & Receipts**: View lifetime points, visit count, tier badges, and past order receipts.

### 💼 Owner / Staff Side (Desktop Management Hub)
1. **Owner Dashboard**: Real-time KPIs (Today's Revenue, Active Dine-in Orders, Total Diners, Average Check) and live kitchen queue.
2. **Live Orders**: Real-time order cards sorted by table number. 1-click status workflow: `Accept Order` ➔ `Start Preparing` ➔ `Mark Ready` ➔ `Mark Served`.
3. **Menu & Product Management**: Add new products, update prices, upload/link photos, set prep times, and toggle instant out-of-stock.
4. **Customer Directory**: View all registered diners, phone numbers, visit frequency, lifetime spend, and loyalty tiers.
5. **Rewards Management**: Create, edit, and delete loyalty perks with custom point costs.
6. **Promotions & Offers**: Create discount coupons with percentage/flat discounts and minimum spend thresholds.
7. **Table QR Code Generator**: Generate printable table tent cards with custom table numbers, Wi-Fi password badges, and instant print/download.
8. **Sales Analytics**: Visual area charts and bar charts powered by Recharts (7-day revenue trends and top-selling items).
9. **Settings**: Edit cafe name, tagline, currency symbol, tax %, loyalty point conversion rates, and guest Wi-Fi.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React, Recharts, `qrcode.react`, Axios, `canvas-confetti`.
- **Backend**: Node.js, Express.js, Mongoose, JWT (`jsonwebtoken`), `bcryptjs`, CORS, Dotenv, Morgan.
- **Database**: MongoDB Atlas (or local MongoDB).

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **MongoDB Atlas** (Free cloud database) or local MongoDB service

### 2. Configure Environment Variables
Open `server/.env` and configure your database and port:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/brewbuddies?retryWrites=true&w=majority
JWT_SECRET=brewbuddies_super_secret_jwt_key_2026_change_in_production
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

> **Beginner Tip for MongoDB Atlas**:
> 1. Sign up for free at [cloud.mongodb.com](https://cloud.mongodb.com)
> 2. Create a free M0 cluster.
> 3. Under **Database Access**, create a database user and password.
> 4. Under **Network Access**, add IP `0.0.0.0/0` (Allow from anywhere).
> 5. Click **Connect** ➔ **Drivers** ➔ Copy the connection string and paste into `server/.env`.

### 3. Seed Realistic Demo Data (Optional but Recommended)
Run the seed script to instantly populate delicious coffee/bakery items, sample tables, promo offers, and default staff credentials:
```bash
npm run seed
```

### 4. Start the Application

In one terminal, start the Backend API:
```bash
npm run server
```
*Backend runs on `http://localhost:5000`*

In a second terminal, start the Frontend UI:
```bash
npm run client
```
*Frontend runs on `http://localhost:5173`*

---

## 🔑 Demo Credentials

- **Owner / Staff Portal**: `http://localhost:5173/owner/login`
- **Email**: `owner@brewbuddies.com`
- **Password**: `admin123`
*(A 1-click "Use Demo Credentials" button is also provided on the login screen for instant testing)*

---

## 📱 Testing the Dine-in Customer Experience

1. Open `http://localhost:5173/?table=3` (simulates scanning Table #3's QR code).
2. You will see **"Table #3 - Dine In"** confirmed on screen.
3. Browse the menu, add items to cart, and apply coupon `BREWFIRST`.
4. Enter your name and phone number at checkout and click **Place Dine-in Order**.
5. Watch the live progress pipeline (`Placed` ➔ `Preparing` ➔ `Ready` ➔ `Served`).
6. In a second browser window, log into the **Owner Portal** (`/owner/orders`) and advance the order's status to see it update live in the customer view!
