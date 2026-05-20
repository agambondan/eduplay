declare module 'framer-motion' {
  import { ComponentType, ReactNode, HTMLAttributes } from 'react';

  interface MotionProps {
    initial?: Record<string, unknown> | boolean;
    animate?: Record<string, unknown>;
    exit?: Record<string, unknown>;
    transition?: Record<string, unknown>;
    key?: string | number;
    layout?: boolean | string;
    layoutId?: string;
    variants?: Record<string, unknown>;
    whileHover?: Record<string, unknown>;
    whileTap?: Record<string, unknown>;
    whileInView?: Record<string, unknown>;
    className?: string;
    style?: Record<string, unknown>;
    children?: ReactNode;
    ref?: unknown;
  }

  type MotionDiv = ComponentType<MotionProps & HTMLAttributes<HTMLDivElement>>;

  export const motion: {
    div: MotionDiv;
    span: ComponentType<MotionProps & HTMLAttributes<HTMLSpanElement>>;
    button: ComponentType<MotionProps & HTMLAttributes<HTMLButtonElement>>;
  };

  export const AnimatePresence: ComponentType<{
    children?: ReactNode;
    mode?: 'wait' | 'sync' | 'popLayout';
  }>;
}
