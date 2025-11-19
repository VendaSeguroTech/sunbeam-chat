import { useState, useEffect } from 'react';
import { supabase } from '@/supabase/client';
import { useUserRole } from './useUserRole';

export interface Model {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export const useModels = () => {
  // OTIMIZAÇÃO: Inicializar com cache do localStorage
  const [models, setModels] = useState<Model[]>(() => {
    try {
      const cached = localStorage.getItem('experta_models');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  // OTIMIZAÇÃO: Começar como false se já tiver cache
  const [loading, setLoading] = useState(() => {
    try {
      const cached = localStorage.getItem('experta_models');
      return !cached; // Se tem cache, não está loading
    } catch {
      return true;
    }
  });
  const [allowedModelIds, setAllowedModelIds] = useState<string[]>(() => {
    try {
      const cached = localStorage.getItem('experta_allowed_models');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const { isAdmin } = useUserRole();

  const fetchModels = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();

      // OTIMIZAÇÃO: Executar queries em PARALELO ao invés de sequencial
      const [profileResult, modelsResult] = await Promise.all([
        user
          ? supabase
              .from('profiles')
              .select('allowed_model_ids')
              .eq('id', user.id)
              .single()
          : Promise.resolve({ data: null, error: null }),

        supabase
          .from('models')
          .select('*')
          .order('display_name', { ascending: true })
      ]);

      // Processar allowed_model_ids
      if (user && !profileResult.error && profileResult.data) {
        const allowed = profileResult.data.allowed_model_ids || [];
        setAllowedModelIds(allowed);
        // OTIMIZAÇÃO: Cachear no localStorage
        try {
          localStorage.setItem('experta_allowed_models', JSON.stringify(allowed));
        } catch (e) {
          console.warn('Erro ao cachear allowed_models:', e);
        }
      }

      // Processar modelos
      if (!modelsResult.error && modelsResult.data) {
        setModels(modelsResult.data);
        // OTIMIZAÇÃO: Cachear no localStorage
        try {
          localStorage.setItem('experta_models', JSON.stringify(modelsResult.data));
        } catch (e) {
          console.warn('Erro ao cachear models:', e);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar modelos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, [isAdmin]); // Re-fetch when admin status changes

  const toggleModelVisibility = async (modelId: string, isPublic: boolean) => {
    try {
      const { error } = await supabase
        .from('models')
        .update({ is_public: isPublic })
        .eq('id', modelId);

      if (error) {
        console.error('❌ Error updating model visibility:', error);
        throw error;
      }

      // Atualizar estado local
      setModels(prev =>
        prev.map(model =>
          model.id === modelId ? { ...model, is_public: isPublic } : model
        )
      );

      return { success: true };
    } catch (error) {
      console.error('Erro ao atualizar visibilidade do modelo:', error);
      return { success: false, error };
    }
  };

  const addModel = async (
    name: string,
    displayName: string,
    description: string | null = null,
    isPublic: boolean = false
  ) => {
    try {
      const { data, error } = await supabase
        .from('models')
        .insert([
          {
            name,
            display_name: displayName,
            description,
            is_public: isPublic,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('❌ Error adding model:', error);
        throw error;
      }

      // Atualizar lista local
      setModels(prev => [...prev, data]);
      return { success: true, data };
    } catch (error) {
      console.error('Erro ao adicionar modelo:', error);
      return { success: false, error };
    }
  };

  const deleteModel = async (modelId: string) => {
    try {
      const { error } = await supabase
        .from('models')
        .delete()
        .eq('id', modelId);

      if (error) {
        console.error('❌ Error deleting model:', error);
        throw error;
      }

      // Atualizar lista local
      setModels(prev => prev.filter(model => model.id !== modelId));
      return { success: true };
    } catch (error) {
      console.error('Erro ao deletar modelo:', error);
      return { success: false, error };
    }
  };

  // Filtrar modelos baseado em permissões
  const availableModels = models.filter(model => {
    // Admin vê todos os modelos
    if (isAdmin) return true;

    // Modelos públicos são visíveis para todos
    if (model.is_public) return true;

    // Modelos privados: só se estiver na lista de permitidos
    return allowedModelIds.includes(model.id);
  });

  return {
    models: availableModels,
    allModels: models, // Todos os modelos (para uso no admin)
    loading,
    allowedModelIds,
    toggleModelVisibility,
    addModel,
    deleteModel,
    refreshModels: fetchModels,
  };
};
