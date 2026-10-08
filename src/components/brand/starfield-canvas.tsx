"use client";

import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  r: number;
  baseAlpha: number;
  phase: number;
  speed: number;
}

/**
 * Canvas starfield: twinkling stars, a few shooting stars, drawn with
 * transform/opacity-friendly primitives. Respects prefers-reduced-motion
 * (static sky). Pauses when the tab is hidden.
 */
export function StarfieldCanvas({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let running = true;
    let stars: Star[] = [];
    let shooting: { x: number; y: number; vx: number; vy: number; life: number } | null = null;
    let nextShooting = performance.now() + 4000;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    function resize() {
      if (!canvas) return;
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);

      const density = Math.min(240, Math.floor((width * height) / 6500));
      stars = Array.from({ length: density }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.3 + 0.3,
        baseAlpha: Math.random() * 0.55 + 0.25,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.9 + 0.25,
      }));
    }

    function drawStatic() {
      if (!ctx || !canvas) return;
      const { width, height } = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);
      for (const s of stars) {
        ctx.globalAlpha = s.baseAlpha;
        ctx.fillStyle = "#e9eaf6";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function draw(time: number) {
      if (!ctx || !canvas) return;
      const { width, height } = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);

      for (const s of stars) {
        const twinkle = reduced
          ? s.baseAlpha
          : s.baseAlpha + 0.35 * Math.sin(s.phase + time * 0.001 * s.speed);
        ctx.globalAlpha = Math.max(0.05, Math.min(1, twinkle));
        ctx.fillStyle = "#e9eaf6";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Occasional shooting star (skipped in reduced motion).
      if (!reduced) {
        if (!shooting && time > nextShooting) {
          shooting = {
            x: Math.random() * width * 0.7,
            y: Math.random() * height * 0.3,
            vx: 6 + Math.random() * 4,
            vy: 2 + Math.random() * 2,
            life: 1,
          };
          nextShooting = time + 6000 + Math.random() * 9000;
        }
        if (shooting) {
          shooting.x += shooting.vx;
          shooting.y += shooting.vy;
          shooting.life -= 0.02;
          const gradient = ctx.createLinearGradient(
            shooting.x,
            shooting.y,
            shooting.x - shooting.vx * 12,
            shooting.y - shooting.vy * 12,
          );
          gradient.addColorStop(0, `rgba(124,108,255,${Math.max(0, shooting.life)})`);
          gradient.addColorStop(1, "rgba(124,108,255,0)");
          ctx.globalAlpha = 1;
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(shooting.x, shooting.y);
          ctx.lineTo(shooting.x - shooting.vx * 12, shooting.y - shooting.vy * 12);
          ctx.stroke();
          if (shooting.life <= 0 || shooting.x > width + 40) shooting = null;
        }
      }

      ctx.globalAlpha = 1;
      if (running) raf = requestAnimationFrame(draw);
    }

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    if (reduced) {
      drawStatic();
    } else {
      raf = requestAnimationFrame(draw);
    }

    const onVisibility = () => {
      running = document.visibilityState === "visible";
      if (running && !reduced) {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(draw);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden="true"
      role="presentation"
    />
  );
}
