import api from './client.js';

export const getBukuList = () => api.get('/buku').then(r => r.data);
export const getBuku = (id) => api.get(`/buku/${id}`).then(r => r.data);
export const createBuku = (data) => api.post('/buku', data).then(r => r.data);
export const deleteBuku = (id) => api.delete(`/buku/${id}`);
export const getBukuBookings = (id) => api.get(`/buku/${id}/bookings`).then(r => r.data);
