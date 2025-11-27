# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] - 2025-11-27

### Added
- **Customer Management**: Full CRUD functionality for customers (`/settings/customers`).
- **Database Seeding**: Added `prisma/seed.ts` to populate the database with initial customer data.
- **Global Customer Search**: Implemented `CustomerSelect` component for searchable customer dropdowns across the app.
- **Sidebar Navigation**: Added a dropdown menu for "Settings" to house the "Customers" link.

### Changed
- **EMKL Job Creation**: Refactored `CreateJobPage` to use the shared `JobForm` component.
- **Piutang Form**: Updated invoice filtering to use `CustomerSelect` for better usability.
- **Invoice Form**: Integrated `CustomerSelect` for customer selection.

### Fixed
- **Hydration Error**: Resolved a hydration mismatch issue in the `CustomersPage` table rendering.

## [0.2.0] - 2025-11-27

### Added
- **Read-Only Views**: Created dedicated view pages for EMKL Jobs, Invoices, Hutang, Piutang, and Dokumen.
- **Documentation**: Added `SCRIPTS.md` to document database reset and production workflows.

### Changed
- **Navigation Flow**: Updated list pages to link to the new "View" pages instead of directly to "Edit" pages.
- **UI Improvements**: Increased table width and height in `HutangForm` for better visibility of document items.

## [0.1.0] - 2025-11-24

### Added
- **Initial Release**: Foundation of the Office System.
- **EMKL Module**: Management of Jobs and Containers.
- **Invoice Module**: Creation and management of invoices linked to jobs.
- **Finance Modules**: Hutang (Payable) and Piutang (Receivable) tracking.
- **Dokumen Module**: Management of operational documents.
- **Authentication**: Basic user authentication setup.
- **Database**: Initial Prisma schema design and migration.
