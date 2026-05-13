import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
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

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<BukuList />} />
        <Route path="bookings" element={<BookingsList />} />
        <Route path="bookings/new" element={<BookingForm />} />
        <Route path="bookings/:id" element={<BookingDetail />} />
        <Route path="bookings/:id/edit" element={<BookingForm />} />
        <Route path="users" element={<Users />} />
        <Route path="piutang" element={<Piutang />} />
        <Route path="hutang" element={<Hutang />} />
        <Route path="audit" element={<AuditLog />} />
        <Route path="shippers" element={<Shippers />} />
        <Route path="buku" element={<BukuList />} />
        <Route path="buku/:id" element={<BukuDetail />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
