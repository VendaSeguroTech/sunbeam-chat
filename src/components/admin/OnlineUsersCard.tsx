
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePresenceContext } from '@/contexts/PresenceContext'; // Import the new context hook

const OnlineUsersCard: React.FC = () => {
  const { onlineUsers, error } = usePresenceContext(); // Use the context

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>Usuários Online (Realtime)</CardTitle>
      </CardHeader>
      <CardContent>
        {error && <p className="text-red-500">{error}</p>}
        <div className="space-y-4">
          {onlineUsers.length > 0 ? (
            onlineUsers.map((presence) => (
              <div key={presence.user_id} className="flex items-center justify-between">
                <span className="text-sm font-medium">{presence.email || 'N/A'}</span>
                <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                  Online
                </Badge>
              </div>
            ))
          ) : (
            !error && <p>Nenhum usuário online no momento.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default OnlineUsersCard;
