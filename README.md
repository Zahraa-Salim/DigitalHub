# 🚀 Digital Hub Project

Full-stack project built with modern web technologies:

* **React (Vite)** — Public Web App
* **React (Vite)** — Admin Dashboard
* **Express (Node.js)** — REST API Server
* **PostgreSQL (Neon)** — Shared Cloud Database

---

## 📁 Project Structure

```
digital-hub/
├── web/      # Public frontend
├── admin/    # Admin dashboard
└── server/   # Express API
```

---

## ⚙️ Installation Guide

### 1️⃣ Clone the Repository

```bash
git clone <repo_url>
cd digital-hub
```

---

## 🖥️ Start the Backend Server

Navigate to the server folder:

```bash
cd server
npm install
```

### Create Environment File

**Windows**

```bash
copy .env.example .env
```

**Mac/Linux**

```bash
cp .env.example .env
```

### Configure Environment Variables

Edit:

```
server/.env
```

Replace the following with your Neon credentials:

```env
PGHOST=
PGPASSWORD=
```

These credentials will be shared privately by the team.

### Run the Server

```bash
npm run dev
```

Server will run on:
👉 http://localhost:5000

---

## 🌐 Start the Web App

Open a new terminal:

```bash
cd web
npm install
npm run dev
```

Runs on:
👉 http://localhost:5173

---

## 🛠️ Start the Admin Dashboard

Open another terminal:

```bash
cd admin
npm install
npm run dev
```

---

## 🗄️ Database Setup

This project uses a **shared PostgreSQL database hosted on Neon**.

Once the `.env` file is configured, the server will connect automatically.

All teammates will use the **same cloud database**.

---

## ▶️ Run Full Project

Run each service in a separate terminal.

### Terminal 1 — Server

```bash
cd server
npm run dev
```

### Terminal 2 — Web App

```bash
cd web
npm run dev
```

### Terminal 3 — Admin Dashboard

```bash
cd admin
npm run dev
```

---

## ✅ Team Setup Instructions

After pushing the project, each teammate should:

1. Clone the repository
2. Copy `.env.example → .env`
3. Add Neon `PGHOST` and `PGPASSWORD`
4. Run server + apps

All team members will then connect to the **same shared database**.

---

## 📌 Tech Stack Summary

| Layer       | Technology        |
| ----------- | ----------------- |
| Frontend    | React + Vite      |
| Admin Panel | React + Vite      |
| Backend     | Node.js + Express |
| Database    | PostgreSQL (Neon) |

---

## 👨‍💻 Contributing

1. Create a new branch
2. Commit your changes
3. Open a Pull Request

---

## 📄 License

This project is for educational and team collaboration purposes.
