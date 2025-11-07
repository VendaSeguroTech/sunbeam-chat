import React from 'react';
import ImprovedAdminPanel from '@/components/admin/ImprovedAdminPanel';
import UserActivityCard from '@/components/admin/UserActivityCard';
import BugReportsPanel from '@/components/admin/BugReportsPanel';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut } from 'lucide-react';
import MaintenanceToggle from '@/components/admin/MaintenanceToggle';
import { supabase } from '@/supabase/client';
import { Toaster } from 'sonner';

const AdminPage: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 md:p-6 lg:p-8">
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto">
        <header className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold">Área Administrativa</h1>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Button
                variant="outline"
                onClick={() => navigate('/chat')}
                className="w-full sm:w-auto"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Voltar para o Chat</span>
                <span className="sm:hidden">Chat</span>
              </Button>
              <Button
                variant="destructive"
                onClick={handleLogout}
                className="w-full sm:w-auto"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </header>
        <main className="space-y-4 sm:space-y-6">
          {/* Reports de Problemas */}
          <BugReportsPanel />

          {/* Modo Manutenção */}
          <MaintenanceToggle />

          {/* Painel de Usuários Melhorado */}
          <ImprovedAdminPanel />

          {/* Atividade dos Usuários */}
          <UserActivityCard />
        </main>
      </div>
    </div>
  );
};

export default AdminPage;
