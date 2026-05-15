import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../api/client.js";
import { Button, Input, PageHeader, Card, Empty } from "../components/ui.jsx";
import { IconActivity, IconSearch } from "../components/Icons.jsx";

const ACTION_TONE = { create: "var(--ok)", delete: "var(--danger)", update: "var(--warn)", login: "var(--accent)" };
const ACTION_LABEL = { create: "buat", delete: "hapus", update: "ubah", login: "login" };

function formatChanges(raw) {
  try {
    const obj = JSON.parse(raw);
    return Object.entries(obj).map(([k, v]) => `${k}: ${v}`).join(" · ");
  } catch {
    return raw;
  }
}

export default function AuditLog() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const LIMIT = 50;

  const { data, isLoading } = useQuery({
    queryKey: ["audit", page],
    queryFn: () => api.get("/audit", { params: { page, limit: LIMIT } }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const allRows = data?.rows ?? [];
  const rows = q.trim()
    ? allRows.filter((r) => {
        const needle = q.toLowerCase();
        return [r.username, r.action, r.entity_type, r.changes].some((v) => v?.toLowerCase().includes(needle));
      })
    : allRows;
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <>
      <PageHeader
        title="Audit Log"
        meta={`${total} entri`}
        actions={
          <div className="search" style={{ minWidth: 260 }}>
            <IconSearch size={14} />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari user, target, atau action…" />
          </div>
        }
      />

      <Card pad={false}>
        {isLoading && <Empty title="Memuat…" />}
        {!isLoading && rows.length === 0 && <Empty title="Belum ada entri audit." />}
        <div className="col" style={{ padding: 8, gap: 0 }}>
          {rows.map((row) => (
            <div key={row.id} className="row" style={{ gap: 14, padding: "12px 14px", borderRadius: 8, alignItems: "flex-start" }}>
              <span style={{
                width: 32, height: 32, borderRadius: "50%", background: "var(--surface-2)",
                color: ACTION_TONE[row.action] ?? "var(--fg-2)",
                display: "grid", placeItems: "center", flexShrink: 0,
              }}>
                <IconActivity size={14} />
              </span>
              <div style={{ flex: 1 }}>
                <div className="row" style={{ gap: 8, marginBottom: 2 }}>
                  <span className="strong">{row.username ?? "system"}</span>
                  <span className="muted">{ACTION_LABEL[row.action] ?? row.action}</span>
                  <span className="link mono" style={{ fontSize: 12 }}>{row.entity_type}{row.entity_id != null ? ` #${row.entity_id}` : ""}</span>
                </div>
                {row.changes && (
                  <div className="muted" style={{ fontSize: 12 }}>{formatChanges(row.changes)}</div>
                )}
              </div>
              <div className="muted num" style={{ fontSize: 11.5, flexShrink: 0 }}>
                {new Date(row.timestamp).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {totalPages > 1 && (
        <div className="row mt-16" style={{ justifyContent: "space-between" }}>
          <span className="muted" style={{ fontSize: 13 }}>{total} total</span>
          <div className="row" style={{ gap: 6 }}>
            <Button variant="default" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</Button>
            <span className="muted" style={{ padding: "0 8px", fontSize: 13 }}>{page} / {totalPages}</span>
            <Button variant="default" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next →</Button>
          </div>
        </div>
      )}
    </>
  );
}
