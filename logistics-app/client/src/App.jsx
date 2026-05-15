import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import BookingsList from './pages/BookingsList.jsx';
import BookingForm from './pages/BookingForm.jsx';
import BookingDetail from './pages/BookingDetail.jsx';
import Users from './pages/Users.jsx';
import AuditLog from './pages/AuditLog.jsx';
import Piutang from './pages/Piutang.jsx';
import Hutang from './pages/Hutang.jsx';
import Shippers from './pages/Shippers.jsx';
import BukuList from './pages/BukuList.jsx';
import BukuDetail from './pages/BukuDetail.jsx';
import BukuFinance from './pages/BukuFinance.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/" element={
        <ProtectedRoute minRole="worker">
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<BukuList />} />
        <Route path="buku" element={<BukuList />} />
        <Route path="buku/:id" element={<BukuDetail />} />
        <Route path="buku/:id/finance" element={
          <ProtectedRoute minRole="finance"><BukuFinance /></ProtectedRoute>
        } />
        <Route path="bookings" element={
          <ProtectedRoute minRole="admin"><BookingsList /></ProtectedRoute>
        } />
        <Route path="bookings/new" element={
          <ProtectedRoute minRole="worker"><BookingForm /></ProtectedRoute>
        } />
        <Route path="bookings/:id" element={
          <ProtectedRoute minRole="worker"><BookingDetail /></ProtectedRoute>
        } />
        <Route path="bookings/:id/edit" element={
          <ProtectedRoute minRole="worker"><BookingForm /></ProtectedRoute>
        } />
        <Route path="piutang" element={
          <ProtectedRoute minRole="finance"><Piutang /></ProtectedRoute>
        } />
        <Route path="hutang" element={
          <ProtectedRoute minRole="finance"><Hutang /></ProtectedRoute>
        } />
        <Route path="users" element={
          <ProtectedRoute minRole="admin"><Users /></ProtectedRoute>
        } />
        <Route path="audit" element={
          <ProtectedRoute minRole="admin"><AuditLog /></ProtectedRoute>
        } />
        <Route path="shippers" element={
          <ProtectedRoute minRole="admin"><Shippers /></ProtectedRoute>
        } />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
