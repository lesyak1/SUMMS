import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../../features/auth/context/useAuth';
import { supabase } from '../../../lib/supabase';

const Navbar = () => {
    const { user, profile } = useAuth();

    const navItemClass = ({ isActive }: { isActive: boolean }) =>
        `relative text-lg font-semibold px-1 py-1 text-gray-700 transition-colors hover:!text-[#66897f] after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-full after:bg-[#66897f] after:origin-left after:transition-transform ${
            isActive ? 'text-black after:scale-x-100' : 'after:scale-x-0 hover:after:scale-x-100'
        }`;

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    if (!user) return null;

    const navigation = [
        { name: 'Dashboard', to: '/' },
        { name: 'My Rentals', to: '/rentals/current' },
        { name: 'Account', to: '/account' },
    ];

    return (
        <nav className="sticky top-0 z-10 bg-white shadow-sm px-6 py-3">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                
                <Link to="/" className="text-3xl font-extrabold text-gray-900">SUMMS</Link>
                
                <div className="hidden lg:flex items-center gap-6">
                    {navigation.map((item) => (
                        <NavLink
                            key={item.name}
                            to={item.to}
                            end={item.to === '/'}
                            className={navItemClass}
                        >
                            {item.name}
                        </NavLink>
                    ))}
                    {profile?.role === 'ADMIN' && (
                        <NavLink
                            to="/admin"
                            className={navItemClass}
                        >
                            Admin Tools
                        </NavLink>
                    )}
                    {(profile?.role === 'MOBILITY_PROVIDER' || profile?.role === 'ADMIN') && (
                        <NavLink
                            to="/provider/vehicles"
                            className={navItemClass}
                        >
                            Provider Tools
                        </NavLink>
                    )}
                    {profile?.role === 'MOBILITY_PROVIDER' && (
                        <NavLink
                            to="/admin/analytics"
                            className={navItemClass}
                        >
                            Provider Analytics
                        </NavLink>
                    )}
                        
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="appearance-none !bg-[#8fa69f] !text-white !border-0 px-4 py-2 rounded-md text-sm font-medium hover:!bg-[#45784f] active:!bg-[#45784f] focus:!outline-none focus:!ring-2 focus:!ring-[#6ca876] focus:!ring-offset-2 transition-colors"
                    >
                        Logout
                    </button>
                </div>
                
            </div>
        </nav>
    );
};

export default Navbar;
