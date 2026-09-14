import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { useEffect } from "react";
import { useLocation } from "wouter";

function ProtectedHome() {
  const { user, loading, configured } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (configured && !loading && (!user || !user.emailVerified)) navigate("/auth");
  }, [configured, loading, navigate, user]);

  if (configured && (loading || !user?.emailVerified)) {
    return <main className="auth-page"><p className="auth-intro">Verificando seu acesso...</p></main>;
  }
  return <Home />;
}

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={ProtectedHome} />
      <Route path={"/auth"} component={Auth} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Router />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
