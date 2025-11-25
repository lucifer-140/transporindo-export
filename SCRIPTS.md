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

## Prerequisites
- Node.js and npm installed.
- PostgreSQL database running and configured in `.env`.
