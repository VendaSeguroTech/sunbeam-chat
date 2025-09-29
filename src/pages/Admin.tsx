import React from 'react';
import AdminPanel from '@/components/admin/AdminPanel';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut } from 'lucide-react';
import MaintenanceToggle from '@/components/admin/MaintenanceToggle';
import { supabase } from '@/supabase/client';

const AdminPage: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800">Área Administrativa</h1>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => navigate('/chat')}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar para o Chat
              </Button>
              <Button variant="destructive" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
              </Button>
            </div>
        </header>
        <main className="space-y-6">
          <MaintenanceToggle />
          <AdminPanel />
        </main>
      </div>
    </div>
  );
};

export default AdminPage;
