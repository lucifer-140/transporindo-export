# Office System

A Next.js application for managing office operations including EMKL (Logistics), Hutang (Accounts Payable), and Piutang (Accounts Receivable).

## Features

### EMKL (Logistics)
- Manage Job Orders (Header) and Containers (Detail).
- Track shipment details including origin, destination, vessel, and ETA.

### Finance Modules
- **Hutang (Accounts Payable)**:
    - Manage payments to vendors/transporters.
    - Filter expenses by Document Type or Transporter Name.
    - Track outstanding balances.
- **Piutang (Accounts Receivable)**:
    - Manage receipts from customers.
    - Search invoices by Customer Name.
    - Track outstanding balances.

### Documents & Invoices
- **Dokumen**: Manage expense documents associated with jobs.
- **Invoice**: Generate invoices for customers based on jobs.

## Getting Started

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Database Setup**:
    Ensure your PostgreSQL database is running and `DATABASE_URL` is set in `.env`.
    ```bash
    npx prisma migrate dev
    ```

3.  **Run Development Server**:
    ```bash
    npm run dev
    ```

## Scripts

See [SCRIPTS.md](./SCRIPTS.md) for detailed information on available database management scripts.

- `npm run db:reset`: Reset the database (wipes all data).
- `npm run db:erd`: Generate the Entity Relationship Diagram (ERD).

## Version History

- **v0.2.0**: Added Finance Modules (Hutang, Piutang), ERD Generator, and Database Scripts.
- **v0.1.0**: Initial release with EMKL, Dokumen, and Invoice modules.
