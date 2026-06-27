import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBukuList, createBuku, deleteBuku } from "../api/buku.js";
import { useAuth } from "../hooks/useAuth.js";
import { useToast } from "../components/Toast.jsx";
import { monthLabel } from "../components/ui.jsx";

export default function BukuList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ tahun: new Date().getFullYear(), bulan: new Date().getMonth() + 1 });
  const [formError, setFormError] = useState("");

  const { data: bukuList = [], isLoading } = useQuery({
    queryKey: ["buku"],
    queryFn: getBukuList,
  });

  const createMutation = useMutation({
    mutationFn: createBuku,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buku"] });
      setShowAdd(false);
      setFormError("");
      toast("Buku berhasil dibuat.");
    },
    onError: (e) => setFormError(e.response?.data?.error ?? "Gagal membuat buku"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBuku,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["buku"] }); setSelected(null); toast("Buku berhasil dihapus."); },
    onError: (e) => toast(e.response?.data?.error ?? "Gagal hapus buku.", "error"),
  });

  function handleCreate(e) {
    e.preventDefault();
    setFormError("");
    createMutation.mutate({ tahun: parseInt(form.tahun), bulan: parseInt(form.bulan) });
  }

  function handleContinue() {
    if (selected == null) return;
    navigate(`/buku/${selected}`);
  }

  return (
    <div className="ps-page">
      <div className="ps-pagehd">
        <h1>Buku — Daftar Periode</h1>
        <div className="ps-pagehd__actions">
          {isAdmin && <button className="ps-btn" onClick={() => { setShowAdd(s => !s); setFormError(""); }}>Tambah Buku Baru</button>}
        </div>
      </div>

      {showAdd && (
        <form className="ps-panel ps-addpanel" onSubmit={handleCreate}>
          <div className="ps-panel__hd">Tambah Buku Baru</div>
          <div className="ps-formrow">
            <label>Tahun
              <input type="number" min="2020" max="2099" value={form.tahun}
                onChange={(e) => setForm((f) => ({ ...f, tahun: e.target.value }))} />
            </label>
            <label>Bulan
              <select value={form.bulan} onChange={(e) => setForm((f) => ({ ...f, bulan: e.target.value }))}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i + 1} value={i + 1}>{String(i + 1).padStart(2, "0")} — {monthLabel(i + 1)}</option>
                ))}
              </select>
            </label>
            <div className="ps-formrow__btns">
              <button type="submit" className="ps-btn ps-btn--primary" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Menyimpan…" : "Simpan"}
              </button>
              <button type="button" className="ps-btn" onClick={() => setShowAdd(false)}>Batal</button>
            </div>
          </div>
          {formError && <div className="ps-error">{formError}</div>}
        </form>
      )}

      <div className="ps-panel">
        <div className="ps-panel__hd">Pilih Buku</div>

        {isLoading ? (
          <div className="ps-empty">Memuat…</div>
        ) : bukuList.length === 0 ? (
          <div className="ps-empty">Belum ada buku. Tambahkan buku baru untuk mulai mencatat.</div>
        ) : (
          <>
            <table className="ps-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>Pilih</th>
                  <th>Periode</th>
                  <th>Tahun</th>
                  <th>Bulan</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Jumlah Booking</th>
                  <th>Dibuat</th>
                  {isAdmin && <th style={{ width: 60 }} />}
                </tr>
              </thead>
              <tbody>
                {bukuList.map((b) => (
                  <tr
                    key={b.id}
                    className={selected === b.id ? "is-selected" : ""}
                    onClick={() => setSelected(b.id)}
                  >
                    <td style={{ textAlign: "center" }}>
                      <input type="radio" name="buku" checked={selected === b.id} onChange={() => setSelected(b.id)} />
                    </td>
                    <td>{monthLabel(b.bulan)} {b.tahun}</td>
                    <td>{b.tahun}</td>
                    <td>{String(b.bulan).padStart(2, "0")}</td>
                    <td>{b.status === "open" ? "Open" : "Closed"}</td>
                    <td style={{ textAlign: "right" }}>{b.booking_count}</td>
                    <td>{new Date(b.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</td>
                    {isAdmin && (
                      <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                        {b.booking_count === 0 && (
                          <button className="ps-btn ps-btn--link"
                            onClick={() => { if (confirm(`Hapus buku ${b.tahun}/${String(b.bulan).padStart(2, "0")}?`)) deleteMutation.mutate(b.id); }}>
                            Hapus
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="ps-panel__ft">
              <button className="ps-btn ps-btn--primary" disabled={selected == null} onClick={handleContinue}>
                Continue ▸
              </button>
              <span className="ps-hint">Pilih satu buku lalu klik Continue.</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
