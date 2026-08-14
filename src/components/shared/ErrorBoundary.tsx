import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp, FileCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { logSystemEvent, parseErrorStack } from '@/lib/systemLogger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    const str = String(error?.stack || error?.message || error || '');
    const isFirestoreAssertion = str.includes('INTERNAL ASSERTION FAILED') || (str.includes('FIRESTORE') && str.includes('Unexpected state'));
    if (isFirestoreAssertion) {
      console.warn('[Firestore] Suppressed internal WatchStream assertion in React ErrorBoundary.');
      return { hasError: false, error: null };
    }
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    this.reportError(error, errorInfo);
  }

  private reportError = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      const profile = useAuthStore.getState().profile;
      const stack = error.stack || errorInfo.componentStack || '';
      const { file, line, column } = parseErrorStack(stack);

      await logSystemEvent({
        type: 'error',
        message: error.message || 'Component crashed',
        componentName: this.extractComponentName(errorInfo.componentStack),
        file,
        line,
        column,
        stack,
        userId: profile?.uid,
        userRole: profile?.role,
        userEmail: profile?.email,
      });
    } catch (err) {
      console.warn('[ErrorBoundary] Failed to report crash logs:', err);
    }
  };

  private extractComponentName(componentStack?: string | null): string {
    if (!componentStack) return 'UnknownComponent';
    // Match the first component in the stack trace, e.g. "at componentName"
    const match = componentStack.match(/at\s+([A-Z][A-Za-z0-9_]*)/);
    return match ? match[1] : 'ReactComponent';
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const stack = this.state.error?.stack || this.state.errorInfo?.componentStack || '';
      const { file, line } = parseErrorStack(stack);

      return (
        <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-6 font-sans">
          <div className="max-w-xl w-full bg-white rounded-[2.5rem] border border-slate-200/80 shadow-2xl p-8 sm:p-10 space-y-6 text-center">
            <div className="w-16 h-16 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center text-red-600 mx-auto shadow-md">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none">
                Application Interrupted
              </h1>
              <p className="text-xs text-slate-500 font-medium max-w-md mx-auto">
                A component has encountered an unhandled exception. The crash has been logged, and administrators have been notified.
              </p>
            </div>

            {/* Error Diagnostics Card */}
            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 text-left space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <FileCode className="w-4 h-4 text-blue-600" /> Diagnostic Information
              </div>
              <div className="space-y-1">
                <p className="text-xs font-black text-slate-800 break-words">
                  {this.state.error?.message || 'Unknown render error'}
                </p>
                {file !== 'Unknown' && (
                  <p className="text-[10px] font-mono text-slate-500">
                    Source: <span className="text-blue-600 font-bold">{file}</span> (Line {line})
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={this.handleReset}
                className="h-12 px-6 rounded-xl bg-slate-900 hover:bg-black text-white font-black uppercase text-xs tracking-widest gap-2 shadow-lg"
              >
                <RefreshCw className="w-4 h-4" /> Reload Page
              </Button>
              <Button
                variant="outline"
                onClick={() => this.setState({ showDetails: !this.state.showDetails })}
                className="h-12 px-6 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 font-black uppercase text-xs tracking-widest gap-1"
              >
                {this.state.showDetails ? 'Hide Stack Trace' : 'View Stack Trace'}
                {this.state.showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>

            {this.state.showDetails && (
              <div className="text-left bg-slate-950 text-slate-200 p-5 rounded-2xl overflow-x-auto max-h-60 font-mono text-[10px] leading-relaxed select-text scrollbar-thin">
                <pre className="whitespace-pre-wrap">{stack}</pre>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
