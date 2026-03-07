import { useEffect, useState } from 'react';
import api from '../lib/api';

const AdminDashboard = () => {
    const [rentals, setRentals] = useState<any>(null);
    const [gateway, setGateway] = useState<any>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [rRes, gRes, uRes] = await Promise.all([
                    api.get('/admin/analytics/rentals'),
                    api.get('/admin/analytics/gateway'),
                    api.get('/admin/users')
                ]);
                setRentals(rRes.data);
                setGateway(gRes.data.summary);
                setUsers(uRes.data);
            } catch (e: any) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const handleUpdateRole = async (userId: string, newRole: string) => {
        try {
            await api.put(`/admin/users/${userId}/role`, { role: newRole });

            // Re-fetch users to reflect changes
            const uRes = await api.get('/admin/users');
            setUsers(uRes.data);
        } catch (e: any) {
            alert(e.response?.data?.error || e.message);
        }
    };

    if (loading) return <div>Loading dashboard...</div>;

    return (
        <div className="page-container">
            <h2>Admin Dashboard</h2>

            <div className="grid">
                <div className="card">
                    <h3>Rental Analytics</h3>
                    <p>Total Rentals: <strong>{rentals?.totalRentals || 0}</strong></p>
                    <p>Completed: <strong>{rentals?.completedRentals || 0}</strong></p>
                    <p>Total Revenue: <strong>${rentals?.totalRevenue || 0}</strong></p>
                </div>

                <div className="card">
                    <h3>Gateway Logs</h3>
                    <ul>
                        {gateway?.map((g: any) => (
                            <li key={g.serviceType}>{g.serviceType}: {g._count.id} accesses</li>
                        ))}
                        {(!gateway || gateway.length === 0) && <li>No logs yet</li>}
                    </ul>
                </div>
            </div>

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
        </div>
    );
};

export default AdminDashboard;
