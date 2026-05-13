# TAS Logistics — System Flow Guide

This guide explains how the TAS Logistics system works, step by step, written for anyone — no technical background needed.

---

## What Is TAS?

TAS is a logistics booking management system. It helps a logistics company:
- Record and track export shipment bookings
- Organize bookings by month (called a **Buku**)
- Track what shippers owe the company (**Piutang**)
- Track what the company owes vendors (**Hutang**)
- Manage payments and see outstanding balances

---

## The Big Picture

```
Shippers & Commodities → Buku (Month) → Bookings → Finance (Piutang / Hutang)
```

Everything starts with master data (who your shippers are), then you open a monthly buku, add bookings under it, and record the financial transactions for each booking.

---

## Step 1 — Set Up Master Data (Shippers & Commodities)

**Where:** Menu → Shippers

Before creating any booking, you need to register your shippers (the clients who export goods through your company).

**What you do:**
1. Click **+ Add Shipper** and type the shipper's name
2. Inside each shipper, add their **commodities** (the types of goods they export, e.g. "Palm Oil", "Coffee")

**Why it matters:** When creating a booking, the system will automatically suggest the shipper's commodity — saving time and reducing errors.

---

## Step 2 — Open a Buku (Monthly Ledger)

**Where:** Menu → Buku (home page)

A **Buku** is a monthly record book. All bookings for that month live inside one buku. At the end of the month, you can see exactly what each shipper owes.

**What you do:**
1. Click **+ Buku Baru**
2. Select the **Year** and **Month** (e.g. 2026 / 05)
3. Click **Buat** — the buku is created and shows up in the list

**Rules:**
- One buku per month — you cannot create two buku for the same month
- A buku is **Open** by default, meaning new bookings can be added to it
- *(Future: a buku can be Closed to lock it at month-end)*

---

## Step 3 — Create a Booking

**Where:** Buku → click a periode → click **+ Booking Baru**

A **Booking** represents one shipment job. Each booking belongs to a buku (the month it was processed).

**What you fill in:**

| Field | What it means |
|-------|---------------|
| Buku (Periode) | Auto-filled — the month this booking belongs to |
| Job No | Your internal job reference number |
| Shipper | Which client is shipping |
| Commodity | What goods are being shipped |
| PEB | Export customs declaration number |
| Port | Port of loading |
| Feeder | Feeder vessel name |
| Vessel Name / No | Main vessel name and voyage number |
| BON | Bill of delivery number |
| In Date / Out Date | When containers arrived at / left the depot |
| Trucking | Trucking company used |
| Notes | Any extra remarks |
| Containers | Container number(s), seal number(s), and size (20ft or 40ft) |

Click **Create Booking** — the booking is saved and you land on the booking detail page.

---

## Step 4 — Fill In the Invoice (Line Items)

**Where:** Booking Detail → Invoice section

After creating a booking, you record the charges that will be billed to the shipper.

**What you do:**
1. Click **+ Add Item**
2. Fill in: **Uraian** (description, e.g. "Biaya Handling"), **Qty**, **Harga Satuan** (unit price)
3. The system calculates the line total automatically
4. Add as many line items as needed
5. The **Total** at the bottom is the amount to bill the shipper

---

## Step 5 — Record Piutang (What the Shipper Owes)

**Where:** Booking Detail → Piutang section

**Piutang** = accounts receivable — money the shipper owes your company.

**What you do:**
1. Click **Set from Invoice** to auto-fill the amount from the invoice total (or type it manually)
2. Save the piutang record
3. When the shipper pays, click **+ Tambah Pembayaran** and record:
   - **Tanggal** (date of payment)
   - **Jumlah** (amount paid)
   - **Metode** (transfer / cash / giro / other)
   - **Keterangan** (optional note)

**Status updates automatically:**
- 🔴 **Belum Bayar** — no payment received yet
- 🟡 **Sebagian** — partial payment received
- 🟢 **Lunas** — fully paid

---

## Step 6 — Record Hutang (What You Owe Vendors)

**Where:** Booking Detail → Hutang section

**Hutang** = accounts payable — money your company owes to vendors (e.g. trucking companies, port agents).

**What you do:**
1. Click **+ Add Hutang**
2. Fill in: **Pihak** (vendor name), **Jumlah** (amount owed), **Keterangan** (note)
3. You can add multiple hutang records per booking (one per vendor)
4. Record payments the same way as piutang

---

## Step 7 — Monitor the Buku (Monthly Summary)

**Where:** Menu → Buku → click a periode

The **Buku Detail** page gives you a complete picture of the month:

**Summary bar (top):**
- **Total Tagihan** — total amount to be billed to all shippers this month
- **Dibayar** — total amount already paid
- **Sisa** — outstanding balance

**Shipper breakdown (accordion list):**
- Each shipper shows their own tagihan / dibayar / sisa
- Click a shipper row to expand and see all their bookings for the month
- Each booking shows its piutang status (Belum Bayar / Sebagian / Lunas)
- Click a Job No to go directly to that booking

The page **auto-refreshes every 15 seconds** — so if a colleague records a payment, you'll see it shortly without reloading.

---

## Other Pages

### Bookings (Menu → Bookings)
A flat list of all bookings across all months. Use the search bar and filters to find a specific booking. You can also export the list to CSV.

### Users (Menu → Users)
Admin only. Manage staff accounts — create users, set roles (admin or worker), activate or deactivate accounts.

### Audit Log (Menu → Audit Log)
Admin only. A read-only log of every action taken in the system — who created or changed what, and when.

---

## User Roles

| Role | What they can do |
|------|-----------------|
| **Admin** | Everything — including user management and audit log |
| **Worker** | Create and manage bookings, record payments |

---

## Typical Monthly Workflow

```
1. Month starts
   └─ Open a new Buku for the month (e.g. 2026/06)

2. Throughout the month
   └─ For each shipment job:
       ├─ Create a Booking under the buku
       ├─ Add invoice line items
       ├─ Set the Piutang (amount to bill the shipper)
       └─ Record any Hutang (vendor costs)

3. Payments come in
   └─ Record each payment under the relevant Piutang or Hutang

4. End of month
   └─ Open the Buku to see the full summary
   └─ Check which shippers still have outstanding balances (Sisa > 0)
   └─ Follow up on unpaid / partial piutang
```
