import { AppLayout } from "@/components/layout/AppLayout";
import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import NotFound from "@/pages/not-found";

import Dashboard from "@/pages/Dashboard";
import ResellersList from "@/pages/ResellersList";
import ResellerDetail from "@/pages/ResellerDetail";
import ClientsList from "@/pages/ClientsList";
import ClientDetail from "@/pages/ClientDetail";
import MessagesList from "@/pages/MessagesList";
import SendMessage from "@/pages/SendMessage";
import Login from "@/pages/Login";

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error: any) => {
      if (error.status === 401 || error.response?.status === 401) {
        window.location.href = '/login';
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error: any) => {
      if (error.status === 401 || error.response?.status === 401) {
        window.location.href = '/login';
      }
    },
  }),
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function ProtectedRoute({ component: Component, ...rest }: any) {
  return (
    <Route {...rest}>
      {(params) => <Component params={params} />}
    </Route>
  );
}

function Router() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user && location !== "/login") {
    return <Redirect to="/login" />;
  }

  if (user && location === "/login") {
    return <Redirect to="/" />;
  }

  if (location === "/login") {
    return <Route path="/login" component={Login} />;
  }

  return (
    <AppLayout>
      <Switch>
        <ProtectedRoute path="/" component={Dashboard} />
        <ProtectedRoute path="/resellers" component={ResellersList} />
        <ProtectedRoute path="/resellers/:id" component={ResellerDetail} />
        <ProtectedRoute path="/clients" component={ClientsList} />
        <ProtectedRoute path="/clients/:id" component={ClientDetail} />
        <ProtectedRoute path="/messages" component={MessagesList} />
        <ProtectedRoute path="/send" component={SendMessage} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
