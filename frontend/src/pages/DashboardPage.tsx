import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../features/auth/context/AuthContext';
import { supabase } from '../lib/supabase';
import api from '../lib/api';

const DashboardPage = () => {
    const { user, profile } = useAuth();
    const [recommendations, setRecommendations] = useState<any[]>([]);
    const [loadingRecommendation, setLoadingRecommendation] = useState(false);

    useEffect(() => {
        const loadRecommendations = async () => {
            if (profile?.preferredMobility && profile?.city) {
                setLoadingRecommendation(true);
                try {
                    // Fetch vehicles matching the user's preferred mobility and ensure they are available
                    const res = await api.get(`/vehicles?type=${profile.preferredMobility}&availability=true`);
                    setRecommendations(res.data);
                } catch (e) {
                    console.error('Failed to load recommendations', e);
                } finally {
                    setLoadingRecommendation(false);
                }
            }
        };

        if (profile) loadRecommendations();
    }, [profile]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    return (
        <div className="page-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Welcome to SUMMS</h2>
                <button onClick={handleLogout} className="del-btn">Logout</button>
            </div>

            <p>Logged in as: {user?.email} ({profile?.role || 'CLIENT'})</p>

            {/* Travel Recommendations Section */}
            {profile?.preferredMobility && profile?.city && (
                <div className="card" style={{ marginTop: '20px', borderLeft: '4px solid #0066cc', background: '#eaf3fc' }}>
                    <h3 style={{ margin: '0 0 10px 0' }}>✨ Personalized Travel Recommendations</h3>
                    {loadingRecommendation ? (
                        <p>Loading your recommendations...</p>
                    ) : recommendations.length > 0 ? (
                        <p>
                            Good news! We found <strong>{recommendations.length} available {profile.preferredMobility.toLowerCase()}s</strong> in <strong>{profile.city}</strong> based on your preferences.
                            <Link to="/vehicles" style={{ marginLeft: '10px' }}>View them now</Link>
                        </p>
                    ) : (
                        <p>Currently, there is no availability for {profile.preferredMobility.toLowerCase()}s in {profile.city}. Try checking other vehicle types.</p>
                    )}
                </div>
            )}

            <div className="grid" style={{ marginTop: 30 }}>
                <div className="card">
                    <h3>Vehicle Rentals</h3>
                    <p>Find nearby bikes, scooters, and cars.</p>
                    <Link to="/vehicles"><button>Search Vehicles</button></Link>
                </div>

                <div className="card">
                    <h3>My Bookings</h3>
                    <p>Manage your active and past rentals.</p>
                    <Link to="/rentals/current"><button>View Rentals</button></Link>
                </div>

                <div className="card">
                    <h3>Parking Spots</h3>
                    <p>Find & reserve parking in the city.</p>
                    <Link to="/parking"><button>Find Parking</button></Link>
                </div>

                <div className="card">
                    <h3>Public Transport</h3>
                    <p>Check schedules for buses, trams & trains.</p>
                    <Link to="/public-transport"><button>View Schedules</button></Link>
                </div>

                <div className="card">
                    <h3>Account Settings</h3>
                    <p>Update your profile and details.</p>
                    <Link to="/account"><button>Settings</button></Link>
                </div>

                {profile?.role === 'ADMIN' && (
                    <div className="card" style={{ border: '2px solid #5a02e8' }}>
                        <h3>Admin Tools</h3>
                        <p>View analytics and manage roles.</p>
                        <Link to="/admin"><button>Admin Dashboard</button></Link>
                    </div>
                )}

                {(profile?.role === 'MOBILITY_PROVIDER' || profile?.role === 'ADMIN') && (
                    <div className="card" style={{ border: '2px solid #00c853' }}>
                        <h3>Provider Tools</h3>
                        <p>Manage fleet and vehicles.</p>
                        <Link to="/provider/vehicles"><button>Provider Dashboard</button></Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DashboardPage;
