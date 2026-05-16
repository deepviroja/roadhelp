import React from 'react';

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message?: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown) {
    console.error('App crashed:', error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F6] p-6">
        <div className="max-w-xl w-full bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
          <h1 className="text-xl font-bold text-gray-900">Something went wrong</h1>
          <p className="text-sm text-gray-600 mt-2">
            The app hit a runtime error and couldn’t render this page.
          </p>
          {this.state.message && (
            <pre className="mt-4 text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-auto text-gray-700">
              {this.state.message}
            </pre>
          )}
          <button
            className="mt-5 inline-flex items-center justify-center h-10 px-4 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}

