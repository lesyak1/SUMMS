import { Navigate } from "react-router-dom";
import { useAuth } from "../../../features/auth/context/useAuth";
import Navbar from "../Navbar/Navbar";

const ProtectedRoute = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <Navbar />
      {children}
    </>
  );
}
export default ProtectedRoute;
