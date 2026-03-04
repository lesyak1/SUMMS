import { useEffect, useState } from 'react';
import api from '../lib/api';

const AdminDashboard = () => {
    const [rentals, setRentals] = useState<any>(null);
    const [gateway, setGateway] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [roleUpdate, setRoleUpdate] = useState({ userId: '', role: 'CLIENT' });

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const [rRes, gRes] = await Promise.all([
                    api.get('/admin/analytics/rentals'),
                    api.get('/admin/analytics/gateway')
                ]);
                setRentals(rRes.data);
                setGateway(gRes.data.summary);
            } catch (e: any) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, []);

    const handleUpdateRole = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.put(`/admin/users/${roleUpdate.userId}/role`, { role: roleUpdate.role });
            alert('Role updated successfully');
            setRoleUpdate({ userId: '', role: 'CLIENT' });
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

            <form onSubmit={handleUpdateRole} className="form-card" style={{ marginTop: 30 }}>
                <h3>Manage Roles</h3>
                <div className="input-group">
                    <label>User ID</label>
                    <input value={roleUpdate.userId} onChange={e => setRoleUpdate({ ...roleUpdate, userId: e.target.value })} required />
                </div>
                <div className="input-group">
                    <label>New Role</label>
                    <select value={roleUpdate.role} onChange={e => setRoleUpdate({ ...roleUpdate, role: e.target.value })}>
                        <option value="CLIENT">Client</option>
                        <option value="MOBILITY_PROVIDER">Mobility Provider</option>
                        <option value="ADMIN">Admin</option>
                    </select>
                </div>
                <button type="submit">Update Role</button>
            </form>
        </div>
    );
};

export default AdminDashboard;
