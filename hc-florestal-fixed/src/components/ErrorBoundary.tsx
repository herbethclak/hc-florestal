import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = 'Ocorreu um erro inesperado.';
      
      try {
        // Check if the error is a FirestoreErrorInfo JSON string
        const parsed = JSON.parse(this.state.error?.message || '');
        if (parsed.error && parsed.operationType) {
          errorMessage = `Erro de Permissão (${parsed.operationType}): ${parsed.error}`;
          if (parsed.error.includes('Missing or insufficient permissions')) {
            errorMessage = "Você não tem permissão para realizar esta ação. Verifique se está logado com a conta correta.";
          }
        }
      } catch (e) {
        // Not a JSON error message
      }

      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 bg-error/10 text-error rounded-2xl flex items-center justify-center mb-6">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-2xl font-black text-on-surface mb-2">Ops! Algo deu errado.</h2>
          <p className="text-on-surface-variant font-medium mb-8 max-w-sm">
            {errorMessage}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-primary text-on-primary px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-2 shadow-lg"
          >
            <RefreshCw size={18} /> Recarregar Aplicativo
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
