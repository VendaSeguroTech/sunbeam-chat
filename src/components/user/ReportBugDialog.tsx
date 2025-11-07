import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/supabase/client';
import { AlertCircle } from 'lucide-react';

interface ReportBugDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const ReportBugDialog: React.FC<ReportBugDialogProps> = ({ isOpen, onClose }) => {
  const { toast } = useToast();
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        setUserEmail(user.email || '');

        const { data } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .single();

        if (data) {
          setUserName(data.name || '');
        }
      }
    };

    if (isOpen) {
      fetchUserData();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      toast({
        title: 'Campo obrigatório',
        description: 'Por favor, descreva o problema encontrado.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { error } = await supabase.from('bug_reports').insert({
        user_id: user.id,
        user_name: userName || 'Usuário sem nome',
        user_email: userEmail || user.email || '',
        description: description.trim(),
        status: 'pending',
      });

      if (error) throw error;

      toast({
        title: 'Problema reportado!',
        description: 'Obrigado pelo feedback. Nossa equipe vai analisar o problema.',
      });

      setDescription('');
      onClose();
    } catch (error) {
      console.error('Erro ao enviar report:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar o report. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            <DialogTitle>Relatar um Problema</DialogTitle>
          </div>
          <DialogDescription>
            Descreva o problema ou bug que você encontrou. Nossa equipe vai analisar e responder em breve.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Descrição do Problema *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o problema em detalhes: o que aconteceu, quando aconteceu, o que você estava fazendo..."
              className="min-h-[150px] resize-none"
              disabled={loading}
              required
            />
            <p className="text-xs text-muted-foreground">
              Quanto mais detalhes você fornecer, mais fácil será para resolvermos o problema.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !description.trim()}
            >
              {loading ? 'Enviando...' : 'Enviar Report'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ReportBugDialog;
