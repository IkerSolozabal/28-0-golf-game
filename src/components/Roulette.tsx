import Box from '@mui/material/Box';
import { useEffect, useRef, useState } from 'react';

/** Props for {@link Roulette}. */
export interface RouletteProps {
  /** Short labels, one per wheel segment. */
  labels: string[];
  /** Segment the wheel must stop on (null = idle). */
  targetIndex: number | null;
  /** Changes every spin to trigger a new animation. */
  spinId: number;
  /** Called when the wheel stops. */
  onDone?: () => void;
  size?: number;
}

const COLORS = ['#1F4D3A', '#F1EBDB', '#2F6A50', '#E7DEC6'];
const TEXT = ['#F6F3EA', '#1F4D3A', '#F6F3EA', '#1F4D3A'];
const DURATION_MS = 3200;

/**
 * Animated SVG roulette. The wheel rotates several full turns and stops with the
 * `targetIndex` segment under the pointer at 12 o'clock.
 */
export function Roulette({ labels, targetIndex, spinId, onDone, size = 240 }: RouletteProps) {
  const [rotation, setRotation] = useState(0);
  const lastSpin = useRef(0);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const n = Math.max(labels.length, 1);
  const seg = 360 / n;
  const reduceMotion =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const duration = reduceMotion ? 300 : DURATION_MS;

  useEffect(() => {
    if (targetIndex == null || spinId === lastSpin.current) return;
    lastSpin.current = spinId;
    setRotation((current) => {
      const desired = (360 - (targetIndex + 0.5) * seg) % 360;
      const delta = (desired - (current % 360) + 360) % 360;
      return current + 360 * 5 + delta;
    });
    const t = window.setTimeout(() => doneRef.current?.(), duration + 50);
    return () => window.clearTimeout(t);
  }, [spinId, targetIndex, seg, duration]);

  const r = 100;
  const polar = (deg: number, radius: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [r + radius * Math.cos(rad), r + radius * Math.sin(rad)];
  };

  return (
    <Box sx={{ position: 'relative', width: size, height: size, mx: 'auto' }}>
      {/* Pointer */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          top: -6,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '11px solid transparent',
          borderRight: '11px solid transparent',
          borderTop: '18px solid',
          borderTopColor: 'secondary.main',
          zIndex: 2,
          filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.2))',
        }}
      />
      <svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        role="img"
        aria-label="Ruleta del draft"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: `transform ${duration}ms cubic-bezier(0.15, 0.7, 0.1, 1)`,
          filter: 'drop-shadow(0 6px 14px rgba(31,77,58,.18))',
        }}
      >
        <circle cx={r} cy={r} r={r} fill="#1F4D3A" />
        {labels.map((label, i) => {
          const a0 = i * seg;
          const a1 = (i + 1) * seg;
          const [x0, y0] = polar(a0, r - 4);
          const [x1, y1] = polar(a1, r - 4);
          const mid = a0 + seg / 2;
          const [tx, ty] = polar(mid, r * 0.62);
          return (
            <g key={i}>
              <path
                d={`M ${r} ${r} L ${x0} ${y0} A ${r - 4} ${r - 4} 0 ${seg > 180 ? 1 : 0} 1 ${x1} ${y1} Z`}
                fill={COLORS[i % COLORS.length]}
                stroke="#FFFDF8"
                strokeWidth={0.6}
              />
              <text
                x={tx}
                y={ty}
                fill={TEXT[i % TEXT.length]}
                fontSize={n > 8 ? 8 : 9.5}
                fontWeight={700}
                fontFamily="Inter, sans-serif"
                textAnchor="middle"
                dominantBaseline="middle"
                transform={`rotate(${mid} ${tx} ${ty})`}
              >
                {label}
              </text>
            </g>
          );
        })}
        <circle cx={r} cy={r} r={16} fill="#FFFDF8" stroke="#B08D57" strokeWidth={2} />
        <circle cx={r} cy={r} r={5} fill="#1F4D3A" />
      </svg>
    </Box>
  );
}
