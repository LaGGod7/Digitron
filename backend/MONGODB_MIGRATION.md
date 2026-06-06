# MongoDB Migration Notes

The backend now uses MongoDB through Prisma.

## Environment

Keep both values in `backend/.env` while migrating:

```env
DATABASE_URL="postgresql://..."
MONGODB_URI="mongodb+srv://..."
```

After the migration is complete and verified, `DATABASE_URL` is only needed if you want to export from Supabase again.

## One-Time Migration

From the `backend` folder:

```bash
npm run migrate:supabase-to-mongo
```

This command:

1. Generates a temporary Supabase/Postgres Prisma client.
2. Exports categories, products, reviews, quote requests, settings, hidden products, and visit counts.
3. Generates the MongoDB Prisma client.
4. Imports the exported data into MongoDB.
5. Rewrites local hidden-product and visit-count JSON files to use the new MongoDB product IDs.

## Normal Backend Startup

After migration:

```bash
npm run prisma:generate
npm start
```

## Important

Rotate the Supabase and MongoDB passwords after the migration, because credentials were shared during setup.
