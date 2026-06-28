"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
  label?: string;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error(`[ErrorBoundary] ${this.props.label ?? "component"}:`, error.message);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="rounded-xl border border-zinc-800 bg-surface p-4">
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <span className="text-lg text-zinc-600">⚠</span>
            <p className="text-xs text-zinc-500">
              {this.props.label ?? "Компонент"} временно недоступен
            </p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="mt-1 rounded-md border border-zinc-700/50 bg-surface-2 px-3 py-1 text-[10px] text-zinc-400 transition hover:text-accent-light"
            >
              Повторить
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
