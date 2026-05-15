import { useCallback, useEffect, useState } from 'react';
import { Leaf } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../features/auth/context/useAuth';
import { supabase } from '../lib/supabase';
import { getErrorMessage } from '../lib/apiError';
import type { VehicleWithMedia } from '../components/vehicles/vehicleMedia.shared';
import { getAvailability } from '../util/availability';

type ProviderVehicle = VehicleWithMedia & {
    availability: boolean;
    costPerMinute: number;
    id: string;
    provider?: ProviderOption | null;
    availableFrom: string;
    availableTo: string;
};

type VehicleFormState = {
    costPerMinute: number;
    model: string;
    imageUrl: string;
    availableFrom: string;
    availableTo: string;
    availability: boolean;
};

type NewVehicleFormState = {
    costPerMinute: number;
    fuelType: string;
    imageUrl: string;
    model: string;
    providerId: string;
    type: 'BIKE' | 'CAR' | 'SCOOTER';
    availableFrom: string;
    availableTo: string;
};

type ProviderOption = {
    id: string;
    name: string;
};

const ProviderDashboard = () => {
    const { profile } = useAuth();
    const vehicleImageBucket = import.meta.env.VITE_SUPABASE_VEHICLE_IMAGE_BUCKET || 'vehicle-images';
    const [vehicles, setVehicles] = useState<ProviderVehicle[]>([]);
    const [providers, setProviders] = useState<ProviderOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [providerCompanyName, setProviderCompanyName] = useState('');
    const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
    const now = new Date();
    const tomorrow = new Date(Date.now() + 86400000);

    const formatDate = (d: Date) => d.toISOString().slice(0, 16);

    const [editVehicle, setEditVehicle] = useState<VehicleFormState>({
        costPerMinute: 0,
        model: '',
        imageUrl: '',
        availableFrom: formatDate(now),
        availableTo: formatDate(tomorrow),
        availability: true
    });

    const [newVehicle, setNewVehicle] = useState<NewVehicleFormState>({
        providerId: '',
        costPerMinute: 0,
        type: 'CAR',
        model: '',
        fuelType: 'petrol',
        imageUrl: '',
        availableFrom: formatDate(now),
        availableTo: formatDate(tomorrow)
    });
    const [co2Summary, setCo2Summary] = useState<Record<string, number>>({});
    const [uploadingImage, setUploadingImage] = useState(false);
    const mobilityProviderMissingCompany = profile?.role === 'MOBILITY_PROVIDER' && !providerCompanyName.trim();
    const totalCo2Kg = co2Summary.total ?? 0;
    const trackedTrips = co2Summary.trips ?? 0;
    const carCo2Kg = co2Summary.car ?? 0;

    const co2Heading = profile?.role === 'ADMIN' ? 'Platform CO2 Snapshot' : 'Fleet CO2 Snapshot';
    const co2Description = profile?.role === 'ADMIN'
        ? 'Completed-trip emissions across the platform.'
        : 'Completed-trip emissions across your vehicles.';

    const getProviderCompanyStorageKey = (userId: string) => `summs_provider_company_${userId}`;

    const fetchData = useCallback(async () => {
        try {
            const pRes = await api.get('/provider/profiles');
            const providerOptions = pRes.data as ProviderOption[];
            setProviders(providerOptions);

            if (profile?.role === 'MOBILITY_PROVIDER') {
                const companyName = localStorage.getItem(getProviderCompanyStorageKey(profile.id)) || '';
                setProviderCompanyName(companyName);

                if (!companyName.trim()) {
                    setNewVehicle(prev => ({ ...prev, providerId: '' }));
                    const [vRes, co2Res] = await Promise.all([
                        api.get('/provider/vehicles'),
                        api.get('/bookings/co2-summary')
                    ]);
                    setVehicles(vRes.data as ProviderVehicle[]);
                    setCo2Summary(co2Res.data as Record<string, number>);
                    return;
                }

                const providerSyncRes = await api.post('/provider/profiles', { name: companyName.trim() });
                const syncedProvider = providerSyncRes.data as ProviderOption;
                setNewVehicle(prev => ({ ...prev, providerId: syncedProvider.id }));

                const [vRes, co2Res] = await Promise.all([
                    api.get('/provider/vehicles'),
                    api.get('/bookings/co2-summary')
                ]);
                setVehicles(vRes.data as ProviderVehicle[]);
                setCo2Summary(co2Res.data as Record<string, number>);

                return;
            }

            if (providerOptions.length > 0) {
                setNewVehicle(prev => ({ ...prev, providerId: providerOptions[0].id }));
            }

            const [vRes, co2Res] = await Promise.all([
                api.get('/provider/vehicles'),
                api.get('/bookings/co2-summary')
            ]);
            setVehicles(vRes.data as ProviderVehicle[]);
            setCo2Summary(co2Res.data as Record<string, number>);
        } catch (e: unknown) {
            setError(getErrorMessage(e, 'Unable to load provider data.'));
        } finally {
            setLoading(false);
        }
    }, [profile]);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newVehicle.providerId) {
            alert('Select a valid mobility provider company before adding a vehicle.');
            return;
        }

        if (new Date(newVehicle.availableFrom) >= new Date(newVehicle.availableTo)) {
            alert("Available To must be after Available From");
            return;
        }

        try {
            const payload = {
                ...newVehicle,
                availableFrom: new Date(newVehicle.availableFrom),
                availableTo: new Date(newVehicle.availableTo),
                imageUrl: newVehicle.imageUrl.trim() || undefined
            };

            await api.post('/provider/vehicles', payload);

            setNewVehicle({
                ...newVehicle,
                costPerMinute: 0,
                model: '',
                imageUrl: '',
                availableFrom: formatDate(new Date()),
                availableTo: formatDate(new Date(Date.now() + 86400000))
            });

            await fetchData();
        } catch (e: unknown) {
            alert(getErrorMessage(e, 'Unable to add the vehicle.'));
        }
    };
    const handleDelete = async (id: string) => {
        if (!window.confirm('Remove this vehicle?')) return;
        try {
            await api.delete(`/provider/vehicles/${id}`);
            await fetchData();
        } catch (e: unknown) {
            alert(getErrorMessage(e, 'Unable to remove the vehicle.'));
        }
    };

    const uploadVehicleImageFile = async (file: File): Promise<string> => {
        const fileExt = file.name.includes('.') ? file.name.split('.').pop() : 'jpg';
        const safeFileExt = (fileExt || 'jpg').toLowerCase();
        const ownerId = profile?.id || 'provider';
        const filePath = `providers/${ownerId}/${crypto.randomUUID()}.${safeFileExt}`;

        const { error: uploadError } = await supabase.storage
            .from(vehicleImageBucket)
            .upload(filePath, file, { upsert: false });

        if (uploadError) {
            throw uploadError;
        }

        const { data } = supabase.storage
            .from(vehicleImageBucket)
            .getPublicUrl(filePath);

        if (!data.publicUrl) {
            throw new Error('Unable to generate image URL after upload');
        }

        return data.publicUrl;
    };

    const handleCreateImageUpload = async (file: File) => {
        try {
            setUploadingImage(true);
            const publicUrl = await uploadVehicleImageFile(file);
            setNewVehicle(prev => ({ ...prev, imageUrl: publicUrl }));
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'Image upload failed';
            alert(`Failed to upload image: ${message}`);
        } finally {
            setUploadingImage(false);
        }
    };

    const startEdit = (vehicle: ProviderVehicle) => {
        setEditingVehicleId(vehicle.id);

        setEditVehicle({
            costPerMinute: vehicle.costPerMinute,
            model: vehicle.car?.model || '',
            imageUrl: vehicle.car?.imageUrl || vehicle.bike?.imageUrl || vehicle.scooter?.imageUrl || '',
            availableFrom: vehicle.availableFrom
                ? new Date(vehicle.availableFrom).toISOString().slice(0, 16)
                : formatDate(new Date()),
            availableTo: vehicle.availableTo
                ? new Date(vehicle.availableTo).toISOString().slice(0, 16)
                : formatDate(new Date(Date.now() + 86400000)),
            availability: vehicle.availability
        });
    };

    const cancelEdit = () => {
        setEditingVehicleId(null);
        setEditVehicle({ costPerMinute: 0, availability: true, model: '', imageUrl: '', availableFrom: formatDate(now), availableTo: formatDate(tomorrow) });
    };


    type UpdateVehiclePayload = {
        costPerMinute?: number;
        imageUrl?: string;
        availableFrom?: Date;
        availableTo?: Date;
        model?: string;
    };

    const handleUpdate = async (id: string, hasCarModel: boolean) => {
        try {
            if (new Date(editVehicle.availableFrom) >= new Date(editVehicle.availableTo)) {
                alert("Available To must be after Available From");
                return;
            }

            const payload: UpdateVehiclePayload = {
                costPerMinute: editVehicle.costPerMinute,
                imageUrl: editVehicle.imageUrl,
                availableFrom: new Date(editVehicle.availableFrom),
                availableTo: new Date(editVehicle.availableTo)
            };

            if (hasCarModel) {
                payload.model = editVehicle.model;
            }

            await api.put(`/provider/vehicles/${id}`, payload);

            cancelEdit();
            await fetchData();
        } catch (e: unknown) {
            alert(getErrorMessage(e, 'Unable to update the vehicle.'));
        }
    };

    if (loading) return <div>Loading provider dashboard...</div>;

    return (
        <div className="provider-dashboard-container">
            <h1 className="text-5xl font-bold mb-12">Provider Dashboard</h1>

            {error && <p className="error">{error}</p>}

            <div className="card analytics-co2-card provider-co2-card">
                <div className="analytics-co2-header">
                    <div>
                        <h3>{co2Heading}</h3>
                        <p className="analytics-co2-description">{co2Description}</p>
                    </div>
                    <Leaf size={30} color="white" strokeWidth={1.5} aria-hidden="true" />
                </div>
                <div className="analytics-co2-grid">
                    <div className="analytics-co2-stat">
                        <p className="analytics-co2-label">Completed Trips Tracked</p>
                        <p className="analytics-co2-value">{trackedTrips}</p>
                    </div>
                    <div className="analytics-co2-stat analytics-co2-stat-primary">
                        <p className="analytics-co2-label">Total CO2 Recorded</p>
                        <p className="analytics-co2-value">{totalCo2Kg.toFixed(2)} kg</p>
                    </div>
                    <div className="analytics-co2-stat">
                        <p className="analytics-co2-label">Cars</p>
                        <p className="analytics-co2-value">{carCo2Kg.toFixed(2)} kg</p>
                    </div>
                    <div className="analytics-co2-stat">
                        <p className="analytics-co2-label">Bikes</p>
                        <p className="analytics-co2-value" style={{ fontSize: '0.9rem' }}>Zero Emission</p>
                    </div>
                    <div className="analytics-co2-stat">
                        <p className="analytics-co2-label">Scooters</p>
                        <p className="analytics-co2-value" style={{ fontSize: '0.9rem' }}>Zero Emission</p>
                    </div>
                </div>
            </div>

            <div className="provider-dashboard-layout">
                <form onSubmit={handleAdd} className="form-card provider-form-card">
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
                        <select
                            value={newVehicle.type}
                            onChange={e => {
                                const nextType = e.target.value as NewVehicleFormState['type'];
                                setNewVehicle({
                                    ...newVehicle,
                                    type: nextType,
                                    fuelType: nextType === 'CAR' ? newVehicle.fuelType : 'electric'
                                });
                            }}
                        >
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
                    {newVehicle.type === 'CAR' && (
                        <div className="input-group">
                            <label>Fuel Type</label>
                            <select value={newVehicle.fuelType} onChange={e => setNewVehicle({ ...newVehicle, fuelType: e.target.value })}>
                                <option value="petrol">Petrol</option>
                                <option value="diesel">Diesel</option>
                                <option value="electric">Electric</option>
                            </select>
                        </div>
                    )}
                    <div className="input-group">
                        <label>Cost per Minute ($)</label>
                        <input type="number" step="0.01" value={newVehicle.costPerMinute} onChange={e => setNewVehicle({ ...newVehicle, costPerMinute: parseFloat(e.target.value) })} required />
                    </div>
                    <div className="input-group">
                        <label>Available From</label>
                        <input
                            type="datetime-local"
                            value={newVehicle.availableFrom}
                            onChange={e => setNewVehicle({ ...newVehicle, availableFrom: e.target.value })}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label>Available To</label>
                        <input
                            type="datetime-local"
                            value={newVehicle.availableTo}
                            onChange={e => setNewVehicle({ ...newVehicle, availableTo: e.target.value })}
                            required
                        />
                    </div>
                    <div className="input-group">
                        <label>Image URL (optional)</label>
                        <input
                            type="text"
                            placeholder="https://example.com/vehicle.jpg"
                            value={newVehicle.imageUrl}
                            onChange={e => setNewVehicle({ ...newVehicle, imageUrl: e.target.value })}
                        />
                    </div>
                    <div className="input-group">
                        <label>Or upload from computer (optional)</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    void handleCreateImageUpload(file);
                                }
                                e.currentTarget.value = '';
                            }}
                            disabled={uploadingImage}
                        />
                        {uploadingImage && <small>Uploading image...</small>}
                    </div>
                    <button type="submit" disabled={mobilityProviderMissingCompany}>Add Vehicle</button>
                </form>

                <div className="provider-vehicle-list-card">
                    <h3>Vehicles List</h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table" style={{ minWidth: '760px' }}>
                            <thead>
                                <tr>
                                    <th>ID / Model</th>
                                    <th>Mobility Provider Company</th>
                                    <th>Pricing</th>
                                    <th>Available From</th>
                                    <th>Available To</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                        {vehicles.map(v => {
                            const availability = getAvailability(v.availableFrom, v.availableTo);

                            const formatDateTime = (value: string) =>
                                new Date(value).toLocaleString([], {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                });

                            return (
                                <tr key={v.id}>
                                    <td>{v.car?.model || (v.bike ? 'Bike' : 'Scooter')}</td>
                                    <td>{v.provider?.name || '-'}</td>

                                    <td>
                                        {editingVehicleId === v.id ? (
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={editVehicle.costPerMinute}
                                                onChange={e =>
                                                    setEditVehicle({
                                                        ...editVehicle,
                                                        costPerMinute: parseFloat(e.target.value)
                                                    })
                                                }
                                            />
                                        ) : (
                                            <>${v.costPerMinute}/min</>
                                        )}
                                    </td>

                                    <td>
                                        {editingVehicleId === v.id ? (
                                            <input
                                                type="datetime-local"
                                                value={editVehicle.availableFrom}
                                                onChange={e =>
                                                    setEditVehicle({
                                                        ...editVehicle,
                                                        availableFrom: e.target.value
                                                    })
                                                }
                                            />
                                        ) : (
                                            <>{formatDateTime(v.availableFrom)}</>
                                        )}
                                    </td>

                                    <td>
                                        {editingVehicleId === v.id ? (
                                            <input
                                                type="datetime-local"
                                                value={editVehicle.availableTo}
                                                onChange={e =>
                                                    setEditVehicle({
                                                        ...editVehicle,
                                                        availableTo: e.target.value
                                                    })
                                                }
                                            />
                                        ) : (
                                            <>{formatDateTime(v.availableTo)}</>
                                        )}
                                    </td>

                                    <td>
                                        {editingVehicleId === v.id ? (
                                            <span style={{ color: '#6c757d' }}>
                                                Status updates from date range
                                            </span>
                                        ) : (
                                            <span
                                                style={{
                                                    color:
                                                        availability.status === 'AVAILABLE'
                                                            ? 'green'
                                                            : availability.status === 'UPCOMING'
                                                                ? '#b58900'
                                                                : '#b02a37',
                                                    fontWeight: 500
                                                }}
                                            >
                                                {availability.text}
                                            </span>
                                        )}
                                    </td>

                                    <td>
                                        {editingVehicleId === v.id ? (
                                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                {v.car && (
                                                    <input
                                                        placeholder="Car model"
                                                        value={editVehicle.model}
                                                        onChange={e =>
                                                            setEditVehicle({
                                                                ...editVehicle,
                                                                model: e.target.value
                                                            })
                                                        }
                                                    />
                                                )}

                                                <button
                                                    type="button"
                                                    className="success-btn"
                                                    onClick={() => handleUpdate(v.id, !!v.car)}
                                                >
                                                    Update
                                                </button>

                                                <button type="button" onClick={cancelEdit}>
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button type="button" onClick={() => startEdit(v)}>
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    className="del-btn"
                                                    onClick={() => handleDelete(v.id)}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}

                                {vehicles.length === 0 && (
                                    <tr>
                                        <td colSpan={7}>No vehicles.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProviderDashboard;
