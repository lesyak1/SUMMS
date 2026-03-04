import { Link } from 'react-router-dom';
import { useAuth } from '../features/auth/context/AuthContext';
import { supabase } from '../lib/supabase';

const DashboardPage = () => {
    const { user, profile } = useAuth();

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
