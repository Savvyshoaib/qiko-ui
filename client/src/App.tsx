import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WorkerLimitGuard } from "@/hooks/useWorkerAccess";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { DataProvider } from "./contexts/DataContext";
import Home from "./pages/Home";
import AppLoadingPage from "./pages/AppLoadingPage";
import CreatorWizard from "./pages/CreatorWizard";
import CreatingWorker from "./pages/CreatingWorker";
import Dashboard from "./pages/Dashboard";
import WorkersHome from "./pages/WorkersHome";
import WorkersPage from "./pages/WorkersPage";
import AppDashboard from "./pages/AppDashboard";
import AppPricing from "./pages/AppPricing";
import AppSettings from "./pages/AppSettings";
import CheckoutPage from "./pages/CheckoutPage";
import CheckoutStatusPage from "./pages/CheckoutStatusPage";
import PaymentStatusPage from "./pages/PaymentStatusPage";
import { useAuth } from "@/_core/hooks/useAuth";
import TestChat from "./pages/TestChat";
import PublicChatPage from "./pages/PublicChatPage";
import PublicChat from "./pages/PublicChat";
import Onboarding from "./pages/Onboarding";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import SignUpSuccess from "./pages/SignUpSuccess";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import StudioChat from "./pages/StudioChat";
import StudioDashboard from "./pages/studio-dashboard/StudioDashboard";
import ResearchFeed from "./pages/ResearchFeed";
import UserDashboard from "./pages/userDashboard";
import ResearchSources from "./pages/ResearchSources";
import ResearchConfig from "./pages/ResearchConfig";
import ResearchNotebook from "./pages/ResearchNotebook";
import IDGSalesIntelligenceWorkerDemo from "./pages/IDGSalesIntelligenceWorkerDemo";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchStudioUser } from "@/store/slices/studioUserSlice";
import AcceptInvite from "./pages/AcceptInvite";
import AcceptCustomerInvite from "./pages/AcceptCustomerInvite";
import GuestRoute from "./components/GuestRoute";

/** Logged-in: ?checkout= → /app/checkout/:status */
function CheckoutStatusRedirect() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, loading } = useAuth();
  useEffect(() => {
    if (loading || !isAuthenticated) return;
    const params = new URLSearchParams(window.location.search);
    const checkoutStatus = params.get("checkout");
    if (!checkoutStatus) return;
    const path = window.location.pathname;
    if (path.startsWith("/app/checkout/")) return;
    const status = checkoutStatus.toLowerCase() === "success" ? "success" : "failure";
    setLocation(`/app/checkout/${status}`);
  }, [isAuthenticated, loading, setLocation]);
  return null;
}

/** Guest / non-login: ?checkout= or ?payment= → /payment/success | /payment/failure */
function PaymentStatusRedirect() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, loading } = useAuth();
  useEffect(() => {
    if (loading || isAuthenticated) return;
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get("checkout") ?? params.get("payment");
    if (!paymentStatus) return;
    const path = window.location.pathname;
    if (path === "/payment/success" || path === "/payment/failure") return;
    const isSuccess = paymentStatus.toLowerCase() === "success";
    setLocation(isSuccess ? "/payment/success" : "/payment/failure");
  }, [isAuthenticated, loading, setLocation]);
  return null;
}

function Router() {
  return (
    <>
      <CheckoutStatusRedirect />
      <PaymentStatusRedirect />
      <Switch>
      {/* Public routes */}
      <Route path="/" component={AppLoadingPage} />
	    <Route path="/idg-sales-intelligence" component={IDGSalesIntelligenceWorkerDemo} />
      <Route path="/login" component={() => <GuestRoute redirectTo="/app"> <Login /> </GuestRoute>} />
      <Route path="/signup" component={() => <GuestRoute redirectTo="/app"> <SignUp /> </GuestRoute>} />
      <Route path="/signup-success" component={SignUpSuccess} />
      <Route path="/payment/success" component={PaymentStatusPage} />
      <Route path="/payment/failure" component={PaymentStatusPage} />
      {/* <Route path="/forgot-password" component={ForgotPassword} /> */}
      <Route path="/team/invite/accept" component={AcceptInvite} />
      <Route path="/customer-invite" component={AcceptCustomerInvite} />
      <Route path="/forgot-password" component={() => <GuestRoute redirectTo="/app"> <ForgotPassword /> </GuestRoute>} />
      <Route path="/change-password" component={ForgotPassword} />
      <Route path="/reset-password/:otp" component={ResetPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route
        path="/onboarding"
        component={() => <WorkerLimitGuard component={Onboarding} />}
      />
      <Route path="/wizard" component={CreatorWizard} />
      <Route path="/creating" component={CreatingWorker} />
      <Route path="/creating/:workerId" component={CreatingWorker} />
      
      {/* New app routes with global layout */}
      <Route path="/app" component={AppDashboard} />
      <Route path="/app/workers" component={WorkersPage} />
      <Route path="/app/workers/:workerId" component={WorkersPage} />
      <Route path="/app/workers/:workerId/:view" component={WorkersPage} />
      <Route path="/app/pricing" component={AppPricing} />
      <Route path="/app/checkout" component={CheckoutPage} />
      <Route path="/app/checkout/:status" component={CheckoutStatusPage} />
      <Route path="/app/settings" component={AppSettings} />
      
      {/* Legacy routes (keep for backwards compatibility) */}
      {/* <Route path="/workers" component={WorkersHome} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/dashboard/:workerId" component={Dashboard} />
      <Route path="/dashboard/:workerId/:view" component={Dashboard} /> */}


      {/* Studio routes */}
      <Route path="/app/studio-dashboard" component={StudioDashboard} />
      <Route path="/app/studio" component={StudioDashboard} />
      <Route path="/app/studio/:workerId" component={StudioDashboard} />
      <Route path="/app/studio/:workerId/chat" component={StudioChat} />
      <Route path="/app/studio/:workerId/feed" component={ResearchFeed} />
      <Route path="/app/studio/:workerId/user-dashboard" component={UserDashboard} />
      <Route path="/app/studio/:workerId/sources">
        {(params) => <ResearchSources workerId={Number(params.workerId)} />}
      </Route>
      <Route path="/app/studio/:workerId/config">
        {(params) => <ResearchConfig workerId={Number(params.workerId)} />}
      </Route>
      <Route path="/app/studio/:workerId/notebook" component={ResearchNotebook} />
      {/* <Route path="/dashboard/:workerId/:view" component={Dashboard} />  */}
      
      {/* Public chat routes */}
      <Route path="/chat/:workerId" component={PublicChatPage} />
      <Route path="/c/:slug" component={PublicChat} />
      
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
    </>
  );
}

function App() {
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.auth.token);
  const [location] = useLocation();

  useEffect(() => {
    if (!token) return;
    if (!location.startsWith("/app")) return;
    void dispatch(fetchStudioUser());
  }, [dispatch, location, token]);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <DataProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </DataProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
