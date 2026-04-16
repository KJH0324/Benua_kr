import * as React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-white p-6 text-center">
          <div className="max-w-md">
            <h1 className="text-2xl font-bold text-venuea-dark mb-4 uppercase tracking-widest">문제가 발생했습니다</h1>
            <p className="text-venuea-muted mb-8 text-sm leading-relaxed">
              페이지를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.
            </p>
            <pre className="text-[10px] text-red-500 bg-red-50 p-4 mb-8 overflow-auto text-left rounded">
              {this.state.error?.toString()}
            </pre>
            <button 
              onClick={() => window.location.reload()}
              className="bg-venuea-dark text-white px-8 py-3 text-xs font-bold uppercase tracking-widest hover:bg-venuea-gold transition-all"
            >
              페이지 새로고침
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
