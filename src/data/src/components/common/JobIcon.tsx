import React, { useState } from 'react';
import { CraftJob, CRAFT_JOBS } from '../../types/ff14';
import { getJobIconUrl, getFallbackJobEmoji } from '../../utils/itemIcons';

interface JobIconProps {
  job: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  className?: string;
  badge?: boolean;
}

const SIZE_MAP = {
  xs: 'w-3.5 h-3.5',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
};

const CONTAINER_SIZE_MAP = {
  xs: 'w-4 h-4 text-[10px]',
  sm: 'w-5 h-5 text-xs',
  md: 'w-6 h-6 text-sm',
  lg: 'w-7 h-7 text-base',
  xl: 'w-9 h-9 text-lg',
};

export const JobIcon: React.FC<JobIconProps> = ({
  job,
  size = 'md',
  showLabel = false,
  className = '',
  badge = false,
}) => {
  const [imgError, setImgError] = useState(false);
  const iconUrl = getJobIconUrl(job);
  const fallbackEmoji = getFallbackJobEmoji(job);
  const craftJobInfo = CRAFT_JOBS[job as CraftJob];
  const jobName = craftJobInfo ? craftJobInfo.name : job;

  const iconElement = (
    <div
      className={`inline-flex items-center justify-center shrink-0 ${
        badge
          ? `${CONTAINER_SIZE_MAP[size]} rounded bg-slate-950/80 border border-slate-700/80 p-0.5 shadow-sm`
          : ''
      } ${className}`}
      title={jobName}
    >
      {!imgError && iconUrl ? (
        <img
          src={iconUrl}
          alt={job}
          referrerPolicy="no-referrer"
          loading="lazy"
          className={`${SIZE_MAP[size]} object-contain drop-shadow`}
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="select-none leading-none">{fallbackEmoji}</span>
      )}
    </div>
  );

  if (showLabel) {
    return (
      <span className="inline-flex items-center gap-1.5 font-medium">
        {iconElement}
        <span className="font-rajdhani font-semibold">{job}</span>
      </span>
    );
  }

  return iconElement;
};
