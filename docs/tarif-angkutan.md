# Tarif Angkutan & EMKL — Reference

Reference for the trucking tariff lookup, the EMKL document module, the trucking
vendor rename rules, and how the May 2026 seed encodes 2x20 trucking moves.

Source of truth in code: `logistics-app/client/src/data/tarif.js`.

---

## 1. Trucking vendor names

Renamed on import and normalized in the DB (migration 022, idempotent):

| Source value | Stored as |
|---|---|
| `TAS, PT./DAVID` | `MMC` |
| `TAS, PT.` / code `TAS-T` | `TAS` |

`MMC` and `TAS` are the in-house vendors priced off the **main** tariff table.
Other vendors (`SP2/SSG/BBT`, `HW`, `LJR`) price off the **secondary** table.
Any other free-text vendor (e.g. `LAIN`) has no tariff and is left manual.

---

## 2. Tariff tables

`tarif.js` holds the Sept 2022 tariff:

- **Main table** — 18 routes (`1a`–`18`), each with prices per size column
  `20ft` (1x20'), `40ft` (1x40'), `2x20` (2x20').
- **Secondary table** — extra trucker price maps attached to the matching route
  rows: `CANANG EXPORT`, `TEMBUNG … HP. PERAK`, `PATUMBAK … JL. BINJAI`,
  `P. SIANTAR …`.

`LOKASI_OPTIONS` (= the 18 route labels) feeds the **Lokasi Muat** dropdown on the
Booking form and Identitas Shipment card.

`TRUCKING_OPTIONS = ['MMC', 'TAS', 'SP2/SSG/BBT', 'HW', 'LJR']` feeds the
**Trucking** dropdown in Jadwal Trucking.

### Size → tariff column

| Container size | Tariff column |
|---|---|
| `20ft` | `20ft` (1x20') |
| `40ft`, `40HC` | `40ft` (1x40') |
| `2x20` | `2x20` (2x20') |

### Lookup

```js
getTarif(lokasi, trucking, size) // → number | null
```

- vendor key: `MMC`/`TAS` → `main`; otherwise the vendor's own key.
- returns `null` when the (lokasi, vendor, size) cell is undefined → user types the
  biaya manually.

Auto-fill happens in `BookingDetail.jsx` (`JadwalTruckingTable.applyTarif`) when the
user changes Trucking or Size in the add/edit form. The value is editable — real
invoiced amounts can legitimately differ from the list tariff.

---

## 3. EMKL module (formerly "Dokumen")

`BookingDocuments.jsx` + `routes/bookingDocuments.js` (table `booking_documents`).

- **Tipe EMKL** master list: BIAYA LAIN, PEB, PHYTO, FUMIGASI, LIFT ON, COO,
  LIFT OFF, BIAYA LAPANGAN, SERTIFIKAT.
- `doc_type` is stored free-form, so historical/imported types outside the list
  (PHYTOSANITARY, PELANCAR BERKAS, PIUTANG, …) still display and stay selectable on
  edit via the fallback option.
- Tipe is editable on edit (client sends `doc_type`; server PUT persists it).

---

## 4. Seed: 2x20 pairing

`scripts/seed-from-excel.js` imports the 9 May 2026 jobs. Source rows list each box
individually; a box with `biaya_trucking = 0` is the **second box of a 2x20 trucking
move**. `pairContainers()` folds each `0` row into the preceding row as
`container_no_2` / `seal_no_2` and bumps that row to size `2x20`. Solo rows (no
trailing `0`) stay `20ft`/`40HC`. This reproduces each job's stated trucking total.

Container `notes` are intentionally empty; `lokasi_muat` is mapped to canonical
tarif route labels so the dropdown and auto-price line up.

To re-run (wipes all non-user data):

```bash
node scripts/seed-from-excel.js
```
