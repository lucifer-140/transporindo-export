import { z } from 'zod';

export const containerSchema = z.object({
  container_no: z.string().min(1),
  seal_no: z.string().optional().default(''),
  size: z.enum(['20ft', '40ft', '40HC', '2x20']),
  container_no_2: z.string().optional().default(''),
  seal_no_2: z.string().optional().default(''),
  no_sp: z.string().optional().default(''),
  trucking: z.string().optional().default(''),
  biaya_trucking: z.number().int().optional().nullable(),
  biaya_tambahan: z.number().int().optional().nullable(),
  in_date: z.string().optional().default(''),
  out_date: z.string().optional().default(''),
  notes: z.string().optional().default(''),
});

export const containerRowSchema = z.object({
  container_no: z.string().optional(),
  seal_no: z.string().optional(),
  size: z.enum(['20ft', '40ft', '40HC', '2x20']).optional(),
  container_no_2: z.string().optional(),
  seal_no_2: z.string().optional(),
  no_sp: z.string().optional(),
  trucking: z.string().optional(),
  biaya_trucking: z.number().int().optional().nullable(),
  biaya_tambahan: z.number().int().optional().nullable(),
  in_date: z.string().optional(),
  out_date: z.string().optional(),
  notes: z.string().optional(),
});

export const bookingSchema = z.object({
  job_no: z.string().min(1),
  shipper: z.string().min(1),
  commodity: z.string().optional().default(''),
  planned_qty: z.string().optional().default(''),
  port: z.string().optional().default(''),
  port_discharge: z.string().optional().default(''),
  lokasi_muat: z.string().optional().default(''),
  pelayaran: z.string().optional().default(''),
  carrier: z.string().optional().default(''),
  tanggal_pelayaran: z.string().optional().default(''),
  vessel_name: z.string().optional().default(''),
  vessel_no: z.string().optional().default(''),
  in_date: z.string().optional().default(''),
  out_date: z.string().optional().default(''),
  trucking: z.string().optional().default(''),
  notes: z.string().optional().default(''),
  buku_id: z.number().int().positive(),
  containers: z.array(containerSchema).default([]),
});

export const identitasSchema = z.object({
  job_no: z.string().min(1),
  shipper: z.string().min(1),
  commodity: z.string().optional().default(''),
  planned_qty: z.string().optional().default(''),
  lokasi_muat: z.string().optional().default(''),
  notes: z.string().optional().default(''),
});

export const pelayaranSchema = z.object({
  pelayaran: z.string().optional().default(''),
  carrier: z.string().optional().default(''),
  tanggal_pelayaran: z.string().optional().default(''),
  vessel_name: z.string().optional().default(''),
  vessel_no: z.string().optional().default(''),
  port: z.string().optional().default(''),
  port_discharge: z.string().optional().default(''),
  lokasi_muat: z.string().optional().default(''),
});

export const statusSchema = z.object({
  status: z.enum(['in_progress', 'done']),
});
