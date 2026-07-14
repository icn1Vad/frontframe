import { Component, type ReactNode } from "react";

interface VisualBoundaryProps {
  readonly children: ReactNode;
  readonly fallback: ReactNode;
}

interface VisualBoundaryState {
  readonly hasError: boolean;
}

export class VisualBoundary extends Component<
  VisualBoundaryProps,
  VisualBoundaryState
> {
  state: VisualBoundaryState = { hasError: false };

  static getDerivedStateFromError(): VisualBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(): void {
    // The static fallback keeps the landing page usable when WebGL is unavailable.
  }

  render(): ReactNode {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
