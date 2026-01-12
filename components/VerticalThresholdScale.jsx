export default function VerticalThresholdScale({
  min,
  max,
  thresholds,
  unit,
  side = 'left'
}) {
  const labels = [];
  const step = (max - min) / 5;
  for (let i = 0; i <= 5; i++) {
    labels.push(Math.round(min + (step * i)));
  }

  return (
    <div className={`flex ${side === 'left' ? 'flex-row' : 'flex-row-reverse'} items-center gap-2`}>
      <div className="flex flex-col justify-between h-full py-1 text-xs text-slate-400">
        {labels.reverse().map((label, idx) => (
          <div
            key={idx}
            className={`${side === 'left' ? 'text-right' : 'text-left'} w-8`}
          >
            {label}{unit}
          </div>
        ))}
      </div>

      <div className="relative w-3 h-full rounded-full overflow-hidden">
        <div className="absolute inset-0 flex flex-col">
          {thresholds.slice().reverse().map((threshold, idx) => (
            <div
              key={idx}
              className={threshold.color}
              style={{ height: threshold.width }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
