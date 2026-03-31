import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../features/auth/context/AuthContext';
import { supabase } from '../lib/supabase';
import api from '../lib/api';
import Button from '../components/ui/Button/Button';

const DashboardPage = () => {
    const { user, profile, recommendations, loadingRecommendation } = useAuth();


    return (
        <div className="page-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 className="text-5xl font-bold mb-12">Welcome To SUMMS</h1>
            </div>

            <p>Logged in as: {user?.email} ({profile?.role || 'CLIENT'})</p>

            {/* Travel Recommendations Section */}
            {profile?.preferredMobility && profile?.city && (
                <div className="card" style={{ marginTop: '20px', borderLeft: '4px solid #0066cc', background: '#eaf3fc' }}>
                    <h3 style={{ margin: '0 0 10px 0' }}>✨ Personalized Travel Recommendations</h3>
                    {loadingRecommendation ? (
                        <p>Loading your recommendations...</p>
                    ) : recommendations.length > 0 ? (
                        <div className="flex-col">
                            <p>
                                Good news! We found <strong>{recommendations.length} available {profile.preferredMobility.toLowerCase()}s</strong> in <strong>{profile.city}</strong> based on your preferences.
                            </p>
                            <Button style={{ marginTop: 20 }}>
                                <Link to="/vehicles">View them now</Link>
                            </Button>
                        </div>
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

                {profile?.role === 'MOBILITY_PROVIDER' && (
                    <div className="card" style={{ border: '2px solid #5a02e8' }}>
                        <h3>Provider Analytics</h3>
                        <p>View analytics for your own vehicles.</p>
                        <Link to="/admin/analytics"><button>View Analytics</button></Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DashboardPage;
