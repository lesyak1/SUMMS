import { useEffect, useState } from 'react';
import { Leaf } from 'lucide-react';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
    Tooltip, Legend, CartesianGrid,
    PieChart, Pie, Cell
} from 'recharts';
import api from '../lib/api';
import { useAuth } from '../features/auth/context/useAuth';
import { getErrorMessage } from '../lib/apiError';
import type { GatewaySummaryEntry, RentalsAnalytics } from '../types/analytics';

type AdminUser = {
    email: string;
    firstName: string | null;
    id: string;
    lastName: string | null;
    role: string;
};

const C = {
    teal: '#66897f',
    light: '#acd2cd',
    dark: '#4a6e65',
};

const AdminDashboard = () => {
    const { profile } = useAuth();
    const isAdmin = profile?.role === 'ADMIN';

    const [rentals, setRentals] = useState<RentalsAnalytics | null>(null);
    const [gateway, setGateway] = useState<GatewaySummaryEntry[]>([]);
    const [co2Summary, setCo2Summary] = useState<Record<string, number>>({});
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [rRes, co2Res] = await Promise.all([
                    api.get('/admin/analytics/rentals'),
                    api.get('/bookings/co2-summary')
                ]);
                setRentals(rRes.data as RentalsAnalytics);
                setCo2Summary(co2Res.data as Record<string, number>);

                if (isAdmin) {
                    const [gRes, uRes] = await Promise.all([
                        api.get('/admin/analytics/gateway'),
                        api.get('/admin/users')
                    ]);
                    setGateway((gRes.data.summary || []) as GatewaySummaryEntry[]);
                    setUsers(uRes.data as AdminUser[]);
                }
            } catch (e: unknown) {
                console.error(getErrorMessage(e), e);
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
            setUsers(uRes.data as AdminUser[]);
        } catch (e: unknown) {
            alert(getErrorMessage(e, 'Unable to update the user role.'));
        }
    };

    if (loading) return <div>Loading dashboard...</div>;

    const totalCo2 = co2Summary.total ?? 0;
    const totalTripsWithCo2 = co2Summary.trips ?? 0;
    const carCo2 = co2Summary.car ?? 0;
    const rentalsByVehicle = rentals?.rentalsByVehicle ?? [];
    const co2Heading = isAdmin ? 'Platform CO2 Summary' : 'Fleet CO2 Summary';
    const co2Description = isAdmin
        ? 'Emissions recorded across all completed rentals.'
        : 'Emissions recorded for completed rentals on your vehicles.';

    const vehicleStatusData = (rentals?.requiredMetrics?.vehicleStatusTable || []).map((e) => ({
        type: e.type,
        rented: Number(e.rented || 0),
        available: Number(e.available || 0),
    }));

    type PieEntry = { name: string; value: number; color: string };

    const PIE_PALETTE = [C.teal, C.light, C.dark, '#91aca5', '#c5dbd7', '#b2cec9'];

    const rentalPieData = [
        { name: 'Completed', value: rentals?.summary?.completedRentals || 0, color: C.teal },
        { name: 'Rented', value: Math.max(0, (rentals?.summary?.totalRentals || 0) - (rentals?.summary?.completedRentals || 0)), color: C.light },
    ];

    const gatewayPieData: PieEntry[] = gateway.map((g, i: number) => ({
        name: g.serviceType,
        value: g._count.id,
        color: PIE_PALETTE[i % PIE_PALETTE.length],
    }));

    const rawUsagePerCity = rentals?.requiredMetrics?.usagePerCity || [];
    const hasMontreal = rawUsagePerCity.some((e: { city?: string }) => (e.city || '').toLowerCase() === 'montreal');
    const usagePerCityWithMontreal = hasMontreal
        ? rawUsagePerCity
        : [...rawUsagePerCity, { city: 'Montreal', count: 0 }];

    const cityPieData: PieEntry[] = usagePerCityWithMontreal.map((e, i: number) => ({
        name: e.city,
        value: e.count,
        color: PIE_PALETTE[i % PIE_PALETTE.length],
    }));

    const tooltipStyle = {
        borderRadius: 8,
        border: 'none',
        background: '#fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
    };

    return (
        <div className={`page-container admin-dashboard ${isAdmin ? 'is-admin' : 'is-provider-analytics'}`}>
            <h1 className="text-5xl font-bold mb-12">
                {isAdmin ? 'Admin Dashboard' : 'Provider Analytics'}
            </h1>

            <div className="analytics-top-row">
                <div className="card analytics-summary-card">
                    <h3>Rental Analytics Summary</h3>
                    <div className="analytics-kpi-row">
                        <div className="analytics-kpi">
                            <span className="analytics-kpi-value">{rentals?.summary?.totalRentals || 0}</span>
                            <span className="analytics-kpi-label">Total</span>
                        </div>
                        <div className="analytics-kpi">
                            <span className="analytics-kpi-value">{rentals?.summary?.completedRentals || 0}</span>
                            <span className="analytics-kpi-label">Completed</span>
                        </div>
                        <div className="analytics-kpi analytics-kpi-accent">
                            <span className="analytics-kpi-value">${rentals?.summary?.totalRevenue || 0}</span>
                            <span className="analytics-kpi-label">Revenue</span>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={140}>
                        <PieChart>
                            <Pie data={rentalPieData} cx="50%" cy="50%" outerRadius={55} dataKey="value"
                                label={({ percent = 0 }) => percent > 0.08 ? `${(percent * 100).toFixed(0)}%` : ''}
                                labelLine={false}
                            >
                                {rentalPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                            </Pie>
                            <Tooltip contentStyle={tooltipStyle} />
                            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="card analytics-vehicle-status-card">
                    <h3>Vehicle Status</h3>
                    <p className="analytics-sub-note">
                        Today's trips: <strong>{rentals?.requiredMetrics?.tripsCompletedToday || 0}</strong>
                        &nbsp;·&nbsp;Top option: <strong>{rentals?.requiredMetrics?.mostUsedMobilityOption || 'N/A'}</strong>
                    </p>
                    <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={vehicleStatusData} barSize={20} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8eded" />
                            <XAxis dataKey="type" tick={{ fill: '#4a5a62', fontSize: 12 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#4a5a62', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip contentStyle={tooltipStyle} />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Bar dataKey="rented" name="Rented" fill={C.teal} minPointSize={4} radius={[5, 5, 0, 0]} />
                            <Bar dataKey="available" name="Available" fill={C.light} minPointSize={4} radius={[5, 5, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {isAdmin && (
                    <div className="card analytics-gateway-card">
                        <h3>Gateway Logs</h3>
                        {gatewayPieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={210}>
                                <PieChart>
                                    <Pie data={gatewayPieData} cx="50%" cy="50%" outerRadius={68} dataKey="value"
                                        label={({ percent = 0 }) => percent > 0.08 ? `${(percent * 100).toFixed(0)}%` : ''}
                                        labelLine={false}
                                    >
                                        {gatewayPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                    </Pie>
                                    <Tooltip contentStyle={tooltipStyle} />
                                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <p style={{ marginTop: 16 }}>No gateway logs yet.</p>
                        )}
                    </div>
                )}
            </div>

            <div className={`card analytics-co2-card ${isAdmin ? 'platform-co2-card' : ''}`.trim()} style={{ marginTop: 32 }}>
                <div className="analytics-co2-header">
                    <div>
                        <h3>{co2Heading}</h3>
                        <p className="analytics-co2-description">{co2Description}</p>
                    </div>
                    <Leaf size={30} color="white" strokeWidth={1.5} aria-hidden="true" />
                </div>
                <div className="analytics-co2-grid" style={{ marginTop: 16 }}>
                    <div className="analytics-co2-stat">
                        <p className="analytics-co2-label">Completed Trips Tracked</p>
                        <p className="analytics-co2-value">{totalTripsWithCo2}</p>
                    </div>
                    <div className="analytics-co2-stat analytics-co2-stat-primary">
                        <p className="analytics-co2-label">Total CO2 Recorded</p>
                        <p className="analytics-co2-value">{totalCo2.toFixed(2)} kg</p>
                    </div>
                    <div className="analytics-co2-stat">
                        <p className="analytics-co2-label">Cars</p>
                        <p className="analytics-co2-value">{carCo2.toFixed(2)} kg</p>
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

            <div className="card analytics-city-card" style={{ marginTop: 32 }}>
                <h3>Usage Per City</h3>
                {cityPieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={320}>
                        <PieChart>
                            <Pie data={cityPieData} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                                label={({ name = '' }) => `${name}`}
                                labelLine={true}
                            >
                                {cityPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                            </Pie>
                            <Tooltip contentStyle={tooltipStyle} />
                            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <p style={{ marginTop: 16 }}>No usage data available.</p>
                )}
            </div>

            {!isAdmin && (
                <div className="card analytics-vehicles-card" style={{ marginTop: 32 }}>
                    <h3>Your Vehicle Rental Breakdown</h3>

                    {rentalsByVehicle.length > 0 ? (
                        <div style={{ overflowX: 'auto', marginTop: 16 }}>
                            <table className="data-table" style={{ minWidth: '700px' }}>
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
                                    {rentalsByVehicle.map((vehicle) => (
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
                        <p style={{ marginTop: 16 }}>No rentals found for your vehicles yet.</p>
                    )}
                </div>
            )}

            {isAdmin && (
                <div className="card analytics-users-card" style={{ marginTop: 40 }}>
                    <h3 style={{ fontSize: '28px', fontWeight: '700' }}>User Management</h3>
                    <p style={{ marginBottom: 16 }}>
                        Number of registered users: <strong>{users.length}</strong>
                    </p>
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
