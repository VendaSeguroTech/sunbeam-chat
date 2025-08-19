import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, Plus } from 'lucide-react';

interface AdminInsertCommandProps {
  isOpen: boolean;
  onClose: () => void;
}

const AdminInsertCommand: React.FC<AdminInsertCommandProps> = ({ isOpen, onClose }) => {
  const [insertType, setInsertType] = useState<'text' | 'file'>('text');
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleInsert = async () => {
    if ((!content.trim() && !file) || !title.trim()) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Simular inserção (aqui você implementaria a lógica real)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Sucesso",
        description: `${insertType === 'text' ? 'Texto' : 'Arquivo'} inserido com sucesso!`,
      });
      
      // Limpar formulário
      setContent('');
      setTitle('');
      setFile(null);
      onClose();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao inserir conteúdo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Comando Insert - Administrador
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Tipo de inserção */}
          <div className="space-y-2">
            <Label>Tipo de Inserção</Label>
            <div className="flex gap-2">
              <Button
                variant={insertType === 'text' ? 'default' : 'outline'}
                onClick={() => setInsertType('text')}
                className="flex-1"
              >
                Texto
              </Button>
              <Button
                variant={insertType === 'file' ? 'default' : 'outline'}
                onClick={() => setInsertType('file')}
                className="flex-1"
              >
                <Upload className="w-4 h-4 mr-2" />
                Arquivo
              </Button>
            </div>
          </div>

          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Digite um título para a inserção..."
            />
          </div>

          {/* Conteúdo de texto */}
          {insertType === 'text' && (
            <div className="space-y-2">
              <Label htmlFor="content">Conteúdo *</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Digite o conteúdo a ser inserido..."
                rows={6}
              />
            </div>
          )}

          {/* Upload de arquivo */}
          {insertType === 'file' && (
            <div className="space-y-2">
              <Label>Arquivo *</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <input
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                  accept=".txt,.pdf,.doc,.docx,.json"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {file ? file.name : 'Clique para selecionar um arquivo'}
                  </span>
                </label>
              </div>
              {file && (
                <p className="text-xs text-muted-foreground">
                  Arquivo selecionado: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleInsert} disabled={loading}>
            {loading ? (
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
            ) : null}
            Inserir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminInsertCommand;