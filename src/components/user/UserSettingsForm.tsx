import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/supabase/client';
import { useTokens } from '@/hooks/useTokens';
import { useUserRole } from '@/hooks/useUserRole';
import { Coins, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import ReportBugDialog from './ReportBugDialog';

interface UserSettingsFormProps {
  onSave?: () => void;
}

const UserSettingsForm: React.FC<UserSettingsFormProps> = ({ onSave }) => {
  const { toast } = useToast();
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [isReportBugOpen, setIsReportBugOpen] = useState(false);
  const { tokens, hasUnlimitedTokens, isLoading: tokensLoading } = useTokens();
  const { userRole } = useUserRole();

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
      {/* Token Counter */}
      <div className="bg-muted/50 p-4 rounded-lg border border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-yellow-600" />
            <Label className="text-base font-semibold">Seus Tokens</Label>
          </div>
          <Badge variant={hasUnlimitedTokens ? "default" : tokens > 0 ? "secondary" : "destructive"} className="text-lg px-3 py-1">
            {tokensLoading ? '...' : hasUnlimitedTokens ? '∞' : tokens}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {hasUnlimitedTokens
            ? userRole === 'admin'
              ? 'Você tem tokens ilimitados como administrador.'
              : 'Você possui tokens ilimitados.'
            : tokens > 0
            ? `Você tem ${tokens} ${tokens === 1 ? 'token disponível' : 'tokens disponíveis'}. Cada pergunta consome 1 token.`
            : 'Você não tem mais tokens disponíveis. Entre em contato com um administrador para recarregar.'}
        </p>
      </div>

      {/* User Name */}
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
      <div className="flex gap-2">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? 'Salvando...' : 'Salvar'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsReportBugOpen(true)}
          className="gap-2"
        >
          <AlertCircle className="h-4 w-4" />
          Relatar Problema
        </Button>
      </div>

      {/* Report Bug Dialog */}
      <ReportBugDialog
        isOpen={isReportBugOpen}
        onClose={() => setIsReportBugOpen(false)}
      />
    </form>
  );
};

export default UserSettingsForm;
