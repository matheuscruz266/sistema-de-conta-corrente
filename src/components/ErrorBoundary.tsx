import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center shadow-lg">
            <div className="h-12 w-12 mx-auto rounded-full bg-rose-100 dark:bg-rose-950 flex items-center justify-center text-rose-600 mb-4">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
              Algo deu errado
            </h2>
            <p className="text-sm text-slate-500 mb-1">
              Ocorreu um erro inesperado ao processar sua solicitação.
            </p>
            {this.state.error?.message && (
              <p className="text-xs text-slate-400 mb-4 font-mono bg-slate-100 dark:bg-slate-800 p-2 rounded break-all">
                {this.state.error.message}
              </p>
            )}
            <div className="flex gap-2 justify-center mt-4">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-semibold transition-colors"
              >
                Tentar Novamente
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Recarregar Página
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
