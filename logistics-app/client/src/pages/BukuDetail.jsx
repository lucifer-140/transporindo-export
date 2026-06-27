import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBuku, updateBukuStatus } from "../api/buku.js";
import { useAuth } from "../hooks/useAuth.js";
import { useToast } from "../components/Toast.jsx";
import { fmtDate, monthLabel } from "../components/ui.jsx";

export default function BukuDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["buku", id],
    queryFn: () => getBuku(id),
  });

  const statusMutation = useMutation({
    mutationFn: (action) => updateBukuStatus(id, action),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["buku"] });
      toast(updated.status === "closed" ? "Buku ditutup." : "Buku dibuka kembali.");
    },
    onError: (e) => toast(e.response?.data?.error ?? "Gagal mengubah status buku.", "error"),
  });

  if (isLoading) return <div className="ps-page"><div className="ps-empty">Memuat…</div></div>;
  if (isError || !data?.buku) return <div className="ps-page"><div className="ps-empty ps-empty--err">Gagal memuat data.</div></div>;

  const { buku, shippers = [], booking_count } = data;
  const periode = `${monthLabel(buku.bulan)} ${buku.tahun}`;
  const bukuState = { buku_id: buku.id, buku_periode: `${buku.tahun}/${String(buku.bulan).padStart(2, "0")}` };
  const closed = buku.status === "closed";

  // Flatten all bookings across shippers into one combined list
  const allBookings = shippers.flatMap((g) => g.bookings.map((bk) => ({ ...bk, shipper: g.shipper })));
  const q = search.trim().toLowerCase();
  const filtered = q === "" ? allBookings : allBookings.filter((bk) =>
    bk.job_no?.toLowerCase().includes(q) ||
    bk.shipper?.toLowerCase().includes(q) ||
    bk.commodity?.toLowerCase().includes(q) ||
    bk.vessel_name?.toLowerCase().includes(q)
  );

  return (
    <div className="ps-page">
      <div className="ps-crumbs">
        <button className="ps-btn ps-btn--link" onClick={() => navigate("/")}>Buku</button>
        <span className="ps-crumbs__sep">›</span>
        <span>{periode}</span>
      </div>

      <div className="ps-pagehd">
        <h1>Bookings — {periode} <span className="ps-tag">{closed ? "Closed" : "Open"}</span></h1>
        <div className="ps-pagehd__actions">
          {isAdmin && (
            closed
              ? <button className="ps-btn" onClick={() => statusMutation.mutate("buka")} disabled={statusMutation.isPending}>Buka Buku</button>
              : <button className="ps-btn" onClick={() => { if (confirm(`Tutup buku ${periode}? Setelah ditutup data tidak dapat diubah.`)) statusMutation.mutate("tutup"); }} disabled={statusMutation.isPending}>Tutup Buku</button>
          )}
          {user && !closed && (
            <button className="ps-btn ps-btn--primary" onClick={() => navigate("/bookings/new", { state: bukuState })}>Booking Baru</button>
          )}
        </div>
      </div>

      {closed && (
        <div className="ps-notice">Buku ini sudah ditutup. Tidak dapat menambah atau mengubah data.{isAdmin && " Klik \"Buka Buku\" untuk membuka kembali."}</div>
      )}

      <div className="ps-panel">
        <div className="ps-panel__hd">
          <span>Daftar Booking</span>
          <input className="ps-search" placeholder="Cari job / shipper / komoditi / kapal…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <table className="ps-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}>No</th>
              <th>Job No</th>
              <th>Shipper</th>
              <th>Commodity</th>
              <th>Vessel</th>
              <th>Status</th>
              <th>In / Out</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="ps-table__empty">{allBookings.length === 0 ? "Belum ada booking di buku ini." : "Tidak ada booking yang cocok."}</td></tr>
            ) : filtered.map((bk, i) => (
              <tr key={bk.id} className="is-clickable" onClick={() => navigate(`/bookings/${bk.public_id}`, { state: bukuState })}>
                <td style={{ textAlign: "right" }}>{i + 1}</td>
                <td className="mono">{bk.job_no}</td>
                <td>{bk.shipper || "—"}</td>
                <td>{bk.commodity || "—"}</td>
                <td>{bk.vessel_name || "—"}{bk.vessel_no ? ` / ${bk.vessel_no}` : ""}</td>
                <td>{bk.status === "done" ? "Done" : bk.status === "cancelled" ? "Cancelled" : "In Progress"}</td>
                <td style={{ whiteSpace: "nowrap" }}>{bk.in_date ? fmtDate(bk.in_date) : "—"} → {bk.out_date ? fmtDate(bk.out_date) : "pending"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ps-panel__ft">
          <span className="ps-hint">{filtered.length} booking{booking_count != null ? ` dari ${booking_count}` : ""}</span>
        </div>
      </div>
    </div>
  );
}
