'use client';

import { useEffect, useRef } from 'react';
import { CanvasEngine, EngineOptions } from './CanvasEngine';

export function useCanvasGame(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  options: EngineOptions
) {
  const engineRef = useRef<CanvasEngine | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new CanvasEngine(canvas, options);
    engineRef.current = engine;

    return () => {
      engine.stop();
      engineRef.current = null;
    };
  }, [options.width, options.height]);

  return engineRef;
}
