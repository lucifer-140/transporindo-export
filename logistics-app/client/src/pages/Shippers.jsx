import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/client.js";
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
import { IconPlus, IconEdit } from "../components/Icons.jsx";

// ── Commodity tag input ──────────────────────────────────────────────────────
// Enter (or Tambah button) adds a tag. Backspace on an empty input pops the
// last tag — matches the affordance users expect from chip inputs.
function CommodityTagInput({ commodities, onChange }) {
  const [input, setInput] = useState("");

  function add() {
    const val = input.trim();
    if (!val || commodities.includes(val)) {
      setInput("");
      return;
    }
    onChange([...commodities, val]);
    setInput("");
  }

  function remove(idx) {
    onChange(commodities.filter((_, i) => i !== idx));
  }

  function onKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      add();
    } else if (e.key === "Backspace" && !input && commodities.length) {
      e.preventDefault();
      remove(commodities.length - 1);
    }
  }

  return (
    <div className="col" style={{ gap: 8 }}>
      <div className="row" style={{ gap: 8 }}>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="e.g. Palm Oil RBD"
          style={{ flex: 1 }}
        />
        <Button
          type="button"
          variant="default"
          onClick={add}
          disabled={!input.trim()}
        >
          Tambah
        </Button>
      </div>
      {commodities.length > 0 && (
        <div className="row-wrap" style={{ gap: 6 }}>
          {commodities.map((c, i) => (
            <span
              key={i}
              className="badge badge--muted"
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              {c}
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Hapus ${c}`}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  width: 14,
                  height: 14,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 3,
                  color: "var(--fg-3)",
                  fontSize: 13,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
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
    setCommodities(sh.commodities.map((c) => c.name));
    setError("");
    setOpenModal(true);
  }

  const addMutation = useMutation({
    mutationFn: ({ name, commodities }) =>
      api.post("/shippers", { name, commodities }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shippers"] });
      setOpenModal(false);
    },
    onError: (e) => setError(e.response?.data?.error ?? "Gagal menyimpan"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name, commodities }) =>
      api.put(`/shippers/${id}`, { name, commodities }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shippers"] });
      setOpenModal(false);
    },
    onError: (e) => setError(e.response?.data?.error ?? "Gagal menyimpan"),
  });

  function save() {
    if (!name.trim()) {
      setError("Nama wajib diisi");
      return;
    }
    if (editing) {
      updateMutation.mutate({
        id: editing.id,
        name: name.trim(),
        commodities,
      });
    } else {
      addMutation.mutate({ name: name.trim(), commodities });
    }
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
            hint="Ketik nama komoditas lalu tekan Enter atau klik Tambah."
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
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<IconEdit size={12} />}
                  onClick={() => openEdit(sh)}
                />
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
