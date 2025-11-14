import { useLocation, Navigate, Outlet } from "react-router-dom";
import { useMaintenance } from "@/contexts/MaintenanceContext";
import { useUserRole } from "@/hooks/useUserRole";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

const RouteGuard = () => {
  const { isMaintenanceMode, isLoading: isMaintenanceLoading } = useMaintenance();
  const { isLoading: isRoleLoading } = useUserRole();
  const location = useLocation();

  if (isMaintenanceLoading || isRoleLoading) {
    return <LoadingSpinner message="Carregando..." />;
  }

  if (isMaintenanceMode) {
    // Allow access to admin and login pages so admins can log in and disable maintenance mode.
    if (
      location.pathname.startsWith("/admin") ||
      location.pathname.startsWith("/login")
    ) {
      return <Outlet />;
    }
    // Everyone else is redirected to the maintenance page, if not already there.
    if (location.pathname !== "/maintenance") {
      return <Navigate to="/maintenance" replace />;
    }
  }

  // If not in maintenance mode, proceed as normal.
  return <Outlet />;
};

export default RouteGuard;
