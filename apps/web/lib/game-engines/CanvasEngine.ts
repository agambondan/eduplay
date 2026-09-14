export interface Vector2 {
  x: number;
  y: number;
}

export interface EngineOptions {
  width: number;
  height: number;
  fixedTimestep?: number;
  pixelRatio?: number;
}

export class InputManager {
  private canvas: HTMLCanvasElement;
  private pointerPos: Vector2 = { x: 0, y: 0 };
  private isPointerDown: boolean = false;
  private pointerUpListeners: Array<(pos: Vector2) => void> = [];
  private keysPressed: Set<string> = new Set();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.init();
  }

  private init() {
    const getPos = (e: MouseEvent | Touch): Vector2 => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    };

    const handlePointerMove = (e: PointerEvent) => {
      this.pointerPos = getPos(e);
    };

    const handlePointerDown = (e: PointerEvent) => {
      this.isPointerDown = true;
      this.pointerPos = getPos(e);
    };

    const handlePointerUp = (e: PointerEvent) => {
      this.isPointerDown = false;
      this.pointerPos = getPos(e);
      this.pointerUpListeners.forEach((fn) => fn(this.pointerPos));
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      this.keysPressed.add(e.key.toLowerCase());
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      this.keysPressed.delete(e.key.toLowerCase());
    };

    this.canvas.addEventListener('pointermove', handlePointerMove);
    this.canvas.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
  }

  getPointerPosition(): Vector2 {
    return this.pointerPos;
  }

  getIsPointerDown(): boolean {
    return this.isPointerDown;
  }

  isKeyPressed(key: string): boolean {
    return this.keysPressed.has(key.toLowerCase());
  }

  onPointerUp(listener: (pos: Vector2) => void) {
    this.pointerUpListeners.push(listener);
    return () => {
      this.pointerUpListeners = this.pointerUpListeners.filter((fn) => fn !== listener);
    };
  }
}

export abstract class Entity {
  id: string = Math.random().toString(36).substring(2, 9);
  zIndex: number = 0;
  position: Vector2 = { x: 0, y: 0 };
  velocity: Vector2 = { x: 0, y: 0 };

  abstract update(dt: number, input: InputManager): void;
  abstract render(ctx: CanvasRenderingContext2D): void;
}

export class EntityManager {
  private entities: Entity[] = [];

  add(entity: Entity) {
    this.entities.push(entity);
    this.entities.sort((a, b) => a.zIndex - b.zIndex);
  }

  remove(entity: Entity) {
    this.entities = this.entities.filter((e) => e !== entity);
  }

  clear() {
    this.entities = [];
  }

  getAll(): Entity[] {
    return this.entities;
  }

  update(dt: number, input: InputManager) {
    for (const entity of this.entities) {
      entity.update(dt, input);
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    for (const entity of this.entities) {
      entity.render(ctx);
    }
  }
}

export class CanvasEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private options: EngineOptions;
  public input: InputManager;
  public entities: EntityManager;
  private animId: number | null = null;
  private lastTime: number = 0;
  private isRunning: boolean = false;
  private isPaused: boolean = false;

  constructor(canvas: HTMLCanvasElement, options: EngineOptions) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context');
    this.ctx = ctx;
    this.options = {
      fixedTimestep: 1 / 60,
      pixelRatio: 1,
      ...options,
    };
    this.input = new InputManager(canvas);
    this.entities = new EntityManager();
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isPaused = false;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    if (!this.isRunning) return;
    this.isPaused = false;
    this.lastTime = performance.now();
  }

  stop() {
    this.isRunning = false;
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  private loop = (now: number) => {
    if (!this.isRunning) return;

    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    if (!this.isPaused) {
      this.entities.update(dt, this.input);
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.entities.render(this.ctx);
    }

    this.animId = requestAnimationFrame(this.loop);
  };
}
