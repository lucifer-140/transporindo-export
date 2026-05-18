import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import { ToastProvider } from './components/Toast.jsx';

const BookingsList = lazy(() => import('./pages/BookingsList.jsx'));
const BookingForm = lazy(() => import('./pages/BookingForm.jsx'));
const BookingDetail = lazy(() => import('./pages/BookingDetail.jsx'));
const Users = lazy(() => import('./pages/Users.jsx'));
const AuditLog = lazy(() => import('./pages/AuditLog.jsx'));
const Piutang = lazy(() => import('./pages/Piutang.jsx'));
const Hutang = lazy(() => import('./pages/Hutang.jsx'));
const Shippers = lazy(() => import('./pages/Shippers.jsx'));
const BukuList = lazy(() => import('./pages/BukuList.jsx'));
const BukuDetail = lazy(() => import('./pages/BukuDetail.jsx'));
const BukuFinance = lazy(() => import('./pages/BukuFinance.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));
const Backup = lazy(() => import('./pages/Backup.jsx'));

const PageLoader = () => (
  <div className="page-loader">
    <div className="page-loader__spinner" />
    <span className="page-loader__label">Memuat…</span>
  </div>
);

export default function App() {
  return (
    <ToastProvider>
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/" element={
        <ProtectedRoute minRole="worker">
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Suspense fallback={<PageLoader />}><BukuList /></Suspense>} />
        <Route path="buku" element={<Suspense fallback={<PageLoader />}><BukuList /></Suspense>} />
        <Route path="buku/:id" element={<Suspense fallback={<PageLoader />}><BukuDetail /></Suspense>} />
        <Route path="buku/:id/finance" element={
          <ProtectedRoute minRole="finance">
            <Suspense fallback={<PageLoader />}><BukuFinance /></Suspense>
          </ProtectedRoute>
        } />
        <Route path="bookings" element={
          <ProtectedRoute minRole="admin">
            <Suspense fallback={<PageLoader />}><BookingsList /></Suspense>
          </ProtectedRoute>
        } />
        <Route path="bookings/new" element={
          <ProtectedRoute minRole="worker">
            <Suspense fallback={<PageLoader />}><BookingForm /></Suspense>
          </ProtectedRoute>
        } />
        <Route path="bookings/:id" element={
          <ProtectedRoute minRole="worker">
            <Suspense fallback={<PageLoader />}><BookingDetail /></Suspense>
          </ProtectedRoute>
        } />
        <Route path="bookings/:id/edit" element={
          <ProtectedRoute minRole="worker">
            <Suspense fallback={<PageLoader />}><BookingForm /></Suspense>
          </ProtectedRoute>
        } />
        <Route path="piutang" element={
          <ProtectedRoute minRole="finance">
            <Suspense fallback={<PageLoader />}><Piutang /></Suspense>
          </ProtectedRoute>
        } />
        <Route path="hutang" element={
          <ProtectedRoute minRole="finance">
            <Suspense fallback={<PageLoader />}><Hutang /></Suspense>
          </ProtectedRoute>
        } />
        <Route path="users" element={
          <ProtectedRoute minRole="admin">
            <Suspense fallback={<PageLoader />}><Users /></Suspense>
          </ProtectedRoute>
        } />
        <Route path="audit" element={
          <ProtectedRoute minRole="admin">
            <Suspense fallback={<PageLoader />}><AuditLog /></Suspense>
          </ProtectedRoute>
        } />
        <Route path="settings" element={
          <ProtectedRoute minRole="admin">
            <Suspense fallback={<PageLoader />}><Settings /></Suspense>
          </ProtectedRoute>
        } />
        <Route path="backup" element={
          <ProtectedRoute minRole="admin">
            <Suspense fallback={<PageLoader />}><Backup /></Suspense>
          </ProtectedRoute>
        } />
        <Route path="shippers" element={
          <ProtectedRoute minRole="admin">
            <Suspense fallback={<PageLoader />}><Shippers /></Suspense>
          </ProtectedRoute>
        } />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </ToastProvider>
  );
}
