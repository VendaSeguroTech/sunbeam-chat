import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Componente que redireciona para o backend SSO callback
 *
 * IMPORTANTE: O React NUNCA processa o token diretamente.
 * Apenas redireciona para o backend que faz todo o fluxo de exchange.
 *
 * Fluxo:
 * 1. Hub redireciona para: https://ia.dominio.com/?sso=1&token=XYZ&ts=123
 * 2. Este componente detecta os parâmetros
 * 3. Redireciona para: http://localhost:3002/sso/callback?sso=1&token=XYZ&ts=123
 * 4. Backend faz exchange com Hub
 * 5. Backend cria cookie HttpOnly
 * 6. Backend redireciona de volta para /chat
 */
const SSORedirect: React.FC = () => {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const sso = searchParams.get('sso');
    const token = searchParams.get('token');
    const ts = searchParams.get('ts');

    console.log('[SSORedirect] Parâmetros detectados:', { sso, token: token?.substring(0, 20) + '...', ts });

    // Se há parâmetros SSO, redirecionar para backend
    if (sso && token) {
      // Em produção, usar o mesmo domínio (proxy Nginx)
      // Em desenvolvimento, usar localhost:3002
      const API_BASE_URL = import.meta.env.VITE_SSO_API_URL ||
        (import.meta.env.MODE === 'production' ? '' : 'http://localhost:3002');

      const callbackUrl = `${API_BASE_URL}/sso/callback?sso=${encodeURIComponent(sso)}&token=${encodeURIComponent(token)}&ts=${encodeURIComponent(ts || '')}`;

      console.log('[SSO] Redirecionando para backend callback:', callbackUrl);

      // Redirecionar para o backend (que fará o exchange)
      window.location.href = callbackUrl;
    } else if (token && !sso) {
      console.warn('[SSORedirect] Token detectado mas sem sso=1! URL deve ter ?sso=1&token=...');
    } else {
      console.log('[SSORedirect] Nenhum parâmetro SSO detectado');
    }
  }, [searchParams]);

  return null; // Este componente não renderiza nada
};

export default SSORedirect;
