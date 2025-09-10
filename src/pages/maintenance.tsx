import { ShieldAlert } from "lucide-react";

const MaintenancePage = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background text-center p-4">
      <ShieldAlert className="h-16 w-16 text-yellow-500 mb-4" />
      <h1 className="text-3xl font-bold mb-2">Sistema em Manutenção</h1>
      <p className="text-lg text-muted-foreground">
        Estamos realizando melhorias e voltaremos em breve.
      </p>
      <p className="text-muted-foreground mt-2">
        Agradecemos a sua paciência.
      </p>
    </div>
  );
};

export default MaintenancePage;