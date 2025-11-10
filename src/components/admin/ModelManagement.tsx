import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreVertical,
  RefreshCw,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { useModels, Model } from '@/hooks/useModels';

const ModelManagement: React.FC = () => {
  const { models, loading, toggleModelVisibility, addModel, deleteModel, refreshModels } = useModels();

  // Create Model Dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newModelName, setNewModelName] = useState('');
  const [newModelDisplayName, setNewModelDisplayName] = useState('');
  const [newModelDescription, setNewModelDescription] = useState('');
  const [newModelIsPublic, setNewModelIsPublic] = useState(false);

  // Delete Model Dialog
  const [modelToDelete, setModelToDelete] = useState<Model | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleToggleVisibility = async (model: Model) => {
    const result = await toggleModelVisibility(model.id, !model.is_public);

    if (result.success) {
      toast.success(
        `Modelo "${model.display_name}" agora é ${!model.is_public ? 'público' : 'privado'}`
      );
    } else {
      toast.error('Erro ao atualizar visibilidade do modelo');
    }
  };

  const handleCreateModel = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newModelName.trim() || !newModelDisplayName.trim()) {
      toast.error('Nome e nome de exibição são obrigatórios');
      return;
    }

    const result = await addModel(
      newModelName.trim(),
      newModelDisplayName.trim(),
      newModelDescription.trim() || null,
      newModelIsPublic
    );

    if (result.success) {
      toast.success(`Modelo "${newModelDisplayName}" criado com sucesso!`);
      setNewModelName('');
      setNewModelDisplayName('');
      setNewModelDescription('');
      setNewModelIsPublic(false);
      setShowCreateDialog(false);
    } else {
      toast.error('Erro ao criar modelo. Verifique se o nome já não existe.');
    }
  };

  const handleDeleteModel = async () => {
    if (!modelToDelete) return;

    const result = await deleteModel(modelToDelete.id);

    if (result.success) {
      toast.success(`Modelo "${modelToDelete.display_name}" deletado com sucesso`);
    } else {
      toast.error('Erro ao deletar modelo');
    }

    setShowDeleteDialog(false);
    setModelToDelete(null);
  };

  return (
    <div className="space-y-6">
      {/* Model Management Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                <CardTitle className="text-xl sm:text-2xl">Gerenciamento de Modelos</CardTitle>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshModels}
                  disabled={loading}
                  className="w-full sm:w-auto bg-novo-chat text-white hover:bg-novo-chat/90 hover:text-primary-foreground"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowCreateDialog(true)}
                  className="w-full sm:w-auto bg-novo-chat hover:bg-novo-chat/90 text-primary-foreground"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Modelo
                </Button>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              <p>
                Gerencie a visibilidade dos modelos de IA. Modelos <strong>públicos</strong> são visíveis para todos os usuários.
                Modelos <strong>privados</strong> são visíveis apenas para administradores.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <div className="overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px]">Nome do Modelo</TableHead>
                      <TableHead className="min-w-[200px]">Descrição</TableHead>
                      <TableHead className="min-w-[120px]">Visibilidade</TableHead>
                      <TableHead className="min-w-[100px]">Status</TableHead>
                      <TableHead className="text-right min-w-[80px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {models.map((model) => (
                      <TableRow key={model.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{model.display_name}</span>
                            <span className="text-xs text-muted-foreground">{model.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {model.description || 'Sem descrição'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={model.is_public}
                              onCheckedChange={() => handleToggleVisibility(model)}
                              className="data-[state=checked]:bg-novo-chat"
                            />
                            <span className="text-sm font-medium">
                              {model.is_public ? 'Público' : 'Privado'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {model.is_public ? (
                            <Badge variant="default" className="bg-green-500">
                              <Eye className="h-3 w-3 mr-1" />
                              Público
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <EyeOff className="h-3 w-3 mr-1" />
                              Privado
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Ações</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleToggleVisibility(model)}>
                                {model.is_public ? (
                                  <>
                                    <EyeOff className="h-4 w-4 mr-2" />
                                    Tornar Privado
                                  </>
                                ) : (
                                  <>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Tornar Público
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setModelToDelete(model);
                                  setShowDeleteDialog(true);
                                }}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Deletar Modelo
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                    {models.length === 0 && !loading && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhum modelo encontrado. Crie um novo modelo para começar.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Model Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Modelo</DialogTitle>
            <DialogDescription>
              Adicione um novo modelo de IA ao sistema. O nome deve ser único.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateModel}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Técnico *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="ex: pro-v3"
                  value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Nome usado internamente (sem espaços, minúsculas)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Nome de Exibição *</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="ex: Pro-v3"
                  value={newModelDisplayName}
                  onChange={(e) => setNewModelDisplayName(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Nome exibido para os usuários
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  type="text"
                  placeholder="ex: Modelo Pro versão 3"
                  value={newModelDescription}
                  onChange={(e) => setNewModelDescription(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="isPublic" className="flex flex-col space-y-1">
                  <span>Visibilidade Pública</span>
                  <span className="font-normal text-xs text-muted-foreground">
                    Marque para tornar o modelo visível para todos os usuários
                  </span>
                </Label>
                <Switch
                  id="isPublic"
                  checked={newModelIsPublic}
                  onCheckedChange={setNewModelIsPublic}
                  className="data-[state=checked]:bg-novo-chat"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateDialog(false);
                  setNewModelName('');
                  setNewModelDisplayName('');
                  setNewModelDescription('');
                  setNewModelIsPublic(false);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit">Criar Modelo</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Model Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a deletar o modelo <strong>{modelToDelete?.display_name}</strong>.
              Esta ação não pode ser desfeita. Usuários não poderão mais selecionar este modelo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteModel}
              className="bg-destructive hover:bg-destructive/90"
            >
              Sim, deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ModelManagement;
