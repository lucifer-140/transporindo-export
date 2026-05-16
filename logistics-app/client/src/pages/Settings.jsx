import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/client.js";
import { useToast } from "../components/Toast.jsx";
import { Button, Card, Field, Input, PageHeader } from "../components/ui.jsx";

export default function Settings() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.get("/settings").then((r) => r.data),
  });

  const [ppnRate, setPpnRate] = useState(null);

  const updateMutation = useMutation({
    mutationFn: (value) => api.put("/settings/ppn_rate", { value }).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["settings"] }); toast("Pengaturan disimpan."); },
    onError: () => toast("Gagal menyimpan pengaturan.", "error"),
  });

  return (
    <>
      <PageHeader title="Pengaturan" crumbs={[{ label: "Pengaturan" }]} />

      <Card title="Pajak" style={{ maxWidth: 480 }}>
        {isLoading ? (
          <div className="muted">Memuat…</div>
        ) : (
          <div className="col" style={{ gap: 16 }}>
            <Field label="PPN Rate (%)" hint="Tarif PPN default untuk Invoice Pajak baru. Perubahan hanya berlaku untuk invoice yang dibuat setelah ini.">
              <Input
                type="number" min={0} max={100} step={0.1}
                value={ppnRate ?? settings?.ppn_rate ?? ""}
                onChange={(e) => setPpnRate(e.target.value)}
                style={{ maxWidth: 120 }}
              />
            </Field>
            <div>
              <Button
                variant="primary"
                disabled={updateMutation.isPending}
                onClick={() => updateMutation.mutate(ppnRate ?? settings?.ppn_rate)}
              >
                Simpan
              </Button>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
