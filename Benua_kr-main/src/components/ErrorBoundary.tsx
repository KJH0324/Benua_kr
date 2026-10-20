import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white text-center">
          <h1 className="text-2xl font-serif font-bold text-venuea-dark mb-3">
            일시적인 오류가 발생했습니다
          </h1>
          <p className="text-sm text-venuea-muted mb-6 max-w-md">
            페이지를 불러오는 중 문제가 발생했습니다. 새로고침 후 다시 시도해주세요.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.href = "/";
            }}
            className="bg-venuea-dark text-white px-6 py-3 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-venuea-gold transition-colors"
          >
            홈으로 돌아가기
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}