import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BusFront, CalendarCheck2, CarFront, SquareParking, UserRound } from 'lucide-react';
import { useAuth } from '../features/auth/context/useAuth';
import Button from '../components/ui/Button/Button';
import api from '../lib/api';
import type { RentalsAnalytics } from '../types/analytics';

const DashboardPage = () => {
    const { profile, recommendations, loadingRecommendation } = useAuth();
    const [providerAnalytics, setProviderAnalytics] = useState<RentalsAnalytics | null>(null);
    const [loadingProviderAnalytics, setLoadingProviderAnalytics] = useState(false);

    useEffect(() => {
        const loadProviderAnalytics = async () => {
            if (profile?.role !== 'MOBILITY_PROVIDER' && profile?.role !== 'ADMIN') {
                setProviderAnalytics(null);
                return;
            }

            setLoadingProviderAnalytics(true);
            try {
                const res = await api.get('/admin/analytics/rentals');
                setProviderAnalytics(res.data as RentalsAnalytics);
            } catch (error) {
                console.error('Failed to load provider analytics', error);
            } finally {
                setLoadingProviderAnalytics(false);
            }
        };

        if (profile) {
            loadProviderAnalytics();
        }
    }, [profile]);

    let dashboardHighlight: ReactNode = null;

    if (profile?.role === 'MOBILITY_PROVIDER') {
        dashboardHighlight = (
            <div className="card dashboard-recommendation-card">
                <h3 style={{ fontSize: '24px', margin: '0 0 10px 0' }}>Rental Analytics Summary</h3>
                {loadingProviderAnalytics ? (
                    <p>Loading your analytics...</p>
                ) : (
                    <div className="flex-col">
                        <p style={{ fontSize: '18px' }}>
                            Total Rentals: <strong>{providerAnalytics?.summary?.totalRentals || 0}</strong> | Completed Rentals:{' '}
                            <strong>{providerAnalytics?.summary?.completedRentals || 0}</strong> | Total Revenue:{' '}
                            <strong>${providerAnalytics?.summary?.totalRevenue || 0}</strong>
                        </p>
                        <p style={{ fontSize: '16px', marginTop: 8 }}>
                            Most Used Mobility Option:{' '}
                            <strong>{providerAnalytics?.requiredMetrics?.mostUsedMobilityOption || 'N/A'}</strong>
                        </p>
                        <Button style={{ marginTop: 20 }}>
                            <Link to="/admin/analytics">View full analytics</Link>
                        </Button>
                    </div>
                )}
            </div>
        );
    } else if (profile?.role === 'ADMIN') {
        dashboardHighlight = (
            <div className="card dashboard-recommendation-card">
                <h3 style={{ fontSize: '24px', margin: '0 0 10px 0' }}>Rental Analytics Summary</h3>
                {loadingProviderAnalytics ? (
                    <p>Loading your analytics...</p>
                ) : (
                    <div className="flex-col">
                        <p style={{ fontSize: '18px' }}>
                            Total Rentals: <strong>{providerAnalytics?.summary?.totalRentals || 0}</strong> | Completed Rentals:{' '}
                            <strong>{providerAnalytics?.summary?.completedRentals || 0}</strong> | Total Revenue:{' '}
                            <strong>${providerAnalytics?.summary?.totalRevenue || 0}</strong>
                        </p>
                        <p style={{ fontSize: '16px', marginTop: 8 }}>
                            Most Used Mobility Option:{' '}
                            <strong>{providerAnalytics?.requiredMetrics?.mostUsedMobilityOption || 'N/A'}</strong>
                        </p>
                        <Button style={{ marginTop: 20 }}>
                            <Link to="/admin">View full analytics</Link>
                        </Button>
                    </div>
                )}
            </div>
        );
    } else {
        dashboardHighlight = (
            <div className="card dashboard-recommendation-card">
                <h3 style={{ fontSize: '24px', margin: '0 0 10px 0' }}>Personalized Travel Recommendations</h3>
                {!profile?.preferredMobility || !profile?.city ? (
                    <div className="flex-col">
                        <p style={{ fontSize: '18px' }}>
                            Add your city and preferred mobility in your account so we can show tailored vehicle recommendations here.
                        </p>
                        <Button style={{ marginTop: 20 }}>
                            <Link to="/account">Complete your profile</Link>
                        </Button>
                    </div>
                ) : loadingRecommendation ? (
                    <p>Loading your recommendations...</p>
                ) : recommendations.length > 0 ? (
                    <div className="flex-col">
                        <p style={{ fontSize: '18px' }}>
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
        );
    }

    return (
        <div className="page-container dashboard-page">
            {dashboardHighlight}

            <div className="dashboard-card-row" style={{ marginTop: 30 }}>
                {profile?.role === 'ADMIN' && (
                    <>
                        <div className="card dashboard-card admin-card" style={{ border: '4px solid #acd2cd' }}>
                            <UserRound className="dashboard-admin-card-icon" strokeWidth={2.2} />
                            <h3>Admin Tools</h3>
                            <p>View analytics and manage roles.</p>
                            <Link to="/admin"><button>Admin Dashboard</button></Link>
                        </div>

                        <div className="card dashboard-card mobility-card" style={{ border: '4px solid #acd2cd' }}>
                            <UserRound className="dashboard-mobility-card-icon" strokeWidth={2.2} />
                            <h3>Provider Tools</h3>
                            <p>Manage your vehicles and review provider insights.</p>
                            <Link to="/provider/vehicles"><button>Open Tools</button></Link>
                        </div>
                    </>
                )}
            </div>

            <div className="dashboard-card-row" style={{ marginTop: 30 }}>
                <div className="card dashboard-card">
                    <CarFront className="dashboard-card-icon" strokeWidth={2.2} />
                    <h3>Rent a Vehicle</h3>
                    <p>Find nearby bikes, scooters, and cars.</p>
                    <Link to="/vehicles"><button className="dashboard-button">Search Vehicles</button></Link>
                </div>

                <div className="card dashboard-card">
                    <SquareParking className="dashboard-card-icon" strokeWidth={2.2} />
                    <h3>Book a Parking Spots</h3>
                    <p>Find & reserve parking in the city.</p>
                    <Link to="/parking"><button className="dashboard-button">Find Parking</button></Link>
                </div>

                <div className="card dashboard-card">
                    <BusFront className="dashboard-card-icon" strokeWidth={2.2} />
                    <h3>View Transit</h3>
                    <p>Check schedules for buses, trams & trains.</p>
                    <Link to="/public-transport"><button className="dashboard-button">View Schedules</button></Link>
                </div>

                <div className="card dashboard-card">
                    <CalendarCheck2 className="dashboard-card-icon" strokeWidth={2.2} />
                    <h3>View My Bookings</h3>
                    <p>Manage your active and past rentals.</p>
                    <Link to="/rentals/current"><button className="dashboard-button">View Rentals</button></Link>
                </div>

                {profile?.role === 'MOBILITY_PROVIDER' && (
                    <div className="card dashboard-card mobility-card" style={{ border: '4px solid #acd2cd' }}>
                        <UserRound className="dashboard-mobility-card-icon" strokeWidth={2.2} />
                        <h3>Provider Tools</h3>
                        <p>Manage your vehicles and review provider insights.</p>
                        <Link to="/provider/vehicles"><button>Open Tools</button></Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DashboardPage;
