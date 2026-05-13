import { z } from 'zod';

export const containerSchema = z.object({
  container_no: z.string().min(1),
  seal_no: z.string().optional().default(''),
  size: z.enum(['20', '40']),
});

export const bookingSchema = z.object({
  job_no: z.string().min(1),
  shipper: z.string().min(1),
  commodity: z.string().optional().default(''),
  peb: z.string().optional().default(''),
  port: z.string().optional().default(''),
  feeder: z.string().optional().default(''),
  vessel_name: z.string().optional().default(''),
  vessel_no: z.string().optional().default(''),
  bon: z.string().optional().default(''),
  in_date: z.string().optional().default(''),
  out_date: z.string().optional().default(''),
  trucking: z.string().optional().default(''),
  notes: z.string().optional().default(''),
  buku_id: z.number().int().positive(),
  containers: z.array(containerSchema).default([]),
});

export const statusSchema = z.object({
  status: z.enum(['in_progress', 'done']),
});
