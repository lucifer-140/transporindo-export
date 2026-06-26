import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/client.js";
import { useToast } from "../components/Toast.jsx";
import { Button, Card, PageHeader, Modal, Empty } from "../components/ui.jsx";
import { IconDownload, IconRefresh } from "../components/Icons.jsx";

function fmtSize(bytes) {
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / 1024).toFixed(1) + " KB";
}

function fmtDate(iso) {
  return new Date(iso).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function Backup() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);

  const { data: backups = [], isLoading } = useQuery({
    queryKey: ["backups"],
    queryFn: () => api.get("/backups").then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: () => api.post("/backup").then((r) => r.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["backups"] });
      toast(`Backup berhasil dibuat (${fmtSize(data.size)}).`);
    },
    onError: () => toast("Gagal membuat backup.", "error"),
  });

  function handleDownload(filename) {
    const url = `/api/backup/download/${encodeURIComponent(filename)}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  }

  const latest = backups[0];

  return (
    <>
      <PageHeader title="Backup & Pemulihan Data" crumbs={[{ label: "Backup" }]} />

      <div className="col" style={{ gap: 20, maxWidth: 720 }}>
        <Card title="Buat Backup">
          <div className="col" style={{ gap: 12 }}>
            <p className="muted" style={{ margin: 0 }}>
              Buat salinan seluruh data sistem sekarang. File backup dapat diunduh dan disimpan di tempat yang aman.
            </p>
            {latest && (
              <p className="muted" style={{ margin: 0, fontSize: "0.8rem" }}>
                Backup terakhir: <strong>{fmtDate(latest.createdAt)}</strong>
              </p>
            )}
            <div>
              <Button
                variant="primary"
                icon={<IconRefresh size={14} />}
                disabled={createMutation.isPending}
                onClick={() => setConfirmOpen(true)}
              >
                {createMutation.isPending ? "Membuat backup…" : "Buat Backup Sekarang"}
              </Button>
            </div>
          </div>
        </Card>

        <Card title="Daftar Backup">
          {isLoading ? (
            <div className="muted">Memuat…</div>
          ) : backups.length === 0 ? (
            <Empty title="Belum ada backup" sub="Buat backup pertama menggunakan tombol di atas." />
          ) : (
            <table className="table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th style={{ textAlign: "right" }}>Ukuran</th>
                  <th style={{ textAlign: "right" }}>Unduh</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((b) => (
                  <tr key={b.filename}>
                    <td>{fmtDate(b.createdAt)}</td>
                    <td style={{ textAlign: "right", color: "var(--muted)" }}>{fmtSize(b.size)}</td>
                    <td style={{ textAlign: "right" }}>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<IconDownload size={13} />}
                        onClick={() => handleDownload(b.filename)}
                      >
                        Unduh
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card title="Cara Memulihkan Data">
          <div className="col" style={{ gap: 10 }}>
            <p className="muted" style={{ margin: 0 }}>
              Pemulihan data memerlukan akses ke server. Ikuti langkah berikut:
            </p>
            <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 2, color: "var(--muted)" }}>
              <li>Unduh file backup yang ingin digunakan (tombol <strong>Unduh</strong> di atas).</li>
              <li>Hentikan server aplikasi.</li>
              <li>Jalankan perintah berikut di terminal, dari folder <code>logistics-app/server</code>:</li>
            </ol>
            <pre style={{
              background: "var(--surface-2, var(--surface))",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "10px 14px",
              fontSize: "0.8rem",
              overflowX: "auto",
              margin: 0,
            }}>
              {restoreFile
                ? `node ../scripts/restore-db.js ../server/data/backups/${restoreFile}`
                : `node ../scripts/restore-db.js ../server/data/backups/<nama-file-backup>.db`}
            </pre>
            {backups.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span className="muted" style={{ fontSize: "0.8rem" }}>Isi otomatis perintah untuk:</span>
                <select
                  style={{ fontSize: "0.8rem", padding: "2px 6px", borderRadius: 4, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--fg)" }}
                  value={restoreFile ?? ""}
                  onChange={(e) => setRestoreFile(e.target.value || null)}
                >
                  <option value="">— pilih backup —</option>
                  {backups.map((b) => (
                    <option key={b.filename} value={b.filename}>{fmtDate(b.createdAt)}</option>
                  ))}
                </select>
              </div>
            )}
            <ol start={4} style={{ margin: 0, paddingLeft: 20, lineHeight: 2, color: "var(--muted)" }}>
              <li>Ikuti instruksi di terminal (ketik <code>yes</code> untuk konfirmasi).</li>
              <li>Nyalakan kembali server aplikasi.</li>
            </ol>
          </div>
        </Card>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Konfirmasi Backup"
        footer={
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>Batal</Button>
            <Button
              variant="primary"
              disabled={createMutation.isPending}
              onClick={() => { setConfirmOpen(false); createMutation.mutate(); }}
            >
              Ya, Buat Backup
            </Button>
          </div>
        }
      >
        <p style={{ margin: 0 }}>
          Ini akan membuat salinan seluruh data sistem saat ini dan menyimpannya di server.
          Proses ini aman dan tidak mengganggu operasional.
        </p>
      </Modal>
    </>
  );
}
