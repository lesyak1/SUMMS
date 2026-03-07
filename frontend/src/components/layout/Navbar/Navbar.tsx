import { Link } from 'react-router-dom';
import { useAuth } from '../../../features/auth/context/AuthContext';
import { supabase } from '../../../lib/supabase';
import './Navbar.css';

const Navbar = () => {
    const { user, profile } = useAuth();

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    if (!user) return null;

    return (
        <nav className="navbar">
            <div className="navbar-brand">
                <Link to="/">SUMMS</Link>
            </div>
            <div className="navbar-links">
                <Link to="/">Dashboard</Link>
                <Link to="/vehicles">Vehicles</Link>
                <Link to="/rentals/current">My Rentals</Link>
                <Link to="/account">Account</Link>
                {profile?.role === 'ADMIN' && <Link to="/admin">Admin</Link>}
                {(profile?.role === 'MOBILITY_PROVIDER' || profile?.role === 'ADMIN') && (
                    <Link to="/provider/vehicles">Provider Tools</Link>
                )}
                <button onClick={handleLogout} className="logout-btn">Logout</button>
            </div>
        </nav>
    );
};

export default Navbar;
