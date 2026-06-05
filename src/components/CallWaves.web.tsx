import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, useWindowDimensions, ViewStyle } from 'react-native';

type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

interface Props {
  state: VoiceState;
  /** 0..1 live mic level — scales twist amplitude + ribbon width. */
  amplitude?: number;
  containerStyle?: ViewStyle;
  height?: number;
}

const STATE_VOL: Record<VoiceState, number> = {
  idle: 0.2,
  listening: 0.6,
  processing: 0.4,
  speaking: 1.0,
};

// Spec palette: amber → magenta → cobalt → emerald.
const STOPS: { p: number; c: [number, number, number] }[] = [
  { p: 0.0, c: [228, 161, 52] },
  { p: 0.3, c: [213, 55, 176] },
  { p: 0.65, c: [0, 89, 255] },
  { p: 1.0, c: [0, 195, 99] },
];
function colorAt(x: number): [number, number, number] {
  const t = Math.max(0, Math.min(1, x));
  for (let i = 1; i < STOPS.length; i++) {
    if (t <= STOPS[i].p) {
      const a = STOPS[i - 1], b = STOPS[i];
      const f = (t - a.p) / (b.p - a.p);
      return [a.c[0] + (b.c[0] - a.c[0]) * f, a.c[1] + (b.c[1] - a.c[1]) * f, a.c[2] + (b.c[2] - a.c[2]) * f];
    }
  }
  return STOPS[STOPS.length - 1].c;
}

function makeSprite(rgb: [number, number, number], d = 28): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = d; c.height = d;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(d / 2, d / 2, 0, d / 2, d / 2, d / 2);
  grad.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},1)`);
  grad.addColorStop(0.4, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.55)`);
  grad.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, d, d);
  return c;
}

interface P {
  a: number;     // 0..1 along the ribbon
  w: number;     // -1..1 across the ribbon width
  size: number;
  op: number;
  drift: number;
  seed: number;
  ci: number;    // sprite color index
}

export function CallWaves({ state, amplitude, containerStyle, height = 160 }: Props) {
  const { width } = useWindowDimensions();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const volRef = useRef(STATE_VOL[state]);

  useEffect(() => {
    volRef.current = amplitude != null ? amplitude : (STATE_VOL[state] ?? 0.3);
  }, [state, amplitude]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = width;
    const H = height;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const SPRITES = Array.from({ length: 11 }, (_, i) => makeSprite(colorAt(i / 10)));
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    STOPS.forEach(s => grad.addColorStop(s.p, `rgb(${s.c[0]},${s.c[1]},${s.c[2]})`));

    const cy = H / 2;
    // Twist: how many half-rotations of the ribbon across the width.
    const twistFreq = (Math.PI * 2 * 2.3) / W;
    const twistSpeed = 0.5;

    // Dense ribbon surface: fill (along × across) with particles.
    const N = 1300;
    const parts: P[] = Array.from({ length: N }, () => {
      const a = Math.random();
      return {
        a,
        w: Math.random() * 2 - 1,
        size: 1.2 + Math.random() * 2.6,
        op: 0.25 + Math.random() * 0.75,
        drift: 0.4 + Math.random() * 1.4,
        seed: Math.random() * Math.PI * 2,
        ci: Math.round(a * 10),
      };
    });

    let vol = volRef.current;
    let raf = 0;
    const start = performance.now();

    // gentle overall undulation of the ribbon's centerline
    const centerY = (xPx: number, t: number, A: number) =>
      cy + A * Math.sin((Math.PI * 2 * 1.2 / W) * xPx + 0.6 * t)
         + A * 0.35 * Math.sin((Math.PI * 2 * 2.6 / W) * xPx - 0.9 * t);

    const draw = () => {
      const t = (performance.now() - start) / 1000;
      vol += (volRef.current - vol) * 0.06;
      const v = 0.15 + vol * 0.85;

      const A = 14 + v * 18;       // centerline wave amplitude
      const halfW = 26 + v * 34;   // ribbon half-thickness

      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';

      // Soft ambient bloom following the centerline
      ctx.save();
      ctx.filter = 'blur(26px)';
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = grad;
      ctx.lineWidth = 34;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let x = 0; x <= W; x += 10) {
        const y = centerY(x, t, A);
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();

      // The twisting 3D ribbon, rendered as a depth-shaded particle field.
      for (const p of parts) {
        const x = p.a * W;
        const phi = x * twistFreq + t * twistSpeed;       // local twist angle
        const cosp = Math.cos(phi);
        const sinp = Math.sin(phi);
        const yc = centerY(x, t, A);
        // across-ribbon offset is foreshortened by cos(phi) → pinches edge-on
        const y = yc + p.w * halfW * cosp + Math.sin(p.drift * t + p.seed) * 4;
        const z = p.w * sinp;                              // depth -1 (back) .. 1 (front)
        const depth = (z + 1) * 0.5;                       // 0 back .. 1 front
        const bright = 0.3 + 0.7 * depth;                  // front particles brighter
        const s = (p.size * (0.6 + 0.6 * depth)) + v * 1.0;
        const twinkle = 0.55 + 0.45 * Math.sin(t * p.drift * 1.5 + p.seed);
        ctx.globalAlpha = Math.max(0, Math.min(1, p.op * twinkle * bright));
        ctx.drawImage(SPRITES[p.ci], x - s, y - s, s * 2, s * 2);
      }

      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [width, height]);

  return (
    <View style={[styles.default, containerStyle]} pointerEvents="none">
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  default: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 160,
    zIndex: 2,
  },
});
