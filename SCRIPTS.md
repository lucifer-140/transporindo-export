# Database Management Scripts

This project includes several utility scripts for managing the database and generating documentation.

## Scripts

### `npm run db:reset`
**Command:** `npx prisma migrate reset --force`

This command will:
1.  Drop the database.
2.  Create a new database.
3.  Apply all migrations.
4.  Run the seed script (if configured).

**Use this when:** You want to start fresh with a clean database. **WARNING: This deletes all data.**

### `npm run db:erd`
**Command:** `npx prisma generate`

This command triggers the Prisma generator, which includes the configured `prisma-erd-generator`. It will generate an Entity Relationship Diagram (ERD) in SVG format at `ERD.svg` in the project root.

**Use this when:** You have modified `prisma/schema.prisma` and want to update the visual diagram.

## Production Reset Workflow

If you want to reset the database for production (or switch from prototyping to a stable schema), follow these steps:

### Step 1: Create Migrations
You cannot use `db:reset` if you haven't created migration files yet. If you were using `db push`, do this first:

**Command:**
```bash
npx prisma migrate dev --name init
```
*This creates the `prisma/migrations` folder and snapshots your current schema.*

### Step 2: Reset Database
Now you can safely reset the database. This will drop all data and re-apply the schema using the migration files.

**Command:**
```bash
npm run db:reset
```
*(Or `npx prisma migrate reset --force`)*

### Step 3: Seed (Optional)
If you have a seed script, it will run automatically after reset.

## Prerequisites
- Node.js and npm installed.
- PostgreSQL database running and configured in `.env`.
