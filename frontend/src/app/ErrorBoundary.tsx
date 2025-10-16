import { Component, ErrorInfo, ReactNode } from "react";

interface ErrorBoundaryProps {
  fallback?: ReactNode;
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("UI error", error, info);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex h-screen flex-col items-center justify-center gap-2 bg-ui-surface-active text-center text-ui-text dark:bg-ui-bg-dark dark:text-ui-text-dark">
            <h1 className="text-lg font-semibold">Something went wrong</h1>
            <p className="text-sm">Please refresh the page to continue.</p>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
