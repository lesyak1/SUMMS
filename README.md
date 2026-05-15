# SUMMS

| Name:              | Student ID | GitHub Username: |
| ------------------ | ---------- | ---------------- |
| Adriana Atijas      |40317966   | adrianaatijas     |
| Akshey Visuvalingam         | 40270505   | Akshey-Visu  |
| Derek Gallagher    | 40272688   | Derick12345678   |
| Thi Hong Mai Nguyen | 40248343   | miiyao7         |
| Alesia Kulagina     | 40260096   | lesyak1  |
| Joshua Bitton      | 40273378   | Joshua131313       |


**SUMMS** is a full‑stack application with an Express/Prisma backend and a React/Vite frontend.

## Prerequisites

- [Node.js](https://nodejs.org/) **20.19+** (or ≥ 22.12)  
- [npm](https://www.npmjs.com/) (comes with Node)
- PostgreSQL database for development  
- [Supabase](https://supabase.com/) project for authentication & storage

## Quick Start
```
cd backend
npm install
```
```
cd ../frontend
npm install
```
### Configure environment variables

Backend (backend/.env):
```
DATABASE_URL="postgresql://user:password@localhost:5432/summs"
```

Frontend (frontend/ .env)
```
VITE_SUPABASE_URL=https://gbxjxdyqqitpjzilnvio.supabase.co/
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```
### Generate Prisma client (after editing schema.prisma or adjusting the DB URL):
```
cd backend
npx prisma generate
# run migrations if needed with `npx prisma migrate dev`
```
### Run development servers
```
cd backend
npm run dev    

cd frontend
npm run dev     
```
### Build for production
```
cd backend
npm run build      
npm start            

cd frontend
npm run build       
npm run preview     
```
