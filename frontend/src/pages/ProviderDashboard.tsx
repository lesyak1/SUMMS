import { useEffect, useState } from 'react';
import api from '../lib/api';

const ProviderDashboard = () => {
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [newVehicle, setNewVehicle] = useState({
        providerId: 'e2a874b2-abcd-1234-abcd-9876543210ab', // Should come from profile or be dynamic, but since we manually seed, we'll ask user to input their provider ID for simplicity, or we default it.
        costPerMinute: 0,
        type: 'CAR',
        model: ''
    });

    const fetchVehicles = async () => {
        try {
            // Typically a provider only sees their own vehicles.
            // Since our search is public, let's just fetch all and let provider edit/delete.
            // In a real app we'd filter by providerId.
            const res = await api.get('/vehicles');
            setVehicles(res.data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVehicles();
    }, []);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/provider/vehicles', newVehicle);
            setNewVehicle({ ...newVehicle, costPerMinute: 0, model: '' });
            fetchVehicles();
        } catch (e: any) {
            alert(e.response?.data?.error || e.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Remove this vehicle?')) return;
        try {
            await api.delete(`/provider/vehicles/${id}`);
            fetchVehicles();
        } catch (e: any) {
            alert(e.response?.data?.error || e.message);
        }
    };

    if (loading) return <div>Loading provider dashboard...</div>;

    return (
        <div className="page-container">
            <h2>Provider Dashboard</h2>
            {error && <p className="error">{error}</p>}

            <form onSubmit={handleAdd} className="form-card" style={{ marginBottom: 30 }}>
                <h3>Add New Vehicle</h3>
                <div className="input-group">
                    <label>Provider ID (UUID)</label>
                    <input value={newVehicle.providerId} onChange={e => setNewVehicle({ ...newVehicle, providerId: e.target.value })} required />
                </div>
                <div className="input-group">
                    <label>Type</label>
                    <select value={newVehicle.type} onChange={e => setNewVehicle({ ...newVehicle, type: e.target.value })}>
                        <option value="CAR">Car</option>
                        <option value="BIKE">Bike</option>
                        <option value="SCOOTER">Scooter</option>
                    </select>
                </div>
                {newVehicle.type === 'CAR' && (
                    <div className="input-group">
                        <label>Model</label>
                        <input value={newVehicle.model} onChange={e => setNewVehicle({ ...newVehicle, model: e.target.value })} required />
                    </div>
                )}
                <div className="input-group">
                    <label>Cost per Minute ($)</label>
                    <input type="number" step="0.01" value={newVehicle.costPerMinute} onChange={e => setNewVehicle({ ...newVehicle, costPerMinute: parseFloat(e.target.value) })} required />
                </div>
                <button type="submit">Add Vehicle</button>
            </form>

            <h3>Vehicles List</h3>
            <table className="data-table">
                <thead>
                    <tr>
                        <th>ID / Model</th>
                        <th>Pricing</th>
                        <th>Availability</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {vehicles.map(v => (
                        <tr key={v.id}>
                            <td>{v.car?.model || (v.bike ? 'Bike' : 'Scooter')}</td>
                            <td>${v.costPerMinute}/min</td>
                            <td>{v.availability ? 'Yes' : 'No'}</td>
                            <td>
                                <button className="del-btn" onClick={() => handleDelete(v.id)}>Remove</button>
                            </td>
                        </tr>
                    ))}
                    {vehicles.length === 0 && <tr><td colSpan={4}>No vehicles.</td></tr>}
                </tbody>
            </table>
        </div>
    );
};

export default ProviderDashboard;
