import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = "Carregando...",
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  return (
    <div className="flex items-center justify-center h-screen bg-white">
      <div className="text-center">
        {/* Spinner fino com cor gray-800 */}
        <div className={`${sizeClasses[size]} border-2 border-gray-800 border-t-transparent rounded-full animate-spin mx-auto mb-4`} />
        <p className="text-sm text-gray-600 font-light">{message}</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;
