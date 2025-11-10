import React, { useEffect, useRef } from 'react';

interface RacingBorderProps {
  isActive: boolean;
}

const RacingBorder: React.FC<RacingBorderProps> = ({ isActive }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    if (!isActive || !svgRef.current || !pathRef.current) return;

    // Obter dimensões reais do container
    const updatePath = () => {
      const svg = svgRef.current;
      const path = pathRef.current;
      if (!svg || !path) return;

      const rect = svg.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const radius = 24; // rounded-3xl = 1.5rem = 24px
      const offset = 1.5; // Metade da stroke-width para centralizar (3px / 2)

      // Criar path começando no canto inferior esquerdo
      const pathData = `
        M ${offset} ${height - radius - offset}
        L ${offset} ${radius + offset}
        Q ${offset} ${offset} ${radius + offset} ${offset}
        L ${width - radius - offset} ${offset}
        Q ${width - offset} ${offset} ${width - offset} ${radius + offset}
        L ${width - offset} ${height - radius - offset}
        Q ${width - offset} ${height - offset} ${width - radius - offset} ${height - offset}
        L ${radius + offset} ${height - offset}
        Q ${offset} ${height - offset} ${offset} ${height - radius - offset}
      `;

      path.setAttribute('d', pathData.trim());

      // Calcular comprimento total do path
      const pathLength = path.getTotalLength();
      path.style.strokeDasharray = `150 ${pathLength}`;
      path.style.strokeDashoffset = '0';

      // Atualizar animação com o comprimento correto
      const keyframes = `
        @keyframes snake-run-dynamic {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -${pathLength + 150}; }
        }
      `;

      // Remover animação antiga se existir
      const oldStyle = document.getElementById('snake-animation-style');
      if (oldStyle) oldStyle.remove();

      // Adicionar nova animação
      const style = document.createElement('style');
      style.id = 'snake-animation-style';
      style.textContent = keyframes;
      document.head.appendChild(style);

      path.style.animation = 'snake-run-dynamic 5s linear forwards';
    };

    updatePath();
    window.addEventListener('resize', updatePath);

    return () => {
      window.removeEventListener('resize', updatePath);
    };
  }, [isActive]);

  if (!isActive) return null;

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 20 }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="borderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8FC5ED" />
          <stop offset="20%" stopColor="#FFDBB5" />
          <stop offset="40%" stopColor="#FFC39A" />
          <stop offset="60%" stopColor="#FFAA7F" />
          <stop offset="80%" stopColor="#FF9A8A" />
          <stop offset="100%" stopColor="#D989AF" />
        </linearGradient>
      </defs>
      <path
        ref={pathRef}
        fill="none"
        stroke="url(#borderGradient)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default RacingBorder;
