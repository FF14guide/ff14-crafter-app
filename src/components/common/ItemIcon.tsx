import React, { useState } from 'react';
import { getItemIconUrl, getFallbackEmoji } from '../../utils/itemIcons';

interface ItemIconProps {
  itemId?: number;
  icon?: string;
  name?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isHq?: boolean;
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

export const ItemIcon: React.FC<ItemIconProps> = ({
  itemId,
  icon,
  name,
  className = '',
  size = 'md',
  isHq = false,
}) => {
  const [imgError, setImgError] = useState(false);

  // Resolves official XIVAPI / Garland Tools / Lodestone icon URL using Name and/or ID
  const iconUrl = getItemIconUrl(itemId, name, icon);

  const fallback = icon && !icon.startsWith('http') && !icon.startsWith('/')
    ? icon
    : getFallbackEmoji(name);

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 overflow-hidden border border-slate-700/80 bg-slate-950 shadow-sm ${SIZE_MAP[size]} ${className}`}
      title={name || (itemId ? `Item #${itemId}` : 'Item')}
    >
      {!imgError && iconUrl ? (
        <img
          src={iconUrl}
          alt={name || 'FF14 Item'}
          loading="lazy"
          referrerPolicy="no-referrer"
          className={`${IMG_SIZE_MAP[size]} object-contain drop-shadow`}
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="select-none flex items-center justify-center">{fallback}</span>
      )}

      {isHq && (
        <span className="absolute bottom-0 right-0 text-[8px] leading-none bg-amber-500 text-slate-950 font-bold px-0.5 rounded-tl font-rajdhani shadow">
          HQ
        </span>
      )}
    </div>
  );
};
