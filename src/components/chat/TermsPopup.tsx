import React from 'react';
import { Button } from '@/components/ui/button';

interface TermsPopupProps {
  isOpen: boolean;
  onAccept: () => void;
}

const TermsPopup: React.FC<TermsPopupProps> = ({ isOpen, onAccept }) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop/Overlay */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] animate-in fade-in duration-300" />

      {/* Popup Container */}
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
        <div
          className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-900">
              Termos de Uso e Política de Privacidade
            </h2>
          </div>

          {/* Content - Scrollable */}
          <div className="px-6 py-4 overflow-y-auto flex-1">
            <div className="space-y-4 text-gray-700">
              <p className="text-sm leading-relaxed">
                Bem-vindo ao <strong>Experta Chat</strong>! Antes de continuar, pedimos que leia e aceite nossos termos de uso.
              </p>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900">1. Uso do Sistema</h3>
                <p className="text-sm leading-relaxed">
                  O Experta Chat é uma ferramenta de assistência baseada em inteligência artificial.
                  O sistema foi desenvolvido para auxiliar em consultas e fornecer informações com base
                  em nossa base de conhecimento especializada.
                </p>

                <h3 className="text-lg font-semibold text-gray-900">2. Responsabilidades do Usuário</h3>
                <ul className="list-disc list-inside space-y-2 text-sm leading-relaxed ml-4">
                  <li>Utilizar o sistema de forma ética e profissional</li>
                  <li>Não compartilhar informações confidenciais ou sensíveis</li>
                  <li>Manter suas credenciais de acesso em sigilo</li>
                  <li>Respeitar as limitações técnicas do sistema</li>
                </ul>

                <h3 className="text-lg font-semibold text-gray-900">3. Privacidade e Dados</h3>
                <p className="text-sm leading-relaxed">
                  Suas conversas são armazenadas de forma segura e utilizadas exclusivamente para melhorar
                  a qualidade do serviço. Não compartilhamos seus dados com terceiros sem autorização expressa.
                </p>

                <h3 className="text-lg font-semibold text-gray-900">4. Limitações</h3>
                <p className="text-sm leading-relaxed">
                  O sistema fornece informações com base em sua base de conhecimento, mas não substitui
                  orientação profissional especializada. Sempre consulte profissionais qualificados para
                  decisões críticas.
                </p>

                <h3 className="text-lg font-semibold text-gray-900">5. Modificações</h3>
                <p className="text-sm leading-relaxed">
                  Reservamo-nos o direito de modificar estes termos a qualquer momento. Usuários serão
                  notificados sobre alterações significativas.
                </p>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-900 leading-relaxed">
                  <strong>Importante:</strong> Ao clicar em "Concordar e Continuar", você confirma que leu,
                  compreendeu e aceita os termos acima descritos.
                </p>
              </div>
            </div>
          </div>

          {/* Footer com botão */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <Button
              onClick={onAccept}
              className="w-full bg-novo-chat hover:bg-novo-chat/90 text-white font-medium py-3 rounded-lg transition-all duration-200 hover:shadow-lg"
            >
              Concordar e Continuar
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default TermsPopup;
