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
        <CardTitle className="text-lg font-semibold">Modo Manutenção</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-4">
          <Switch
            id="maintenance-mode"
            checked={isMaintenanceMode}
            onCheckedChange={handleToggle}
            aria-label="Ativar ou desativar o modo de manutenção"
          />
          <Label htmlFor="maintenance-mode" className="flex flex-col space-y-1">
            <span>
              {isMaintenanceMode
                ? "Desativar modo manutenção"
                : "Ativar modo manutenção"}
            </span>
            <span className="font-normal leading-snug text-muted-foreground">
              Ao ativar, apenas administradores terão acesso ao sistema.
            </span>
          </Label>
        </div>
      </CardContent>
    </Card>
  );
};

export default MaintenanceToggle;
