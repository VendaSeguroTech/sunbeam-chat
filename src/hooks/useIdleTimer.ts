import { useEffect, useRef, useCallback } from 'react';

interface UseIdleTimerOptions {
  timeout: number; // Tempo em milissegundos
  onIdle: () => void; // Callback quando o usuário ficar inativo
  events?: string[]; // Eventos que resetam o timer
}

export const useIdleTimer = ({
  timeout,
  onIdle,
  events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'],
}: UseIdleTimerOptions) => {
  const timeoutId = useRef<number | null>(null);

  const resetTimer = useCallback(() => {
    // Limpar o timer anterior
    if (timeoutId.current) {
      clearTimeout(timeoutId.current);
    }

    // Criar novo timer
    timeoutId.current = setTimeout(() => {
      onIdle();
    }, timeout);
  }, [timeout, onIdle]);

  useEffect(() => {
    // Inicializar o timer
    resetTimer();

    // Adicionar event listeners
    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    // Cleanup
    return () => {
      if (timeoutId.current) {
        clearTimeout(timeoutId.current);
      }

      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [events, resetTimer]);

  return { resetTimer };
};
