# Budget App

Personal budget tracking PWA built with React + Vite + Supabase.

## Stack
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend/Auth/DB**: Supabase
- **Hosting**: Vercel
- **PWA**: vite-plugin-pwa (installable on iPhone via Safari)

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env.local
```
Edit `.env.local` with your Supabase project URL and anon key.
Get these from: Supabase Dashboard → Project Settings → API

### 3. Set up Supabase
- Create a new project at supabase.com
- Run the SQL schema (see `/supabase/schema.sql`)
- Enable Row Level Security on all tables

### 4. Run locally
```bash
npm run dev
```

### 5. Deploy to Vercel
```bash
# Push to GitHub, then connect repo in Vercel
# Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY as environment variables
```

## Install on iPhone
1. Open the deployed URL in Safari
2. Tap the Share button → "Add to Home Screen"
3. Done — runs as a full-screen app

## Project Structure
```
src/
├── components/
│   ├── layout/    # AppLayout, navigation
│   └── ui/        # Reusable components
├── context/       # AuthContext, ThemeContext
├── hooks/         # Custom React hooks
├── lib/           # supabase.js client
├── pages/         # One file per screen
└── main.jsx       # Entry point
```
