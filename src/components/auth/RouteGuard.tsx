import { useLocation, Navigate, Outlet } from "react-router-dom";
import { useMaintenance } from "@/contexts/MaintenanceContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/supabase/client";
import { useEffect, useState } from "react";

// This component will be a generic auth guard in the future.
// For now, it only handles maintenance mode.

const RouteGuard = () => {
  const { isMaintenanceMode } = useMaintenance();
  const { isAdmin, isLoading: isRoleLoading } = useUserRole();
  const location = useLocation();
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        // If there's a session, useUserRole will be triggered
      } else {
        // If no session, role is definitely not admin
      }
      setIsAuthChecked(true);
    };

    checkAuth();
  }, []);

  if (!isAuthChecked || isRoleLoading) {
    // You might want a proper loading spinner here
    return (
      <div className="flex h-screen w-full items-center justify-center">
        Loading...
      </div>
    );
  }

  if (isMaintenanceMode) {
    // Admins can access the admin page to turn off maintenance mode.
    if (isAdmin && location.pathname.startsWith("/admin")) {
      return <Outlet />;
    }
    // Everyone else (including admins not on the /admin page) is redirected.
    return <Navigate to="/maintenance" replace />;
  }

  // If not in maintenance mode, proceed as normal.
  return <Outlet />;
};

export default RouteGuard;
