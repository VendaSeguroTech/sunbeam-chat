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
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useUserRole();

  const fetchModels = async () => {
    try {
      setLoading(true);

      // RLS vai filtrar automaticamente baseado na role
      // Admins veem todos, usuários comuns só veem públicos
      const { data, error } = await supabase
        .from('models')
        .select('*')
        .order('display_name', { ascending: true });

      if (error) {
        console.error('❌ Error fetching models:', error);
        return;
      }

      setModels(data || []);
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

  // Retorna apenas os modelos que o usuário pode ver (baseado na RLS)
  const availableModels = models;

  return {
    models: availableModels,
    loading,
    toggleModelVisibility,
    addModel,
    deleteModel,
    refreshModels: fetchModels,
  };
};
