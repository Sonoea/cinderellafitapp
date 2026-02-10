import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <div className="p-8 text-center">
                    <h2 className="text-xl font-bold text-red-600 mb-4">Something went wrong.</h2>
                    <details className="text-left bg-gray-100 p-4 rounded text-xs overflow-auto whitespace-pre-wrap">
                        <summary className="cursor-pointer font-bold mb-2">Error Details (Please screenshot this)</summary>
                        {this.state.error && this.state.error.toString()}
                        <br />
                        <br />
                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </details>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-6 px-6 py-2 bg-primary text-white rounded-lg font-bold"
                    >
                        Reload Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
