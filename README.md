# Digitron Associates

React/Vite storefront with an Express backend, MongoDB through Prisma, admin login, and Google customer login.

## Requirements

- Node.js 20+
- MongoDB, either local or MongoDB Atlas
- Google OAuth credentials if customer Google login should work

## Setup

Install frontend packages:

```bash
npm install
```

Install backend packages:

```bash
cd backend
npm install
```

Create `backend/.env` from `backend/.env.example`, then set:

```env
MONGODB_URI=mongodb://localhost:27017/digitron?serverSelectionTimeoutMS=5000
JWT_SECRET=change-this-admin-jwt-secret
SESSION_SECRET=change-this-session-secret
FRONTEND_URL=http://localhost:5173
PORT=5000
```

For MongoDB Atlas, use a URI with a database name, for example:

```env
MONGODB_URI=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/digitron?retryWrites=true&w=majority&serverSelectionTimeoutMS=5000
```

In Atlas, also allow your current IP address in Network Access. Without that, the backend will start but `/api/health` and product/category APIs will time out or return database errors.

Generate the Prisma MongoDB client:

```bash
cd backend
npm run prisma:generate
```

If your MongoDB database is empty and you have the exported Supabase data in `backend/migrate/data/supabase-export.json`, import it:

```bash
cd backend
npm run migrate:mongo:import
```

## Run

Start the backend:

```bash
cd backend
npm start
```

Check the backend:

```bash
http://localhost:5000/api/health
```

Start the frontend in another terminal:

```bash
npm run dev
```

Open:

```bash
http://localhost:5173
```

Admin login:

```text
username: admin
password: Admin@1234
```

## Google Login

Create OAuth credentials in Google Cloud Console and add this redirect URI:

```text
http://localhost:5000/api/auth/google/callback
```

Then set these in `backend/.env`:

```env
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
```
