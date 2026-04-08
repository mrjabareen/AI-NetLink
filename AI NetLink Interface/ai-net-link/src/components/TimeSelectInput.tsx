import React from 'react';

type TimeSelectInputProps = {
  value: string;
  onChange: (value: string) => void;
  isRTL: boolean;
};

const HOURS_12 = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'));
const SECONDS = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'));

const normalizeTimeString = (value: string) => value.replace(/[^\d:]/g, '').slice(0, 8);

const parseTime = (value: string) => {
  const normalized = normalizeTimeString(value);
  const [rawHours = '00', rawMinutes = '00', rawSeconds = '00'] = normalized.split(':');
  const hours24 = Math.min(23, Math.max(0, parseInt(rawHours, 10) || 0));
  const minutes = Math.min(59, Math.max(0, parseInt(rawMinutes, 10) || 0));
  const seconds = Math.min(59, Math.max(0, parseInt(rawSeconds, 10) || 0));
  const period = hours24 >= 12 ? 'pm' : 'am';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;

  return {
    hour: String(hours12).padStart(2, '0'),
    minute: String(minutes).padStart(2, '0'),
    second: String(seconds).padStart(2, '0'),
    period,
  };
};

const formatTo24Hour = (hour12: string, minute: string, second: string, period: string) => {
  const parsedHour = Math.min(12, Math.max(1, parseInt(hour12, 10) || 12));
  let hours24 = parsedHour % 12;
  if (period === 'pm') hours24 += 12;

  return `${String(hours24).padStart(2, '0')}:${String(parseInt(minute, 10) || 0).padStart(2, '0')}:${String(parseInt(second, 10) || 0).padStart(2, '0')}`;
};

export default function TimeSelectInput({ value, onChange, isRTL }: TimeSelectInputProps) {
  const parsed = React.useMemo(() => parseTime(value || '23:59:59'), [value]);

  const updateTime = (next: Partial<typeof parsed>) => {
    const merged = { ...parsed, ...next };
    onChange(formatTo24Hour(merged.hour, merged.minute, merged.second, merged.period));
  };

  const selectClassName = 'w-full bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-3 text-sm font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all';
  const fieldLabelClassName = 'text-[11px] font-black text-slate-500 dark:text-slate-400 text-center';

  return (
    <div className="grid grid-cols-4 gap-2" dir="ltr">
      <div className="space-y-1">
        <p className={fieldLabelClassName}>{isRTL ? 'ساعة' : 'Hour'}</p>
        <select
          lang="en"
          value={parsed.hour}
          onChange={(e) => updateTime({ hour: e.target.value })}
          className={selectClassName}
        >
          {HOURS_12.map((hour) => (
            <option key={hour} value={hour}>{hour}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <p className={fieldLabelClassName}>{isRTL ? 'دقيقة' : 'Minute'}</p>
        <select
          lang="en"
          value={parsed.minute}
          onChange={(e) => updateTime({ minute: e.target.value })}
          className={selectClassName}
        >
          {MINUTES.map((minute) => (
            <option key={minute} value={minute}>{minute}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <p className={fieldLabelClassName}>{isRTL ? 'ثانية' : 'Second'}</p>
        <select
          lang="en"
          value={parsed.second}
          onChange={(e) => updateTime({ second: e.target.value })}
          className={selectClassName}
        >
          {SECONDS.map((second) => (
            <option key={second} value={second}>{second}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <p className={fieldLabelClassName}>{isRTL ? 'الفترة' : 'Period'}</p>
        <select
          lang="en"
          value={parsed.period}
          onChange={(e) => updateTime({ period: e.target.value })}
          className={selectClassName}
        >
          <option value="am">{isRTL ? 'ص' : 'AM'}</option>
          <option value="pm">{isRTL ? 'م' : 'PM'}</option>
        </select>
      </div>
    </div>
  );
}
