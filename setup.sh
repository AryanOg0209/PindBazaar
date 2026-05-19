#!/bin/bash
# PindBazaar Setup Script
# Run: bash setup.sh

set -e

echo ""
echo "🌾 ==============================="
echo "   PindBazaar - Setup Script"
echo "=================================="
echo ""

# 1. Check PostgreSQL
if ! command -v psql &> /dev/null; then
  echo "❌ PostgreSQL not found. Please install it first:"
  echo "   brew install postgresql@15 && brew services start postgresql@15"
  exit 1
fi

echo "✅ PostgreSQL found"

# 2. Create database
echo "📦 Creating database 'pindbazaar'..."
psql postgres -c "CREATE DATABASE pindbazaar;" 2>/dev/null || echo "  (database may already exist)"

# 3. Backend setup
echo ""
echo "⚙️  Setting up backend..."
cd backend

# Copy .env if not exists
if [ ! -f .env ]; then
  cp .env.example .env
  echo "📝 Created backend/.env – update DATABASE_URL and JWT_SECRET before going live"
fi

# Install deps
npm install --silent

# Generate Prisma + push schema
npx prisma generate
npx prisma db push

# Seed
node src/utils/seed.js

echo ""
echo "✅ Backend ready!"

# 4. Frontend setup
cd ../frontend
echo ""
echo "🎨 Setting up frontend..."
npm install --silent
echo "✅ Frontend ready!"

echo ""
echo "🚀 =============================================="
echo "   Setup complete! Start the app:"
echo ""
echo "   Terminal 1 (backend):"
echo "   cd backend && npm run dev"
echo ""
echo "   Terminal 2 (frontend):"
echo "   cd frontend && npm run dev"
echo ""
echo "   🌐 App:   http://localhost:5173"
echo "   🛠️  Admin: http://localhost:5173/admin/login"
echo "   📱 Admin phone: 9999999999 (check server console for OTP)"
echo "==============================================="
