import * as React from 'react';
import { useLanguage } from '../lib/i18n';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

function ErrorUI({ error }: { error: Error | null }) {
  const { t } = useLanguage();
  let errorMessage = t("common.error_message");
  try {
    const parsed = JSON.parse(error?.message || "{}");
    if (parsed.error) {
      errorMessage = `Firebase Error: ${parsed.error} (${parsed.operationType} on ${parsed.path})`;
    }
  } catch (e) {
    errorMessage = error?.message || errorMessage;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-xl border border-rose-100 text-center">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <h2 className="text-xl font-black text-slate-900 mb-2">{t("common.error_title")}</h2>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">{errorMessage}</p>
        <button 
          onClick={() => window.location.reload()}
          className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-slate-800 transition-colors"
        >
          {t("common.reload_app")}
        </button>
      </div>
    </div>
  );
}

export class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    (this as any).state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if ((this as any).state.hasError) {
      return <ErrorUI error={(this as any).state.error} />;
    }

    return (this as any).props.children;
  }
}
