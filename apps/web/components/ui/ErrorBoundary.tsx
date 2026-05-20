'use client';

import { Component, ErrorInfo, ReactNode } from 'react';
import { I18nContext } from '@/lib/i18n';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  static contextType = I18nContext;
  declare context: React.ContextType<typeof I18nContext>;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          role="alert"
          className="flex min-h-[300px] flex-col items-center justify-center gap-4 rounded-xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-800 dark:bg-red-900/20"
        >
          <div className="text-4xl">!</div>
          <h2 className="text-xl font-bold text-red-700 dark:text-red-400">
            {this.context.t('common.error')}
          </h2>
          <p className="max-w-md text-sm text-red-600 dark:text-red-300">
            {this.context.t('common.error_desc')}
          </p>
          <button
            onClick={this.handleRetry}
            className="rounded-lg bg-red-600 px-6 py-2 font-bold text-white transition-colors hover:bg-red-700"
          >
            {this.context.t('common.retry')}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
