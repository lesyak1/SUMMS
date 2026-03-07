import { useEffect, useState } from 'react';
import { useAuth } from '../features/auth/context/AuthContext';
import api from '../lib/api';

const AccountPage = () => {
    const { profile } = useAuth();
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        username: '',
        city: '',
        preferredMobility: 'CAR'
    });
    const [msg, setMsg] = useState('');

    useEffect(() => {
        if (profile) {
            setFormData({
                firstName: profile.firstName || '',
                lastName: profile.lastName || '',
                username: profile.username || '',
                city: profile.city || '',
                preferredMobility: profile.preferredMobility || 'CAR'
            });
        }
    }, [profile]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.put('/me', formData);
            setMsg('Profile updated successfully!');
            // To completely refresh, we could trigger a context reload or simply reload page for now
            setTimeout(() => window.location.reload(), 1000);
        } catch (err: any) {
            setMsg(`Failed to map update: ${err.message}`);
        }
    }

    if (!profile) return <div>Loading account...</div>;

    return (
        <div className="page-container">
            <h2>Account Settings</h2>
            <p>Role: <strong>{profile.role}</strong></p>
            <p>Email: {profile.email}</p>

            {msg && <p className="status-msg">{msg}</p>}

            <form onSubmit={handleSave} className="form-card">
                <div>
                    <label>First Name</label><br />
                    <input value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} />
                </div>
                <div>
                    <label>Last Name</label><br />
                    <input value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} />
                </div>
                <div>
                    <label>Username</label><br />
                    <input value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} />
                </div>
                <div>
                    <label>City</label><br />
                    <input value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} />
                </div>
                <div>
                    <label>Preferred Mobility</label><br />
                    <select value={formData.preferredMobility} onChange={e => setFormData({ ...formData, preferredMobility: e.target.value })}>
                        <option value="CAR">Car</option>
                        <option value="BIKE">Bike</option>
                        <option value="SCOOTER">Scooter</option>
                    </select>
                </div>
                <button type="submit" style={{ marginTop: 10 }}>Save Profile</button>
            </form>
        </div>
    )
}

export default AccountPage;
