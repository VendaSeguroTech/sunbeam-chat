import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Settings, BarChart3, Plus } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import AdminPanel from './AdminPanel';
import AdminInsertCommand from './AdminInsertCommand';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'; // Import Dialog components

const AdminControls: React.FC = () => {
  const { isAdmin } = useUserRole();
  console.log('Is Admin:', isAdmin); // Added for debugging

  const [showAdminPanel, setShowAdminPanel] = useState(false); // State to control Dialog open/close
  const [showInsertCommand, setShowInsertCommand] = useState(false);

  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {/* Admin Panel Dialog Trigger */}
        <Dialog open={showAdminPanel} onOpenChange={setShowAdminPanel}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              // onClick={() => setShowAdminPanel(true)} // DialogTrigger handles opening
              className="bg-background/95 backdrop-blur-sm border-border hover:bg-muted"
              title="Painel Administrativo"
            >
              <BarChart3 className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px]"> {/* Adjust max-width as needed */}
            <DialogHeader>
              <DialogTitle>Painel Administrativo</DialogTitle>
              <DialogDescription>
                Gerencie usuários e visualize estatísticas.
              </DialogDescription>
            </DialogHeader>
            <AdminPanel /> {/* AdminPanel is now the content of the Dialog */}
          </DialogContent>
        </Dialog>

        {/* Admin Insert Command Dialog Trigger */}
        <AdminInsertCommand
          isOpen={showInsertCommand}
          onClose={() => setShowInsertCommand(false)}
        />
      </div>
    </>
  );
};

export default AdminControls;