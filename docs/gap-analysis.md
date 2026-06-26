# TAS System Gap Analysis
> Based on: `ASoft_Jobs_COMPLETE_May2026.xlsx` (jobs 38/V, 39/V, 43/V, 44/V)
> Date: 2026-06-26

---

## Significant Gaps

### 1. Primary Invoice Entity
- `piutang` stores one total amount per booking — no invoice document
- Excel has: invoice number (e.g. `019/MK SOLAR CO LTD`), issue date, line items
- **Missing:** invoice number field, invoice date, a proper invoice record for the main EMKL invoice

### 2. Revenue Line Items
- Excel: "EMKL FEE 6 x 20 STD @ Rp 3,888,750" — qty × unit price breakdown
- System: only the total survives in `piutang.jumlah`
- **Missing:** line item table for primary invoice (description, qty, unit_price, amount)

### 3. Multiple Invoices Per Job
- 39/V has 3 invoices: **primary** + **REIMBURSEMENT** + **PAJAK**
- System has `invoice_pajak` and `nota_reimbursement` tables but no unified invoice list per job
- **Missing:** a single "invoices" view/list per booking showing all invoice types and their status

### 4. Customer Master Table
- System: only shipper name (free text) on booking
- Excel has: company name, address line 1 & 2, city, contact number, customer code (SMART, SJL, MTP, INA)
- **Missing:** `customers` table with full details; bookings should FK to customer, not store raw text

### 5. AP Voucher Charge Code
- Each supplier cost has two references:
  - **Voucher** (e.g. `LK26050107C`) — stored in `hutang.no_voucher`
  - **Charge Code** (e.g. `BL.38V/26OC`) — not stored anywhere
- **Missing:** `charge_code` field on `hutang`

### 6. Supplier Payment Status / AP Settlement
- AP Vouchers sheet shows Balance = 0 for all (fully paid)
- System has `pembayaran` table but vendor hutang has no clear payment-per-voucher flow
- **Missing:** clear AP payment workflow for vendor-type hutang (similar to hutang_trucking_payments)

---

## Minor Gaps

| # | Gap | Notes |
|---|-----|-------|
| 7 | **Sell Code** | Internal sell code (e.g. `TAS-0526-038`) distinct from Order No (`0526/038`) — not tracked separately |
| 8 | **Payment Terms** | All AP costs have 30-day credit (Pay Days = 30) — no field on `hutang` |
| 9 | **GL Account Codes** | Chart of accounts (e.g. `1101.0205`) not in system — accounting-level, low priority |

---

## Priority Order

1. **Customer master table** — enables proper invoice generation, reusable across bookings
2. **Primary invoice with line items** — needed to generate real invoice documents
3. **Unified invoice list per job** — UX: see all invoices (primary + reimb + pajak) in one place
4. **AP charge code field** — small addition, preserves full voucher reference
5. **AP payment flow for vendor hutang** — parity with trucking payment flow
