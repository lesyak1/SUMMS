import { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../features/auth/context/AuthContext';

type ProviderOption = {
    id: string;
    name: string;
};

const ProviderDashboard = () => {
    const { profile } = useAuth();
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [providers, setProviders] = useState<ProviderOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [providerCompanyName, setProviderCompanyName] = useState('');
    const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
    const [editVehicle, setEditVehicle] = useState({
        costPerMinute: 0,
        availability: true,
        model: ''
    });

    const [newVehicle, setNewVehicle] = useState({
        providerId: '',
        costPerMinute: 0,
        type: 'CAR',
        model: ''
    });
    const mobilityProviderMissingCompany = profile?.role === 'MOBILITY_PROVIDER' && !providerCompanyName.trim();

    const getProviderCompanyStorageKey = (userId: string) => `summs_provider_company_${userId}`;

    const fetchData = async () => {
        try {
            const pRes = await api.get('/provider/profiles');
            setProviders(pRes.data);

            if (profile?.role === 'MOBILITY_PROVIDER') {
                const companyName = localStorage.getItem(getProviderCompanyStorageKey(profile.id)) || '';
                setProviderCompanyName(companyName);

                if (!companyName.trim()) {
                    setNewVehicle(prev => ({ ...prev, providerId: '' }));
                    const vRes = await api.get('/provider/vehicles');
                    setVehicles(vRes.data);
                    return;
                }

                const providerSyncRes = await api.post('/provider/profiles', { name: companyName.trim() });
                const syncedProvider = providerSyncRes.data as ProviderOption;
                setNewVehicle(prev => ({ ...prev, providerId: syncedProvider.id }));

                const vRes = await api.get('/provider/vehicles');
                setVehicles(vRes.data);
                return;
            }

            if (pRes.data.length > 0) {
                setNewVehicle(prev => ({ ...prev, providerId: pRes.data[0].id }));
            }

            const vRes = await api.get('/provider/vehicles');
            setVehicles(vRes.data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newVehicle.providerId) {
            alert('Select a valid mobility provider company before adding a vehicle.');
            return;
        }
        try {
            await api.post('/provider/vehicles', newVehicle);
            setNewVehicle({ ...newVehicle, costPerMinute: 0, model: '' });
            fetchData();
        } catch (e: any) {
            alert(e.response?.data?.error || e.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Remove this vehicle?')) return;
        try {
            await api.delete(`/provider/vehicles/${id}`);
            fetchData();
        } catch (e: any) {
            alert(e.response?.data?.error || e.message);
        }
    };

    const startEdit = (vehicle: any) => {
        setEditingVehicleId(vehicle.id);
        setEditVehicle({
            costPerMinute: vehicle.costPerMinute,
            availability: vehicle.availability,
            model: vehicle.car?.model || ''
        });
    };

    const cancelEdit = () => {
        setEditingVehicleId(null);
        setEditVehicle({ costPerMinute: 0, availability: true, model: '' });
    };

    const handleUpdate = async (id: string, hasCarModel: boolean) => {
        try {
            const payload: any = {
                costPerMinute: editVehicle.costPerMinute,
                availability: editVehicle.availability
            };

            if (hasCarModel) {
                payload.model = editVehicle.model;
            }

            await api.put(`/provider/vehicles/${id}`, payload);
            cancelEdit();
            fetchData();
        } catch (e: any) {
            alert(e.response?.data?.error || e.message);
        }
    };

    if (loading) return <div>Loading provider dashboard...</div>;

    return (
        <div className="page-container">
            <h1 className="text-5xl font-bold mb-12">Provider Dashboard</h1>

            {error && <p className="error">{error}</p>}

            <form onSubmit={handleAdd} className="form-card" style={{ marginBottom: 30 }}>
                <h3>Add New Vehicle</h3>
                <div className="input-group">
                    <label>Mobility Provider Company</label>
                    {profile?.role === 'ADMIN' ? (
                        <select value={newVehicle.providerId} onChange={e => setNewVehicle({ ...newVehicle, providerId: e.target.value })} required>
                            {providers.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    ) : (
                        <input
                            value={providerCompanyName}
                            readOnly
                            style={{
                                color: '#6c757d',
                                backgroundColor: '#f8f9fa',
                                borderColor: '#ced4da'
                            }}
                        />
                    )}
                </div>
                {mobilityProviderMissingCompany && (
                    <p style={{ color: '#6c757d', marginTop: -4 }}>
                        Enter your company name in Account Settings to add vehicles.
                    </p>
                )}
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
                <button type="submit" disabled={mobilityProviderMissingCompany}>Add Vehicle</button>
            </form>

            <h3>Vehicles List</h3>
            <table className="data-table">
                <thead>
                    <tr>
                        <th>ID / Model</th>
                        <th>Mobility Provider Company</th>
                        <th>Pricing</th>
                        <th>Availability</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {vehicles.map(v => (
                        <tr key={v.id}>
                            <td>{v.car?.model || (v.bike ? 'Bike' : 'Scooter')}</td>
                            <td>{v.provider?.name || '-'}</td>
                            <td>
                                {editingVehicleId === v.id ? (
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editVehicle.costPerMinute}
                                        onChange={e => setEditVehicle({ ...editVehicle, costPerMinute: parseFloat(e.target.value) })}
                                    />
                                ) : (
                                    <>${v.costPerMinute}/min</>
                                )}
                            </td>
                            <td>
                                {editingVehicleId === v.id ? (
                                    <select
                                        value={String(editVehicle.availability)}
                                        onChange={e => setEditVehicle({ ...editVehicle, availability: e.target.value === 'true' })}
                                    >
                                        <option value="true">Yes</option>
                                        <option value="false">No</option>
                                    </select>
                                ) : (
                                    <>{v.availability ? 'Yes' : 'No'}</>
                                )}
                            </td>
                            <td>
                                {editingVehicleId === v.id ? (
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        {v.car && (
                                            <input
                                                placeholder="Car model"
                                                value={editVehicle.model}
                                                onChange={e => setEditVehicle({ ...editVehicle, model: e.target.value })}
                                            />
                                        )}
                                        <button className="success-btn" onClick={() => handleUpdate(v.id, !!v.car)}>Update</button>
                                        <button onClick={cancelEdit}>Cancel</button>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button onClick={() => startEdit(v)}>Edit</button>
                                        <button className="del-btn" onClick={() => handleDelete(v.id)}>Remove</button>
                                    </div>
                                )}
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
