import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/client.js";
import { useToast } from "../components/Toast.jsx";
import {
  Button,
  Card,
  Field,
  Input,
  PageHeader,
  Empty,
  Modal,
  Stat,
  fmtRp,
} from "../components/ui.jsx";
import { IconPlus, IconEdit, IconTrash } from "../components/Icons.jsx";

// ── Commodity list editor ────────────────────────────────────────────────────
// commodities: [{id: number|null, name: string}]
// Each commodity is a labeled row with a text input and remove button.
// "Tambah Komoditas" button appends a new empty row and focuses it.
function CommodityTagInput({ commodities, onChange }) {
  const lastInputRef = { current: null };

  function update(idx, val) {
    onChange(commodities.map((c, i) => (i === idx ? { ...c, name: val } : c)));
  }

  function remove(idx) {
    onChange(commodities.filter((_, i) => i !== idx));
  }

  function addRow() {
    onChange([...commodities, { id: null, name: "" }]);
    // focus happens via autoFocus on the new input
  }

  function onKeyDown(e, idx) {
    if (e.key === "Enter") {
      e.preventDefault();
      addRow();
    }
  }

  return (
    <div className="col" style={{ gap: 6 }}>
      {commodities.length === 0 && (
        <p className="muted" style={{ fontSize: 12, margin: 0 }}>
          Belum ada komoditas. Klik tombol di bawah untuk menambahkan.
        </p>
      )}
      {commodities.map((c, i) => (
        <div key={i} className="row" style={{ gap: 8, alignItems: "center" }}>
          <Input
            autoFocus={c.id === null && i === commodities.length - 1}
            value={c.name}
            onChange={(e) => update(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            placeholder="Nama komoditas"
            style={{ flex: 1 }}
          />
          <button
            type="button"
            onClick={() => remove(i)}
            aria-label={`Hapus ${c.name || "komoditas"}`}
            style={{
              flexShrink: 0,
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: 6,
              cursor: "pointer",
              width: 32,
              height: 32,
              display: "grid",
              placeItems: "center",
              color: "var(--danger)",
              fontSize: 16,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        icon={<IconPlus size={12} />}
        onClick={addRow}
        style={{ alignSelf: "flex-start", marginTop: 2 }}
      >
        Tambah Komoditas
      </Button>
    </div>
  );
}

// ── Shippers page ────────────────────────────────────────────────────────────
export default function Shippers() {
  const qc = useQueryClient();
  const [openModal, setOpenModal] = useState(false);
  const [name, setName] = useState("");
  const [commodities, setCommodities] = useState([]);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["shippers"],
    queryFn: () => api.get("/shippers").then((r) => r.data),
  });

  function openNew() {
    setEditing(null);
    setName("");
    setCommodities([]);
    setError("");
    setOpenModal(true);
  }
  function openEdit(sh) {
    setEditing(sh);
    setName(sh.name);
    setCommodities(sh.commodities.map((c) => ({ id: c.id, name: c.name })));
    setError("");
    setOpenModal(true);
  }

  const toast = useToast();

  const addMutation = useMutation({
    mutationFn: ({ name, commodities }) =>
      api.post("/shippers", { name, commodities }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shippers"] });
      setOpenModal(false);
      toast("Shipper berhasil ditambahkan.");
    },
    onError: (e) => setError(e.response?.data?.error ?? "Gagal menyimpan"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name, commodities }) =>
      api.put(`/shippers/${id}`, { name, commodities }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shippers"] });
      setOpenModal(false);
      toast("Shipper berhasil diperbarui.");
    },
    onError: (e) => setError(e.response?.data?.error ?? "Gagal menyimpan"),
  });

  function save() {
    if (!name.trim()) {
      setError("Nama wajib diisi");
      return;
    }
    const cleanCommodities = commodities.filter((c) => c.name.trim());
    if (editing) {
      updateMutation.mutate({
        id: editing.id,
        name: name.trim(),
        commodities: cleanCommodities,
      });
    } else {
      addMutation.mutate({ name: name.trim(), commodities: cleanCommodities.map((c) => c.name) });
    }
  }

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/shippers/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shippers"] });
      toast("Shipper berhasil dihapus.");
    },
    onError: () => toast("Gagal menghapus shipper."),
  });

  function confirmDelete(sh) {
    if (!window.confirm(`Hapus shipper "${sh.name}"? Semua data terkait akan ikut terhapus.`)) return;
    deleteMutation.mutate(sh.id);
  }

  const isPending = addMutation.isPending || updateMutation.isPending;

  // ── KPI summary (matches Piutang/Hutang pages) ────────────────────────────
  const totalShippers = data.length;
  const totalBookings = data.reduce((a, s) => a + (s.booking_count ?? 0), 0);
  const totalTagihan = data.reduce((a, s) => a + (s.total_tagihan ?? 0), 0);
  const totalCommodities = data.reduce(
    (a, s) => a + (s.commodities?.length ?? 0),
    0,
  );

  return (
    <>
      <PageHeader
        title="Shippers & Commodities"
        meta="Master data klien — komoditas mereka akan auto-suggest saat buat booking."
        actions={
          <Button
            variant="primary"
            icon={<IconPlus size={14} />}
            onClick={openNew}
          >
            Add Shipper
          </Button>
        }
      />

      {!isLoading && data.length > 0 && (
        <div className="grid grid-stats mb-12">
          <Card pad={false}>
            <Stat label="Shippers" value={totalShippers} />
          </Card>
          <Card pad={false}>
            <Stat label="Komoditas" value={totalCommodities} />
          </Card>
          <Card pad={false}>
            <Stat
              label="Total Booking"
              value={totalBookings}
              sub="Semua shipper"
            />
          </Card>
          <Card pad={false}>
            <Stat label="Total Tagihan" value={fmtRp(totalTagihan)} />
          </Card>
        </div>
      )}

      <Modal
        open={openModal}
        onClose={() => setOpenModal(false)}
        title={editing ? "Edit Shipper" : "Add Shipper"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpenModal(false)}>
              Batal
            </Button>
            <Button
              variant="primary"
              disabled={!name || isPending}
              onClick={save}
            >
              {editing ? "Save" : "Add"}
            </Button>
          </>
        }
      >
        <div className="col" style={{ gap: 14 }}>
          <Field label="Nama Shipper" required>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              placeholder="PT Sinar Maju Sejahtera"
            />
          </Field>
          <Field
            label="Commodities"
            hint="Edit langsung di kolom. Tekan Enter untuk tambah baris baru."
          >
            <CommodityTagInput
              commodities={commodities}
              onChange={setCommodities}
            />
          </Field>
          {error && <div className="auth__err">{error}</div>}
        </div>
      </Modal>

      {isLoading ? (
        <Empty title="Memuat…" />
      ) : data.length === 0 ? (
        <Empty
          title="Belum ada shipper"
          sub="Tambahkan shipper pertama untuk mulai mencatat booking."
          action={
            <Button
              variant="primary"
              icon={<IconPlus size={14} />}
              onClick={openNew}
            >
              Add Shipper
            </Button>
          }
        />
      ) : (
        <div className="grid grid-2">
          {data.map((sh) => (
            <Card key={sh.id}>
              <div
                className="row"
                style={{
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 14,
                }}
              >
                <div>
                  <div
                    className="strong"
                    style={{ fontSize: 15, marginBottom: 2 }}
                  >
                    {sh.name}
                  </div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {sh.booking_count ?? 0} booking · Total{" "}
                    {fmtRp(sh.total_tagihan ?? 0)}
                  </div>
                </div>
                <div className="row" style={{ gap: 4 }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<IconEdit size={12} />}
                    onClick={() => openEdit(sh)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<IconTrash size={12} />}
                    onClick={() => confirmDelete(sh)}
                    style={{ color: "var(--danger)" }}
                  />
                </div>
              </div>
              <div className="field__lbl" style={{ marginBottom: 8 }}>
                Commodities ({sh.commodities.length})
              </div>
              <div className="row-wrap" style={{ gap: 6 }}>
                {sh.commodities.length === 0 ? (
                  <span className="muted" style={{ fontSize: 12 }}>
                    Belum ada komoditas.
                  </span>
                ) : (
                  sh.commodities.map((c) => (
                    <span key={c.id} className="badge badge--muted">
                      {c.name}
                    </span>
                  ))
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
