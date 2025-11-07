import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/supabase/client';
import { AlertCircle, RefreshCw, Check, X, Clock, Play } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface BugReport {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  description: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  updated_at: string;
}

const BugReportsPanel: React.FC = () => {
  const { toast } = useToast();
  const [reports, setReports] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<BugReport | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bug_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setReports(data || []);
    } catch (error) {
      console.error('Erro ao carregar reports:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os reports.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const updateReportStatus = async (reportId: string, newStatus: BugReport['status']) => {
    try {
      const { error } = await supabase
        .from('bug_reports')
        .update({ status: newStatus })
        .eq('id', reportId);

      if (error) throw error;

      toast({
        title: 'Status atualizado',
        description: 'O status do report foi atualizado com sucesso.',
      });

      fetchReports();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status.',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: BugReport['status']) => {
    const statusConfig = {
      pending: { label: 'Pendente', variant: 'default' as const, icon: Clock },
      in_progress: { label: 'Em Andamento', variant: 'secondary' as const, icon: Play },
      resolved: { label: 'Resolvido', variant: 'default' as const, icon: Check },
      closed: { label: 'Fechado', variant: 'outline' as const, icon: X },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleRowClick = (report: BugReport) => {
    setSelectedReport(report);
    setIsDetailDialogOpen(true);
  };

  const pendingCount = reports.filter(r => r.status === 'pending').length;
  const inProgressCount = reports.filter(r => r.status === 'in_progress').length;
  const resolvedCount = reports.filter(r => r.status === 'resolved').length;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Reports de Problemas
              </CardTitle>
              <CardDescription>
                Gerenciar reports de bugs e problemas dos usuários
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchReports}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pendentes</p>
                    <p className="text-2xl font-bold">{pendingCount}</p>
                  </div>
                  <Clock className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Em Andamento</p>
                    <p className="text-2xl font-bold">{inProgressCount}</p>
                  </div>
                  <Play className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Resolvidos</p>
                    <p className="text-2xl font-bold">{resolvedCount}</p>
                  </div>
                  <Check className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabela de Reports */}
          <div className="border rounded-lg">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum report encontrado
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow
                      key={report.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(report)}
                    >
                      <TableCell className="font-medium">{report.user_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {report.user_email}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {report.description}
                      </TableCell>
                      <TableCell>{getStatusBadge(report.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(report.created_at)}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={report.status}
                          onValueChange={(value) =>
                            updateReportStatus(report.id, value as BugReport['status'])
                          }
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pendente</SelectItem>
                            <SelectItem value="in_progress">Em Andamento</SelectItem>
                            <SelectItem value="resolved">Resolvido</SelectItem>
                            <SelectItem value="closed">Fechado</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Detalhes */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Report</DialogTitle>
            <DialogDescription>
              Informações completas sobre o problema reportado
            </DialogDescription>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold text-muted-foreground">Usuário</Label>
                  <p className="text-base">{selectedReport.user_name}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold text-muted-foreground">Email</Label>
                  <p className="text-base">{selectedReport.user_email}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedReport.status)}</div>
                </div>
                <div>
                  <Label className="text-sm font-semibold text-muted-foreground">Data</Label>
                  <p className="text-base">{formatDate(selectedReport.created_at)}</p>
                </div>
              </div>
              <div>
                <Label className="text-sm font-semibold text-muted-foreground">Descrição Completa</Label>
                <div className="mt-2 p-4 bg-muted rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{selectedReport.description}</p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

// Label component (se não existir)
const Label: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <label className={className}>{children}</label>
);

export default BugReportsPanel;
