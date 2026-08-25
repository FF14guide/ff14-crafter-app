import React, { useState, useEffect } from 'react';

interface ActionIconProps {
  icon?: string; // official icon URL
  fallbackIcon?: string; // emoji glyph shown if the image fails to load
  name?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const SIZE_MAP = {
  xs: 'w-4 h-4 text-xs rounded',
  sm: 'w-6 h-6 text-sm rounded',
  md: 'w-8 h-8 text-base rounded-md',
  lg: 'w-10 h-10 text-xl rounded-lg',
  xl: 'w-12 h-12 text-2xl rounded-xl',
};

const IMG_SIZE_MAP = {
  xs: 'w-4 h-4',
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
  xl: 'w-12 h-12',
};

export const ActionIcon: React.FC<ActionIconProps> = ({
  icon,
  fallbackIcon,
  name,
  className = '',
  size = 'md',
}) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [icon]);

  const hasImage = Boolean(icon) && !imgError;

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 overflow-hidden border border-slate-700/80 bg-slate-950 shadow-sm ${SIZE_MAP[size]} ${className}`}
      title={name}
    >
      {hasImage ? (
        <img
          key={icon}
          src={icon}
          alt={name || 'FF14 Action'}
          loading="lazy"
          referrerPolicy="no-referrer"
          className={`${IMG_SIZE_MAP[size]} object-contain drop-shadow`}
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="select-none flex items-center justify-center">{fallbackIcon || '❓'}</span>
      )}
    </div>
  );
};
