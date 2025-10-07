import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../supabase/client';

interface MaintenanceContextType {
  isMaintenanceMode: boolean;
  isLoading: boolean;
  setMaintenanceMode: (isActive: boolean) => Promise<void>;
}

const MaintenanceContext = createContext<MaintenanceContextType | undefined>(undefined);

export const MaintenanceProvider = ({ children }: { children: ReactNode }) => {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchMaintenanceStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('maintenance')
          .select('is_active')
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116: single row not found
          console.error('Error fetching maintenance status:', error);
          return;
        }

        if (data) {
          setIsMaintenanceMode(data.is_active);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchMaintenanceStatus();

    const channel = supabase
      .channel('maintenance-status')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'maintenance' },
        (payload) => {
          const newStatus = (payload.new as { is_active: boolean }).is_active;
          setIsMaintenanceMode(newStatus);
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.warn('Realtime não disponível para monitorar modo de manutenção. Usando apenas estado inicial.');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const setMaintenanceMode = async (isActive: boolean) => {
    const { error } = await supabase
      .from('maintenance')
      .update({ is_active: isActive })
      .eq('id', 1); // Assuming a single row with id 1

    if (error) {
      console.error('Error updating maintenance status:', error);
    } else {
      setIsMaintenanceMode(isActive);
    }
  };

  return (
    <MaintenanceContext.Provider value={{ isMaintenanceMode, isLoading, setMaintenanceMode }}>
      {children}
    </MaintenanceContext.Provider>
  );
};

export const useMaintenance = () => {
  const context = useContext(MaintenanceContext);
  if (context === undefined) {
    throw new Error('useMaintenance must be used within a MaintenanceProvider');
  }
  return context;
};
