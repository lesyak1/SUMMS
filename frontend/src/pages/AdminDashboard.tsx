import { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../features/auth/context/AuthContext';

const AdminDashboard = () => {
    const { profile } = useAuth();
    const isAdmin = profile?.role === 'ADMIN';

    const [rentals, setRentals] = useState<any>(null);
    const [gateway, setGateway] = useState<any>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const rRes = await api.get('/admin/analytics/rentals');
                setRentals(rRes.data);

                if (isAdmin) {
                    const [gRes, uRes] = await Promise.all([
                        api.get('/admin/analytics/gateway'),
                        api.get('/admin/users')
                    ]);
                    setGateway(gRes.data.summary);
                    setUsers(uRes.data);
                }
            } catch (e: any) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        if (profile) {
            loadData();
        }
    }, [profile, isAdmin]);

    const handleUpdateRole = async (userId: string, newRole: string) => {
        try {
            await api.put(`/admin/users/${userId}/role`, { role: newRole });

            const uRes = await api.get('/admin/users');
            setUsers(uRes.data);
        } catch (e: any) {
            alert(e.response?.data?.error || e.message);
        }
    };

    if (loading) return <div>Loading dashboard...</div>;

    return (
        <div className="page-container">
            <h1 className="text-5xl font-bold mb-12">
                {isAdmin ? 'Admin Dashboard' : 'Provider Analytics'}
            </h1>

            <div className="grid">
            <div className="card">
    <h3>Rental Analytics</h3>
    <p>Total Rentals: <strong>{rentals?.totalRentals || 0}</strong></p>
    <p>Completed: <strong>{rentals?.completedRentals || 0}</strong></p>
    <p>Total Revenue: <strong>${rentals?.totalRevenue || 0}</strong></p>

    {!isAdmin && (
        <div style={{ marginTop: 24 }}>
            <h4 style={{ marginBottom: 12 }}>Your Vehicle Rental Breakdown</h4>

            {rentals?.rentalsByVehicle?.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Vehicle</th>
                                <th>Type</th>
                                <th>Times Rented</th>
                                <th>Completed Rentals</th>
                                <th>Total Revenue</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rentals.rentalsByVehicle.map((vehicle: any) => (
                                <tr key={vehicle.transportId}>
                                    <td>{vehicle.vehicleName}</td>
                                    <td>{vehicle.vehicleType}</td>
                                    <td>{vehicle.rentalCount}</td>
                                    <td>{vehicle.completedRentalCount}</td>
                                    <td>${vehicle.totalRevenue}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p>No rentals found for your vehicles yet.</p>
            )}
        </div>
    )}
</div>

                {isAdmin && (
                    <div className="card">
                        <h3>Gateway Logs</h3>
                        <ul>
                            {gateway?.map((g: any) => (
                                <li key={g.serviceType}>
                                    {g.serviceType}: {g._count.id} accesses
                                </li>
                            ))}
                            {(!gateway || gateway.length === 0) && <li>No logs yet</li>}
                        </ul>
                    </div>
                )}
            </div>

            {isAdmin && (
                <div style={{ marginTop: 40 }}>
                    <h3>User Management</h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Assign Role</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.id}>
                                        <td>{u.firstName} {u.lastName}</td>
                                        <td>{u.email}</td>
                                        <td><strong>{u.role}</strong></td>
                                        <td>
                                            <select
                                                value={u.role}
                                                onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                                            >
                                                <option value="CLIENT">Client</option>
                                                <option value="MOBILITY_PROVIDER">Mobility Provider</option>
                                                <option value="ADMIN">Admin</option>
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;