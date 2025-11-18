import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/supabase/client';
import { Loader2 } from 'lucide-react';

interface Model {
  id: string;
  name: string;
  display_name: string;
  is_public: boolean;
}

interface ManageUserModelsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userEmail: string;
  userName: string | null;
  currentAllowedModelIds: string[];
  onSuccess: () => void;
}

const ManageUserModelsDialog: React.FC<ManageUserModelsDialogProps> = ({
  open,
  onOpenChange,
  userId,
  userEmail,
  userName,
  currentAllowedModelIds,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Buscar todos os modelos disponíveis
  useEffect(() => {
    if (open) {
      fetchModels();
      setSelectedModelIds(currentAllowedModelIds);
    }
  }, [open, currentAllowedModelIds]);

  const fetchModels = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('models')
        .select('id, name, display_name, is_public')
        .order('display_name', { ascending: true });

      if (error) throw error;

      setModels(data || []);
    } catch (error) {
      console.error('Erro ao buscar modelos:', error);
      toast({
        title: 'Erro ao carregar modelos',
        description: 'Não foi possível carregar a lista de modelos.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleModel = (modelId: string) => {
    setSelectedModelIds(prev => {
      if (prev.includes(modelId)) {
        return prev.filter(id => id !== modelId);
      } else {
        return [...prev, modelId];
      }
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('profiles')
        .update({ allowed_model_ids: selectedModelIds })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: 'Modelos atualizados',
        description: `Permissões de ${userName || userEmail} foram atualizadas com sucesso.`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao atualizar modelos:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível atualizar as permissões do usuário.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Gerenciar Acesso aos Modelos</DialogTitle>
          <DialogDescription>
            Selecione os modelos que <strong>{userName || userEmail}</strong> poderá acessar.
            Modelos públicos são acessíveis a todos os usuários.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-4">
              {models.map(model => (
                <div key={model.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`model-${model.id}`}
                    checked={selectedModelIds.includes(model.id)}
                    onCheckedChange={() => handleToggleModel(model.id)}
                    disabled={model.is_public} // Modelos públicos não precisam ser marcados
                  />
                  <Label
                    htmlFor={`model-${model.id}`}
                    className={`flex-1 cursor-pointer ${
                      model.is_public ? 'text-gray-500' : ''
                    }`}
                  >
                    {model.display_name}
                    {model.is_public && (
                      <span className="ml-2 text-xs text-gray-400">(público - sempre acessível)</span>
                    )}
                  </Label>
                </div>
              ))}

              {models.length === 0 && (
                <p className="text-center text-sm text-gray-500">
                  Nenhum modelo disponível
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Permissões
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ManageUserModelsDialog;
