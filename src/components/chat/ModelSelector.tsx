import React, { useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useModels } from "@/hooks/useModels";
import { useUserRole } from "@/hooks/useUserRole";

interface ModelSelectorProps {
  onValueChange: (value: string) => void;
  value: string;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ onValueChange, value }) => {
  const { models, loading } = useModels();
  const { isAdmin } = useUserRole();

  // Se o valor atual não está mais disponível (modelo foi deletado ou virou privado),
  // selecionar o primeiro modelo disponível
  useEffect(() => {
    if (!loading && models.length > 0) {
      const currentModelExists = models.some(model => model.name === value);
      if (!currentModelExists) {
        onValueChange(models[0].name);
      }
    }
  }, [models, loading, value, onValueChange]);

  // OTIMIZAÇÃO: Nunca bloquear o selector se já temos modelos (mesmo durante revalidação)
  const hasModels = models.length > 0;
  const shouldDisable = loading && !hasModels;

  if (shouldDisable) {
    return (
      <Select disabled>
        <SelectTrigger
          className="w-[180px] focus:ring-0 focus:ring-offset-0"
          style={{
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.08)'
          }}
        >
          <SelectValue placeholder="Carregando..." />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select onValueChange={onValueChange} value={value}>
      <SelectTrigger
        className="w-[180px] focus:ring-0 focus:ring-offset-0"
        style={{
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.08)'
        }}
      >
        <SelectValue placeholder="Selecione o modelo" />
      </SelectTrigger>
      <SelectContent className="shadow-lg z-[9999]" position="popper" sideOffset={5}>
        {models.map((model) => (
          <SelectItem
            key={model.id}
            value={model.name}
            className="text-gray-900 font-light cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span>{model.display_name}</span>
              {isAdmin && !model.is_public && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0 font-light ">
                  private
                </Badge>
              )}
            </div>
          </SelectItem>
        ))}
        {models.length === 0 && (
          <SelectItem value="none" disabled>
            Nenhum modelo disponível
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
};

export default ModelSelector;