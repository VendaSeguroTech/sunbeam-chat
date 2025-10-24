import React from 'react';
import { ExternalLink } from 'lucide-react';

/**
 * Página de login SSO
 *
 * Mostra CTA para o usuário entrar pelo Hub VendaSeguro
 * Nunca processa token diretamente no frontend
 */
const LoginSSO: React.FC = () => {
  const hubUrl = 'https://hub.vendaseguro.com.br';

  return (
    <div className="min-h-screen bg-gradient-to-br from-novo-chat to-blue-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img
            src="/src/assets/experta-logo.png"
            alt="Experta IA"
            className="h-16"
          />
        </div>

        {/* Título */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Acesso via Hub VendaSeguro
          </h1>
          <p className="text-gray-600">
            Para usar a IA Experta, faça login no Hub e clique no card da IA.
          </p>
        </div>

        {/* Instruções */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="text-sm font-semibold text-blue-900 mb-2">
            Como acessar:
          </h2>
          <ol className="text-sm text-blue-800 space-y-2">
            <li className="flex items-start">
              <span className="font-semibold mr-2">1.</span>
              <span>Faça login no Hub VendaSeguro</span>
            </li>
            <li className="flex items-start">
              <span className="font-semibold mr-2">2.</span>
              <span>Encontre o card "IA Experta" na sua dashboard</span>
            </li>
            <li className="flex items-start">
              <span className="font-semibold mr-2">3.</span>
              <span>Clique no card para entrar automaticamente</span>
            </li>
          </ol>
        </div>

        {/* CTA Button */}
        <a
          href={hubUrl}
          className="w-full flex items-center justify-center gap-2 bg-novo-chat hover:bg-novo-chat/90 text-white font-medium py-3 px-4 rounded-lg transition-colors"
        >
          <span>Ir para o Hub VendaSeguro</span>
          <ExternalLink className="w-4 h-4" />
        </a>

        {/* Nota de segurança */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            🔒 Autenticação segura via Single Sign-On (SSO)
          </p>
        </div>

        {/* Suporte */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-600 mb-2">Precisa de ajuda?</p>
          <a
            href="mailto:suporte@vendaseguro.com.br"
            className="text-sm text-novo-chat hover:underline"
          >
            Entre em contato com o suporte
          </a>
        </div>
      </div>
    </div>
  );
};

export default LoginSSO;
