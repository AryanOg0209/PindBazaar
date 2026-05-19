# PindBazaar 🌾

> Agricultural marketplace platform for Punjab & Haryana — connecting Farmers, Industries, Balers, and Movers.

## Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Frontend   | React 18 + Vite + React Router v6 |
| Backend    | Node.js + Express.js              |
| Database   | PostgreSQL + Prisma ORM           |
| Auth       | JWT + OTP (phone-based)           |
| Uploads    | Multer (local, S3-ready)          |

---

## Quick Start

### Prerequisites
- Node.js ≥ 18
- PostgreSQL running locally

### 1. One-command setup
```bash
bash setup.sh
```

### 2. Manual setup

```bash
# Backend
cd backend
cp .env.example .env         # Edit DATABASE_URL and JWT_SECRET
npm install
npx prisma generate
npx prisma db push
node src/utils/seed.js        # Seeds admin + sample data
npm run dev                   # Starts on :5000

# Frontend (new terminal)
cd frontend
npm install
npm run dev                   # Starts on :5173
```

---

## App Flow

```
Language Select → Why PindBazaar → Auth Gate
     ↓ Sign Up                         ↓ Login
Account Type → Phone → OTP       Phone → OTP
     ↓                                 ↓
Profile Setup (multi-step)       Dashboard (if approved)
     ↓                           Pending (if not yet)
Document Upload
     ↓
Pending Approval Screen ──→ Admin approves ──→ Dashboard
```

---

## User Roles

| Role     | What they do                      | Documents Required           |
|----------|-----------------------------------|------------------------------|
| Farmer   | List & sell biomass/produce       | Aadhaar, Land Record         |
| Industry | Buy biomass / agri inputs         | Aadhaar, GST Certificate     |
| Baler    | Bundle biomass for transport      | Aadhaar, Machine Photo       |
| Mover    | Transport agri goods              | Aadhaar, Vehicle RC          |

---

## Admin Panel

URL: `http://localhost:5173/admin/login`

Login phone: `9999999999` (check **server console** for OTP in dev mode)

### Admin can:
- View all pending / approved / rejected applications
- See full profile + uploaded documents
- Approve or reject with notes
- View stats by role

---

## API Reference

```
POST /api/auth/send-otp       → { phone }
POST /api/auth/register       → { phone, code, role }
POST /api/auth/login          → { phone, code }
GET  /api/auth/me             → (JWT required)

GET  /api/user/profile        → (JWT)
PUT  /api/user/profile        → (JWT)
POST /api/user/documents      → (JWT, multipart)
GET  /api/user/status         → (JWT)

GET  /api/districts           → { Punjab: [...], Haryana: [...] }
GET  /api/districts/:state    → { state, districts: [...] }

GET  /api/admin/stats                          → (admin JWT)
GET  /api/admin/applications?status=pending    → (admin JWT)
GET  /api/admin/applications/:id              → (admin JWT)
PUT  /api/admin/applications/:id/approve      → (admin JWT)
PUT  /api/admin/applications/:id/reject       → (admin JWT)
```

---

## Environment Variables

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/pindbazaar"
JWT_SECRET="change-this-in-production"
JWT_EXPIRES_IN="7d"
PORT=5000
FRONTEND_URL=http://localhost:5173
ADMIN_PHONE=9999999999
ANTHROPIC_API_KEY="your-anthropic-key"
OPENWEATHER_API_KEY="your-openweather-key"
```

---

## Districts Covered

**Punjab (22):** Amritsar, Bathinda, Faridkot, Ferozepur, Gurdaspur, Hoshiarpur, Jalandhar, Kapurthala, Ludhiana, Mansa, Moga, Mohali, Muktsar, Pathankot, Patiala, Rupnagar, Sangrur, Tarn Taran + more

**Haryana (22):** Ambala, Bhiwani, Faridabad, Gurugram, Hisar, Jind, Kaithal, Karnal, Kurukshetra, Panipat, Rohtak, Sirsa, Sonipat, Yamunanagar + more

---

## Folder Structure

```
internproject/
├── backend/
│   ├── prisma/schema.prisma
│   ├── src/
│   │   ├── server.js
│   │   ├── controllers/   (auth, user, admin)
│   │   ├── middleware/    (auth, upload)
│   │   ├── routes/        (auth, user, admin, district)
│   │   └── utils/         (otp, districts, prisma, seed)
│   └── .env
├── frontend/
│   ├── public/logo.png
│   └── src/
│       ├── App.jsx
│       ├── index.css
│       ├── api/axios.js
│       ├── context/AuthContext.jsx
│       └── pages/
│           ├── WelcomePage.jsx
│           ├── WhyPage.jsx
│           ├── AuthGatePage.jsx
│           ├── AccountTypePage.jsx
│           ├── PhonePage.jsx
│           ├── OtpPage.jsx
│           ├── ProfilePage.jsx
│           ├── DocumentsPage.jsx
│           ├── PendingPage.jsx
│           ├── DashboardPage.jsx
│           └── admin/
│               ├── AdminLogin.jsx
│               ├── AdminDashboard.jsx
│               └── AdminDetail.jsx
└── setup.sh
```
