/**
 * Accurate Eorzea Time (ET) Engine and Timer Utilities
 */

const EORZEA_MULTIPLIER = 144 / 7; // Approx 20.57142857142857

export interface EorzeaTimeState {
  hours: number;
  minutes: number;
  timeString: string; // "14:05"
  period: 'day' | 'night' | 'dawn' | 'dusk';
  moonPhase: string;
}

export function calculateEorzeaTime(date = new Date()): EorzeaTimeState {
  const epoch = date.getTime();
  const eorzeaMs = epoch * EORZEA_MULTIPLIER;
  const eorzeaMinutes = Math.floor(eorzeaMs / (1000 * 60));
  
  const totalHours = Math.floor(eorzeaMinutes / 60);
  const hours = totalHours % 24;
  const minutes = eorzeaMinutes % 60;
  
  let period: 'day' | 'night' | 'dawn' | 'dusk' = 'day';
  if (hours >= 6 && hours < 8) period = 'dawn';
  else if (hours >= 8 && hours < 18) period = 'day';
  else if (hours >= 18 && hours < 20) period = 'dusk';
  else period = 'night';

  const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  
  return {
    hours,
    minutes,
    timeString,
    period,
    moonPhase: 'Full Moon',
  };
}

/**
 * Calculates remaining real-world seconds until next ET hour
 */
export function getRealSecondsUntilETHour(targetETHour: number, currentETHour: number, currentETMin: number): number {
  let diffETHours = targetETHour - currentETHour;
  if (diffETHours < 0) {
    diffETHours += 24;
  }
  
  const totalETMinutesRemaining = (diffETHours * 60) - currentETMin;
  if (totalETMinutesRemaining <= 0) return 0;
  
  // 1 ET minute = 2.916666... real seconds
  const realSeconds = totalETMinutesRemaining * (7 / 144) * 60;
  return Math.round(realSeconds);
}

/**
 * Formats seconds into "Xm Ys" or "Xs"
 */
export function formatRealTimeRemaining(seconds: number): string {
  if (seconds <= 0) return 'NOW (採集中)';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}分${secs}秒`;
  }
  return `${secs}秒`;
}
