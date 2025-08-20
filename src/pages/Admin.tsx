import React from 'react';
import AdminPanel from '@/components/admin/AdminPanel';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const AdminPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-800">Área Administrativa</h1>
            <Button variant="outline" onClick={() => navigate('/chat')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para o Chat
            </Button>
        </header>
        <main>
          <AdminPanel />
        </main>
      </div>
    </div>
  );
};

export default AdminPage;
