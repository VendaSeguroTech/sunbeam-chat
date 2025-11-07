import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import popupImage1 from '@/assets/popup.png';
import popupImage2 from '@/assets/popup-2.png';

interface PopupModoExpertaProps {
  isOpen: boolean;
  onClose: () => void;
}

const PopupModoExperta: React.FC<PopupModoExpertaProps> = ({ isOpen, onClose }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const slides = [popupImage1, popupImage2];

  // Pré-carregar todas as imagens antes de exibir o popup
  useEffect(() => {
    const preloadImages = async () => {
      const imagePromises = slides.map((src) => {
        return new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => reject();
          img.src = src;
        });
      });

      try {
        await Promise.all(imagePromises);
        setImagesLoaded(true);
      } catch (error) {
        console.error('Erro ao carregar imagens do popup:', error);
        setImagesLoaded(true); // Mostrar mesmo assim em caso de erro
      }
    };

    preloadImages();
  }, []);

  // Rotação automática a cada 3 segundos
  useEffect(() => {
    if (!isOpen || !imagesLoaded) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [isOpen, imagesLoaded, slides.length]);

  // Fechar automaticamente após 8 segundos
  useEffect(() => {
    if (!isOpen || !imagesLoaded) return;

    const timeout = setTimeout(() => {
      onClose();
    }, 8000);

    return () => clearTimeout(timeout);
  }, [isOpen, imagesLoaded, onClose]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  if (!isOpen || !imagesLoaded) return null;

  return (
    <>
      {/* Backdrop/Overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Popup Container */}
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="relative bg-transparent rounded-2xl shadow-2xl max-w-md w-full pointer-events-auto animate-in zoom-in-95 duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Botão de fechar no canto superior direito */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-6 h-6 bg-white/50 backdrop-blur-sm hover:bg-white/75 rounded-full shadow-lg transition-all duration-200 hover:scale-110 z-10 flex items-center justify-center group"
            aria-label="Fechar popup"
          >
            {/* Ícone 'X' para fechar */}
            <span className="text-gray-800 text-lg font-bold group-hover:text-black transition-colors">
              ×
            </span>
          </button>

          {/* Seta Esquerda */}
          <button
            onClick={prevSlide}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-white/70 backdrop-blur-sm hover:bg-white/90 rounded-full shadow-lg transition-all duration-200 hover:scale-110 z-10 flex items-center justify-center group"
            aria-label="Slide anterior"
          >
            <ChevronLeft className="w-3 h-3 text-gray-800 group-hover:text-black transition-colors" />
          </button>

          {/* Seta Direita */}
          <button
            onClick={nextSlide}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-white/70 backdrop-blur-sm hover:bg-white/90 rounded-full shadow-lg transition-all duration-200 hover:scale-110 z-10 flex items-center justify-center group"
            aria-label="Próximo slide"
          >
            <ChevronRight className="w-3 h-3 text-gray-800 group-hover:text-black transition-colors" />
          </button>

          {/* Imagem do popup com transição */}
          <div className="relative overflow-hidden rounded-2xl">
            {slides.map((slide, index) => (
              <img
                key={index}
                src={slide}
                alt={`Modo Experta - Slide ${index + 1}`}
                className={`w-full h-auto rounded-2xl transition-opacity duration-500 ${
                  index === currentSlide ? 'opacity-100' : 'opacity-0 absolute inset-0'
                }`}
                loading="eager"
                decoding="sync"
                fetchPriority="high"
                style={{ imageRendering: 'high-quality' }}
              />
            ))}
          </div>

          {/* Indicadores de slide (bolinhas) */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentSlide
                    ? 'bg-white w-6'
                    : 'bg-white/50 hover:bg-white/75'
                }`}
                aria-label={`Ir para slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default PopupModoExperta;
