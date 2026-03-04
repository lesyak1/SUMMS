import { Route, Routes } from 'react-router-dom';
import './App.css';
import ProtectedRoute from './components/layout/ProtectedRoute/ProtectedRoute';
import { RoleProtectedRoute } from './components/layout/ProtectedRoute/RoleProtectedRoute';
import Login from './features/auth/pages/Login';
import Register from './features/auth/pages/Register';
import ForgotPassword from './features/auth/pages/ForgotPassword';
import ConfirmEmail from './features/auth/pages/ConfirmEmail';

// SUMMS App Pages
import DashboardPage from './pages/DashboardPage';
import AccountPage from './pages/AccountPage';
import VehiclesPage from './pages/VehiclesPage';
import VehicleDetailPage from './pages/VehicleDetailPage';
import RentalsPage from './pages/RentalsPage';
import ParkingPage from './pages/ParkingPage';
import PublicTransportPage from './pages/PublicTransportPage';
import ProviderDashboard from './pages/ProviderDashboard';
import AdminDashboard from './pages/AdminDashboard';

const App = () => {
    return (
        <Routes>
            {/* SUMMS Main App Routes */}
            <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
            <Route path="/vehicles" element={<ProtectedRoute><VehiclesPage /></ProtectedRoute>} />
            <Route path="/vehicles/:id" element={<ProtectedRoute><VehicleDetailPage /></ProtectedRoute>} />
            <Route path="/rentals/current" element={<ProtectedRoute><RentalsPage /></ProtectedRoute>} />
            <Route path="/parking" element={<ProtectedRoute><ParkingPage /></ProtectedRoute>} />
            <Route path="/public-transport" element={<ProtectedRoute><PublicTransportPage /></ProtectedRoute>} />

            {/* Provider/Admin Routes */}
            <Route path="/provider/vehicles" element={<RoleProtectedRoute allowedRoles={['MOBILITY_PROVIDER', 'ADMIN']}><ProviderDashboard /></RoleProtectedRoute>} />

            <Route path="/admin" element={<RoleProtectedRoute allowedRoles={['ADMIN']}><AdminDashboard /></RoleProtectedRoute>} />
            <Route path="/admin/users" element={<RoleProtectedRoute allowedRoles={['ADMIN']}><AdminDashboard /></RoleProtectedRoute>} />
            <Route path="/admin/analytics" element={<RoleProtectedRoute allowedRoles={['ADMIN']}><AdminDashboard /></RoleProtectedRoute>} />

            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/confirm-email" element={<ConfirmEmail />} />
        </Routes>
    );
}

export default App;
