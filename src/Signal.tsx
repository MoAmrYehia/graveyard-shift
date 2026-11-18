import { useEffect, useRef } from 'react';

type Point = [number, number];

// An isometric picture of the ledger. The amber copy fades out after a verified repair.
export function Signal({ resolved }: { resolved: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const context = node.getContext('2d');
    if (!context) return;
    const ctx = context;
    const width = 560,
      height = 282;
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    node.width = width * scale;
    node.height = height * scale;
    ctx.scale(scale, scale);
    const path = (points: Point[], stroke: string, fill?: string, line = 1) => {
      ctx.beginPath();
      points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      if (fill) {
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
      }
      ctx.strokeStyle = stroke;
      ctx.lineWidth = line;
      ctx.stroke();
    };
    const p = (x: number, y: number, z = 0): Point => [
      270 + (x - y) * 1.01,
      204 + (x + y) * 0.42 - z,
    ];
    const line = (a: Point, b: Point, color: string, weight = 1) =>
      path([a, b], color, undefined, weight);
    const glow = ctx.createRadialGradient(310, 144, 8, 310, 144, 220);
    glow.addColorStop(0, '#243f32');
    glow.addColorStop(0.55, '#12251e');
    glow.addColorStop(1, 'rgba(12,23,19,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
    for (let n = -310; n < 320; n += 23) {
      line(p(n, -230), p(n, 240), '#2c4b3d66', 0.7);
      line(p(-250, n), p(290, n), '#2c4b3d66', 0.7);
    }
    function rack(x: number, y: number, ghost: boolean) {
      const ink = ghost ? (resolved ? '#597364' : '#ffad73') : '#ace2b5';
      const edge = ghost ? (resolved ? '#40564c' : '#ac674c') : '#679780';
      const front = ghost ? (resolved ? '#17271f' : '#42332a') : '#253e32';
      const side = ghost ? (resolved ? '#13221c' : '#302a22') : '#142a21';
      const top = ghost ? (resolved ? '#21352a' : '#544033') : '#375543';
      const iso = (a: number, b: number, z: number) => p(x + a, y + b, z);
      const w = 67,
        d = 42;
      const box = (z: number, h: number) => {
        path([iso(0, d, z + h), iso(w, d, z + h), iso(w, d, z), iso(0, d, z)], edge, front);
        path([iso(w, 0, z + h), iso(w, d, z + h), iso(w, d, z), iso(w, 0, z)], edge, side);
        path([iso(0, 0, z + h), iso(w, 0, z + h), iso(w, d, z + h), iso(0, d, z + h)], edge, top);
      };
      box(0, 5);
      for (let k = 0; k < 6; k++) {
        const z = 10 + k * 17;
        box(z, 12);
        for (let j = 0; j < 11; j++)
          line(iso(5 + j * 3.1, d + 0.2, z + 7), iso(5 + j * 3.1, d + 0.2, z + 3), edge, 0.9);
        for (let j = 0; j < 3; j++)
          line(iso(51 + j * 4, d + 0.2, z + 6), iso(53 + j * 4, d + 0.2, z + 6), ink, 1.65);
        for (let j = 0; j < 5; j++)
          line(iso(w, j * 6 + 4, z + 6), iso(w, j * 6 + 8, z + 6), edge, 0.8);
      }
      for (let j = 0; j < 9; j++)
        line(iso(12 + j * 4, 8, 107), iso(12 + j * 4, 29, 107), edge, 0.8);
      path(
        [iso(0, 0, 107), iso(w, 0, 107), iso(w, d, 107), iso(0, d, 107), iso(0, 0, 107)],
        ink,
        undefined,
        1.3,
      );
    }
    function cable(points: Point[], color: string) {
      path(points, color, undefined, 1.4);
      const [x, y] = points[points.length - 1];
      ctx.fillStyle = color;
      ctx.fillRect(x - 2, y - 2, 4, 4);
    }
    cable([p(-52, 0), p(-52, 61), p(-110, 61), p(-110, 94)], '#91b891');
    cable([p(62, -25), p(102, -25), p(102, 30), p(143, 30)], resolved ? '#425648' : '#c1805a');
    rack(-52, -22, false);
    rack(64, -46, true);
    const labels = [
      {
        at: p(-33, 15, 117),
        to: [174, 52] as Point,
        text: 'SOURCE / 01',
        color: '#c4e5c9',
        x: 110,
      },
      {
        at: p(100, -29, 118),
        to: [436, 65] as Point,
        text: resolved ? 'VERIFIED' : 'ECHO / 02',
        color: resolved ? '#7c9b88' : '#ffc095',
        x: 440,
      },
    ];
    labels.forEach(({ at, to, text, color, x }) => {
      line(at, to, color, 0.7);
      ctx.fillStyle = color;
      ctx.fillRect(at[0] - 1.4, at[1] - 1.4, 2.8, 2.8);
      ctx.font = '9px monospace';
      ctx.fillText(text, x, to[1] - 5);
    });
    for (let y = 1; y < height; y += 4) {
      ctx.fillStyle = 'rgba(8,14,12,.07)';
      ctx.fillRect(0, y, width, 1);
    }
  }, [resolved]);
  return (
    <canvas
      className="signal-art"
      ref={ref}
      role="img"
      aria-label={
        resolved
          ? 'Ledger signal restored after replay'
          : 'Two isometric server stacks represent the ledger and its repeated delivery'
      }
    />
  );
}
