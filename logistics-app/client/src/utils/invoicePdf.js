import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const COMPANY = "TAS Logistics";

function fmtRp(n) {
  return "Rp " + (n ?? 0).toLocaleString("id-ID");
}

function fmtBulan(bulan, tahun) {
  return `${BULAN[(bulan ?? 1) - 1]} ${tahun}`;
}

function statusLabel(s) {
  const map = {
    belum_bayar: "Belum Bayar",
    sebagian: "Sebagian",
    lunas: "Lunas",
    none: "—",
    in_progress: "In Progress",
    done: "Selesai",
    cancelled: "Dibatalkan",
  };
  return map[s] ?? s ?? "—";
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function addHeader(doc, title, subtitle, rightLines) {
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(COMPANY, 14, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text("Jasa Pengiriman & Logistik", 14, 27);

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(title, 196, 20, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  rightLines.forEach((line, i) => {
    doc.text(line, 196, 27 + i * 6, { align: "right" });
  });

  doc.setDrawColor(200, 200, 200);
  doc.line(14, 34, 196, 34);

  doc.setTextColor(60, 60, 60);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(subtitle, 14, 41);

  doc.setTextColor(0, 0, 0);
}

function sectionLabel(doc, text, y) {
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(text, 14, y);
}

const DARK_HEAD = { fillColor: [30, 30, 30], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 };
const LIGHT_FOOT = { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold", fontSize: 9 };
const BODY = { fontSize: 9, textColor: [0, 0, 0] };

export function exportShipperInvoice(shipperData, buku) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const today = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });

  addHeader(
    doc,
    "INVOICE",
    `Kepada Yth: ${shipperData.shipper}`,
    [`Periode: ${fmtBulan(buku.bulan, buku.tahun)}`, `Tanggal: ${today}`]
  );

  autoTable(doc, {
    startY: 47,
    styles: { textColor: [0, 0, 0] },
    head: [["No", "Job No", "Status", "Tagihan", "Dibayar", "Sisa", "Piutang"]],
    body: shipperData.bookings.map((b, i) => [
      i + 1,
      b.job_no,
      statusLabel(b.status),
      fmtRp(b.tagihan),
      fmtRp(b.total_paid),
      fmtRp(b.sisa),
      statusLabel(b.piutang_status),
    ]),
    foot: [[
      "", "", "Total",
      fmtRp(shipperData.total_tagihan),
      fmtRp(shipperData.total_paid),
      fmtRp(shipperData.sisa),
      statusLabel(shipperData.status),
    ]],
    headStyles: DARK_HEAD,
    footStyles: LIGHT_FOOT,
    bodyStyles: BODY,
    columnStyles: {
      0: { halign: "center", cellWidth: 12 },
      1: { fontStyle: "bold" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
    },
    alternateRowStyles: { fillColor: [250, 250, 250] },
  });

  const finalY = doc.lastAutoTable.finalY + 8;
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Status keseluruhan: ${statusLabel(shipperData.status)}`, 14, finalY);
  doc.text(`Digenerate otomatis pada ${today}`, 14, finalY + 6);

  doc.save(`Invoice_${shipperData.shipper.replace(/\s+/g, "_")}_${buku.tahun}-${String(buku.bulan).padStart(2, "0")}.pdf`);
}

export function exportInvoiceOnly(booking, dokumen) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const today = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });

  addHeader(
    doc,
    "INVOICE",
    `Kepada Yth: ${booking.shipper}`,
    [`Job No: ${booking.job_no}`, `Tanggal: ${today}`]
  );

  const invoiceTotal = (dokumen ?? []).reduce((s, d) => s + (d.biaya ?? 0), 0);

  autoTable(doc, {
    startY: 47,
    styles: { textColor: [0, 0, 0] },
    head: [["#", "Uraian", "Qty", "Harga Satuan", "Subtotal"]],
    body: (dokumen ?? []).map((d, i) => [
      i + 1,
      d.tipe,
      d.qty,
      fmtRp(d.harga_satuan ?? 0),
      fmtRp(d.biaya ?? 0),
    ]),
    foot: [["", "", "", "Total", fmtRp(invoiceTotal)]],
    headStyles: DARK_HEAD,
    footStyles: LIGHT_FOOT,
    bodyStyles: BODY,
    columnStyles: {
      0: { halign: "center", cellWidth: 12 },
      2: { halign: "right", cellWidth: 20 },
      3: { halign: "right", cellWidth: 40 },
      4: { halign: "right", cellWidth: 40 },
    },
  });

  const finalY = doc.lastAutoTable.finalY + 8;
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Digenerate otomatis pada ${today}`, 14, finalY);

  const shipperSlug = (booking.shipper || "").replace(/\s+/g, "_");
  doc.save(`Invoice_${booking.job_no}_${shipperSlug}.pdf`);
}

export function exportBookingInvoice(booking, containers, dokumen, piutang) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const today = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });

  addHeader(
    doc,
    "BOOKING",
    `Job No: ${booking.job_no}`,
    [`Tanggal: ${today}`, `Shipper: ${booking.shipper}`]
  );

  let y = 47;

  // Job info
  autoTable(doc, {
    startY: y,
    styles: { textColor: [0, 0, 0] },
    body: [
      ["Shipper", booking.shipper || "—", "Vessel", `${booking.vessel_name || "—"}${booking.vessel_no ? " / " + booking.vessel_no : ""}`],
      ["Komoditi", booking.commodity || "—", "Feeder", booking.feeder || "—"],
      ["Port", booking.port || "—", "In Date", fmtDate(booking.in_date)],
      ["PEB", booking.peb || "—", "Out Date", fmtDate(booking.out_date)],
      ["BON", booking.bon || "—", "Trucking", booking.trucking || "—"],
    ],
    bodyStyles: { ...BODY, fillColor: [255, 255, 255] },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 30, fillColor: [245, 245, 245], textColor: [0, 0, 0] },
      1: { cellWidth: 65, textColor: [0, 0, 0] },
      2: { fontStyle: "bold", cellWidth: 30, fillColor: [245, 245, 245], textColor: [0, 0, 0] },
      3: { cellWidth: 65, textColor: [0, 0, 0] },
    },
    theme: "plain",
    tableLineColor: [220, 220, 220],
    tableLineWidth: 0.2,
  });

  y = doc.lastAutoTable.finalY + 10;

  if (containers?.length > 0) {
    sectionLabel(doc, "Containers", y);
    y += 4;

    autoTable(doc, {
      startY: y,
      styles: { textColor: [0, 0, 0] },
      head: [["No", "Container No", "Seal No", "Ukuran"]],
      body: containers.map((c, i) => [i + 1, c.container_no || "—", c.seal_no || "—", c.size]),
      headStyles: DARK_HEAD,
      bodyStyles: BODY,
      columnStyles: {
        0: { halign: "center", cellWidth: 15 },
        1: { fontStyle: "bold" },
      },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  if (dokumen?.length > 0) {
    sectionLabel(doc, "Rincian Biaya", y);
    y += 4;

    const invoiceTotal = dokumen.reduce((s, d) => s + (d.biaya ?? 0), 0);

    autoTable(doc, {
      startY: y,
      styles: { textColor: [0, 0, 0] },
      head: [["#", "Uraian", "Qty", "Harga Satuan", "Subtotal"]],
      body: dokumen.map((d, i) => [i + 1, d.tipe, d.qty, fmtRp(d.harga_satuan ?? 0), fmtRp(d.biaya ?? 0)]),
      foot: [["", "", "", "Total", fmtRp(invoiceTotal)]],
      headStyles: DARK_HEAD,
      footStyles: LIGHT_FOOT,
      bodyStyles: BODY,
      columnStyles: {
        0: { halign: "center", cellWidth: 12 },
        2: { halign: "right", cellWidth: 20 },
        3: { halign: "right", cellWidth: 40 },
        4: { halign: "right", cellWidth: 40 },
      },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  sectionLabel(doc, "Ringkasan Piutang", y);
  y += 4;

  const piutangPaid = piutang?.total_paid ?? 0;
  const piutangSisa = piutang ? Math.max(0, piutang.jumlah - piutangPaid) : 0;

  autoTable(doc, {
    startY: y,
    styles: { textColor: [0, 0, 0] },
    body: [
      ["Tagihan", fmtRp(piutang?.jumlah ?? 0)],
      ["Dibayar", fmtRp(piutangPaid)],
      ["Sisa", fmtRp(piutangSisa)],
      ["Status", statusLabel(piutang?.status ?? "none")],
    ],
    bodyStyles: { ...BODY, fillColor: [255, 255, 255] },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 40, fillColor: [245, 245, 245], textColor: [0, 0, 0] },
      1: { halign: "right", textColor: [0, 0, 0] },
    },
    theme: "plain",
    tableLineColor: [220, 220, 220],
    tableLineWidth: 0.2,
  });

  y = doc.lastAutoTable.finalY + 10;

  if (piutang?.pembayaran?.length > 0) {
    sectionLabel(doc, "Riwayat Pembayaran", y);
    y += 4;

    autoTable(doc, {
      startY: y,
      styles: { textColor: [0, 0, 0] },
      head: [["Tanggal", "Jumlah", "Metode", "Keterangan"]],
      body: piutang.pembayaran.map((p) => [fmtDate(p.tanggal), fmtRp(p.jumlah), p.metode, p.keterangan || "—"]),
      headStyles: DARK_HEAD,
      bodyStyles: BODY,
      columnStyles: { 1: { halign: "right" } },
    });
  }

  const shipperSlug = (booking.shipper || "").replace(/\s+/g, "_");
  doc.save(`Booking_${booking.job_no}_${shipperSlug}.pdf`);
}
