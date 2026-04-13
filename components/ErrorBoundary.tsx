import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center p-12 bg-red-50 rounded-[2rem] border-2 border-red-100 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <h2 className="text-xl font-black text-red-900 uppercase tracking-tight mb-2">Une erreur est survenue</h2>
          <p className="text-sm text-red-700 mb-6 max-w-md">
            Le module n'a pas pu être chargé correctement. Cela peut être dû à une connexion instable ou à un problème de cache.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-red-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
          >
            Actualiser la page
          </button>
          {process.env.NODE_ENV === 'development' && (
            <pre className="mt-8 p-4 bg-white rounded-lg text-left text-[10px] overflow-auto max-w-full border border-red-200 text-red-500">
              {this.state.error?.stack}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
