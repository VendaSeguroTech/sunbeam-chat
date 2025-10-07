import React, { useEffect, useState } from 'react';
import { supabase } from '@/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Shield, User as UserIcon } from 'lucide-react';

interface ProfileData {
  id: string;
  email: string | null;
  name: string | null;
  role: string | null;
  last_seen: string | null;
}

const RoleDebugger: React.FC = () => {
  const [authUser, setAuthUser] = useState<any>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserData = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Buscar usuário autenticado
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) {
        setError('Nenhum usuário autenticado');
        return;
      }

      setAuthUser(user);

      // 2. Buscar dados do perfil
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          setError('Perfil não encontrado na tabela profiles');
        } else {
          throw profileError;
        }
        return;
      }

      setProfileData(profile);

    } catch (err) {
      console.error('Erro ao buscar dados:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">🔍 Debug de Role do Usuário</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchUserData}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Recarregar
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 p-3 rounded">
            ❌ {error}
          </div>
        )}

        {/* Auth User */}
        {authUser && (
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              <UserIcon className="h-4 w-4" />
              Usuário Autenticado (Supabase Auth)
            </h3>
            <div className="bg-muted p-3 rounded font-mono text-xs space-y-1">
              <p><strong>ID:</strong> {authUser.id}</p>
              <p><strong>Email:</strong> {authUser.email}</p>
              <p><strong>Email Confirmado:</strong> {authUser.email_confirmed_at ? '✅ Sim' : '❌ Não'}</p>
              <p><strong>Criado em:</strong> {new Date(authUser.created_at).toLocaleString('pt-BR')}</p>
            </div>
          </div>
        )}

        {/* Profile Data */}
        {profileData && (
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Dados do Perfil (Tabela profiles)
            </h3>
            <div className="bg-muted p-3 rounded font-mono text-xs space-y-1">
              <p><strong>ID:</strong> {profileData.id}</p>
              <p><strong>Email:</strong> {profileData.email || 'null'}</p>
              <p><strong>Nome:</strong> {profileData.name || 'null'}</p>
              <p className="flex items-center gap-2">
                <strong>Role:</strong>
                {profileData.role ? (
                  <Badge
                    variant={profileData.role === 'admin' ? 'destructive' : 'secondary'}
                    className={profileData.role === 'admin' ? 'bg-green-600' : ''}
                  >
                    {profileData.role}
                  </Badge>
                ) : (
                  <span className="text-red-500">null (PROBLEMA!)</span>
                )}
              </p>
              <p><strong>Último acesso:</strong> {profileData.last_seen ? new Date(profileData.last_seen).toLocaleString('pt-BR') : 'null'}</p>
            </div>
          </div>
        )}

        {/* Diagnóstico */}
        <div className="space-y-2">
          <h3 className="font-semibold">📋 Diagnóstico</h3>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-800 p-3 rounded text-sm space-y-2">
            {!authUser && <p>⏳ Aguardando autenticação...</p>}
            {authUser && !profileData && !loading && (
              <p className="text-red-600 dark:text-red-400">
                ❌ Perfil não encontrado! Execute este SQL no Supabase:
                <pre className="mt-2 p-2 bg-black/10 dark:bg-black/20 rounded overflow-x-auto">
                  {`INSERT INTO profiles (id, email, role)\nVALUES ('${authUser.id}', '${authUser.email}', 'admin');`}
                </pre>
              </p>
            )}
            {profileData && profileData.role === null && (
              <p className="text-yellow-600 dark:text-yellow-400">
                ⚠️ Role está NULL! Execute este SQL no Supabase:
                <pre className="mt-2 p-2 bg-black/10 dark:bg-black/20 rounded overflow-x-auto">
                  {`UPDATE profiles SET role = 'admin' WHERE id = '${profileData.id}';`}
                </pre>
              </p>
            )}
            {profileData && profileData.role === 'default' && (
              <p className="text-blue-600 dark:text-blue-400">
                ℹ️ Role está como 'default'. Para tornar admin, execute:
                <pre className="mt-2 p-2 bg-black/10 dark:bg-black/20 rounded overflow-x-auto">
                  {`UPDATE profiles SET role = 'admin' WHERE id = '${profileData.id}';`}
                </pre>
              </p>
            )}
            {profileData && profileData.role === 'admin' && (
              <p className="text-green-600 dark:text-green-400">
                ✅ Role está corretamente configurada como 'admin'!
                {!loading && ' Se o botão não aparece, recarregue a página (F5).'}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RoleDebugger;
