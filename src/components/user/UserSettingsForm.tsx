import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/supabase/client';

interface UserSettingsFormProps {
  onSave?: () => void;
}

const UserSettingsForm: React.FC<UserSettingsFormProps> = ({ onSave }) => {
  const { toast } = useToast();
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserName = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user name:', error);
          toast({
            title: 'Erro',
            description: 'Não foi possível carregar o nome do usuário.',
            variant: 'destructive',
          });
        } else if (data) {
          setUserName(data.name || '');
        }
      }
      setLoading(false);
    };

    fetchUserName();
  }, [toast]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { error } = await supabase
        .from('profiles')
        .update({ name: userName })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating user name:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível salvar o nome do usuário.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Sucesso',
          description: 'Nome do usuário salvo com sucesso!',
        });
        onSave?.(); // Callback to parent if needed
      }
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div>
        <Label htmlFor="userName">Nome</Label>
        <Input
          id="userName"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="Seu nome"
          disabled={loading}
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? 'Salvando...' : 'Salvar'}
      </Button>
    </form>
  );
};

export default UserSettingsForm;
