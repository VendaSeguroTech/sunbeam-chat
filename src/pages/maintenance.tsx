import { ShieldAlert, ShieldCheck } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMaintenance } from "@/contexts/MaintenanceContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";

const MaintenancePage = () => {
  const navigate = useNavigate();
  const { isMaintenanceMode, isLoading: isMaintenanceLoading } = useMaintenance();
  const { isAdmin, loading: isRoleLoading } = useUserRole();

  useEffect(() => {
    // When loading is finished and maintenance mode is turned off, redirect the user.
    if (!isMaintenanceLoading && !isMaintenanceMode) {
      navigate("/");
    }
  }, [isMaintenanceMode, isMaintenanceLoading, navigate]);

  return (
    <div className="relative h-screen">
      <div className="flex flex-col items-center justify-center h-full bg-background text-center p-4">
        <ShieldAlert className="h-16 w-16 text-yellow-500 mb-4" />
        <h1 className="text-3xl font-bold mb-2">Sistema em Manutenção</h1>
        <p className="text-lg text-muted-foreground">
          Estamos realizando melhorias e voltaremos em breve.
        </p>
        <p className="text-muted-foreground mt-2">
          Agradecemos a sua paciência.
        </p>
      </div>

      {/* Admin Floating Action Button */}
      {!isRoleLoading && isAdmin && (
        <Button
          onClick={() => navigate("/admin")}
          className="fixed bottom-6 right-6 h-16 w-16 rounded-full bg-orange-500 text-white shadow-xl hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transform hover:-translate-y-1 active:translate-y-0 transition-all duration-300 ease-in-out"
          aria-label="Go to Admin Panel"
        >
          <ShieldCheck className="h-8 w-8" />
        </Button>
      )}
    </div>
  );
};

export default MaintenancePage;