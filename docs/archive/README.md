# Archive — pre-simplification reference

Dormant reference snapshots captured during the v0.19.0 "dumb down" pass. **Not imported, not built.** Kept so the old finance UI/logic can be ported back later.

Full live behaviour at the time is also recoverable from git: commit `b5c5da8` (`chore: backup full working state before simplification`).

| File | Was | Holds |
|---|---|---|
| `BookingDetail.full.jsx` | `client/src/pages/BookingDetail.jsx` | All finance tab panels (Invoice/Piutang/Hutang/Pajak/Reimbursement), every payment/line-item modal, money-hero widget, finance queries & mutations. |
| `BookingDocuments.old.jsx` | `client/src/pages/BookingDocuments.jsx` | Old Dokumen UI (doc_type + no_dok/tgl_dok/no_si/no_inv, finance hutang_dokumen inline payment columns). |
| `Piutang.jsx` | `client/src/pages/Piutang.jsx` | Standalone Piutang list page. |
| `Hutang.jsx` | `client/src/pages/Hutang.jsx` | Standalone Hutang vendor page. |
| `HutangDokumen.jsx` | `client/src/pages/HutangDokumen.jsx` | Standalone Hutang Dokumen page. |
| `HutangTrucking.jsx` | `client/src/pages/HutangTrucking.jsx` | Standalone Hutang Trucking page. |

Server finance routes (`hutang.js`, `hutangTrucking.js`, `hutangDokumen.js`, piutang/invoice-pajak/nota) remain in `server/src/routes/` but are dormant (no UI calls them).
