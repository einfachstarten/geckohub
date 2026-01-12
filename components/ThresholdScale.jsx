export default function ThresholdScale({ value, min, max, thresholds, type }) {
  const position = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  return (
    <div className="relative h-3 rounded-full overflow-hidden bg-slate-700/30">
      <div className="absolute inset-0 flex">
        {thresholds.map((threshold, idx) => (
          <div
            key={idx}
            className={`h-full ${threshold.color}`}
            style={{ width: threshold.width }}
          />
        ))}
      </div>

      <div
        className="absolute top-1/2 -translate-y-1/2 transition-all duration-500 ease-out"
        style={{ left: `${position}%` }}
      >
        <div className="relative">
          <div className="absolute left-1/2 -translate-x-1/2 w-0.5 h-8 -top-2 bg-white shadow-lg shadow-white/50" />
          <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg shadow-white/50 ring-2 ring-slate-900" />
        </div>
      </div>
    </div>
  );
}
