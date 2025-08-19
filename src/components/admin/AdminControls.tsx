import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Settings, BarChart3, Plus } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import AdminPanel from './AdminPanel';
import AdminInsertCommand from './AdminInsertCommand';

const AdminControls: React.FC = () => {
  const { isAdmin } = useUserRole();
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showInsertCommand, setShowInsertCommand] = useState(false);

  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowAdminPanel(true)}
          className="bg-background/95 backdrop-blur-sm border-border hover:bg-muted"
          title="Painel Administrativo"
        >
          <BarChart3 className="w-4 h-4" />
        </Button>
        
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowInsertCommand(true)}
          className="bg-background/95 backdrop-blur-sm border-border hover:bg-muted"
          title="Comando Insert"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <AdminPanel 
        isOpen={showAdminPanel} 
        onClose={() => setShowAdminPanel(false)} 
      />
      
      <AdminInsertCommand
        isOpen={showInsertCommand}
        onClose={() => setShowInsertCommand(false)}
      />
    </>
  );
};

export default AdminControls;