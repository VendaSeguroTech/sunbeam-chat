import { useMaintenance } from "@/contexts/MaintenanceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const MaintenanceToggle = () => {
  const { isMaintenanceMode, setMaintenanceMode } = useMaintenance();

  const handleToggle = async (isChecked: boolean) => {
    try {
      await setMaintenanceMode(isChecked);
      toast.success(
        `Modo manutenção ${isChecked ? "ativado" : "desativado"} com sucesso.`
      );
    } catch (error) {
      toast.error("Falha ao alterar o modo manutenção.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl font-semibold">Modo Manutenção</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
          <Switch
            id="maintenance-mode"
            checked={isMaintenanceMode}
            onCheckedChange={handleToggle}
            aria-label="Ativar ou desativar o modo de manutenção"
            className="self-start sm:self-auto"
          />
          <Label htmlFor="maintenance-mode" className="flex flex-col space-y-1 cursor-pointer">
            <span className="text-sm sm:text-base font-medium">
              {isMaintenanceMode
                ? "Desativar modo manutenção"
                : "Ativar modo manutenção"}
            </span>
            <span className="text-xs sm:text-sm font-normal leading-snug text-muted-foreground">
              Ao ativar, apenas administradores terão acesso ao sistema.
            </span>
          </Label>
        </div>
      </CardContent>
    </Card>
  );
};

export default MaintenanceToggle;
