"use client";

export function SoundWaveform() {
  return (
    <div className="flex items-end gap-[3px] h-7" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="waveform-bar w-[4px] rounded-full bg-accent"
          style={{
            animationDelay: `${(i - 1) * 0.15}s`,
          }}
        />
      ))}
    </div>
  );
}
