import { Navigate } from "react-router-dom";
import { useAuth } from "../../../features/auth/context/AuthContext";

export const RoleProtectedRoute = ({
    children,
    allowedRoles,
}: {
    children: React.ReactNode;
    allowedRoles: string[];
}) => {
    const { user, profile, loading } = useAuth();

    if (loading) return null;

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // If profile is not loaded or role is not in allowedRoles, redirect to home
    if (!profile || !allowedRoles.includes(profile.role)) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
}
