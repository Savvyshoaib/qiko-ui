"use client";

import { appFetch } from "@/data/appFetch";
import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import GlobalLayout from "@/components/GlobalLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { StripeCardForm } from "@/components/checkout/StripeCardForm";
import { createSubscriptionCheckout } from "@/lib/avatarApi";

const PLAN_LABELS: Record<string, string> = {
  basic: "Basic",
  premium: "Premium",
  enterprise: "Enterprise",
};

const PRICES: Record<string, { monthly: number | null; annual: number | null }> = {
  basic: { monthly: 20, annual: 192 },
  premium: { monthly: 99, annual: 948 },
  enterprise: { monthly: null, annual: null },
};

type PlanType = "basic" | "premium" | "enterprise";
type BillingType = "monthly" | "annual";

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? "";

export default function CheckoutPage() {
  const [, setLocation] = useLocation();
  const search = typeof window !== "undefined" ? window.location.search : "";
  const params = new URLSearchParams(search);
  const plan = (params.get("plan") || "premium") as PlanType;
  const billing = (params.get("billing") || "monthly") as BillingType;
  const priceId = params.get("price_id") ?? "";

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentError, setPaymentIntentError] = useState<string | null>(null);
  const [intentLoading, setIntentLoading] = useState(!!priceId);
  const [checkoutRedirectError, setCheckoutRedirectError] = useState<string | null>(null);

  const price = PRICES[plan]?.[billing];
  const planLabel = PLAN_LABELS[plan] || plan;
  const isValid = ["basic", "premium", "enterprise"].includes(plan) && (plan === "enterprise" || (price != null && price > 0));
  const useCheckoutApi = priceId.length > 0;

  const stripePromise = useMemo(() => (stripePublishableKey ? loadStripe(stripePublishableKey) : null), []);

  useEffect(() => {
    if (!["basic", "premium", "enterprise"].includes(plan)) {
      toast.error("Invalid plan");
      setLocation("/app/pricing");
    }
  }, [plan, setLocation]);

  // When price_id is present: call checkout API and redirect to data.checkout_url
  useEffect(() => {
    if (!useCheckoutApi) return;

    let cancelled = false;
    setCheckoutRedirectError(null);
    setIntentLoading(true);

    createSubscriptionCheckout(priceId)
      .then((checkoutUrl) => {
        if (cancelled) return;
        window.location.href = checkoutUrl;
      })
      .catch((err) => {
        if (!cancelled) {
          setCheckoutRedirectError(err instanceof Error ? err.message : "Checkout failed");
          setIntentLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [priceId, useCheckoutApi]);

  // Create PaymentIntent when we have a valid paid plan and no price_id (legacy flow)
  useEffect(() => {
    if (useCheckoutApi || plan === "enterprise" || price == null || price <= 0) {
      if (!useCheckoutApi) setIntentLoading(false);
      return;
    }

    let cancelled = false;
    setPaymentIntentError(null);
    setIntentLoading(true);

    const DEMO_DATA = {
      "package_id":19,
      "is_new":true,
      "domain":"oliv.com",
      "promo_code":null,
      "name":"test",
      "email":"test@yopmail.dom",
      "phone":"444444444444",
      "job_offer_id":null,
      "credit_type":"Basic",
      "user_id":null,
      "organisation_id":null
    }

    const baseUrl = import.meta.env.VITE_SUBS_API_URL ?? '/subs-api/subs/api/get_setup_intent';
    appFetch(`${baseUrl}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(DEMO_DATA),
    })
      .then((res) => res.json().catch(() => ({})))
      .then(({data}) => {
        if (cancelled) return;
        if (!data.client_secret) {
          setPaymentIntentError(data?.message || "Could not start payment");
          setClientSecret(null);
          return;
        }
        setClientSecret(data.client_secret);
        setPaymentIntentError(null);
      })
      .catch((err) => {
        if (!cancelled) {
          setPaymentIntentError(err?.message || "Failed to load payment form");
          setClientSecret(null);
        }
      })
      .finally(() => {
        if (!cancelled) setIntentLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [plan, billing, price, useCheckoutApi]);

  const handlePaymentSuccess = () => {
    toast.success("Payment successful!");
    setLocation("/app/pricing?success=true");
  };

  const handlePaymentError = (message: string) => {
    toast.error(message);
  };

  const amountLabel = price != null ? `$${price}` : "";
  const showCardForm =
    plan !== "enterprise" &&
    isValid &&
    stripePromise &&
    clientSecret &&
    !intentLoading;

  return (
    <GlobalLayout activeSection="pricing">
      <div className="p-6 lg:p-8 overflow-y-auto h-full">
        <div className="max-w-lg mx-auto">
          <Button
            variant="ghost"
            className="mb-6 -ml-2 text-slate-400 hover:text-white"
            onClick={() => setLocation("/app/pricing")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to pricing
          </Button>

          <h1 className="text-2xl font-bold text-white mb-1">Checkout</h1>
          <p className="text-slate-400 text-sm mb-8">
            Enter your card details to complete payment
          </p>

          <Card className="bg-[#0a0f1a]/80 border border-white/10 overflow-hidden">
            <CardHeader className="pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-semibold text-white">{planLabel}</h2>
                  <p className="text-sm text-slate-400 capitalize">{billing} billing</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {plan === "enterprise" ? (
                <p className="text-slate-400 text-sm">
                  Contact us for custom Enterprise pricing and we&apos;ll get back within 24 hours.
                </p>
              ) : price != null ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">{planLabel} plan</span>
                    <span className="text-white font-medium">
                      ${price}
                      <span className="text-slate-400 font-normal">/{billing === "annual" ? "year" : "month"}</span>
                    </span>
                  </div>
                  {billing === "annual" && (
                    <p className="text-xs text-emerald-400/90">Save 20% with annual billing</p>
                  )}
                </>
              ) : null}

              <div className="flex items-center gap-2 pt-2 text-slate-400 text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-500/80 flex-shrink-0" />
                <span>Secure payment powered by Stripe. Card number, expiry, and CVC are never stored on our servers.</span>
              </div>

              {useCheckoutApi && (
                <>
                  {intentLoading && !checkoutRedirectError && (
                    <div className="flex items-center justify-center py-8 text-slate-400">
                      <Loader2 className="w-8 h-8 animate-spin mr-2" />
                      Redirecting to checkout...
                    </div>
                  )}
                  {checkoutRedirectError && (
                    <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">
                      {checkoutRedirectError}
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 border-white/20 text-white hover:bg-white/5"
                        onClick={() => setLocation("/app/pricing")}
                      >
                        Back to pricing
                      </Button>
                    </div>
                  )}
                </>
              )}

              {plan !== "enterprise" && isValid && !useCheckoutApi && (
                <>
                  {!stripePublishableKey && (
                    <p className="text-amber-400/90 text-sm">
                      Add <code className="bg-white/10 px-1 rounded">VITE_STRIPE_PUBLISHABLE_KEY</code> to enable the payment form.
                    </p>
                  )}

                  {stripePromise && (
                    <>
                      {intentLoading && (
                        <div className="flex items-center justify-center py-8 text-slate-400">
                          <Loader2 className="w-8 h-8 animate-spin mr-2" />
                          Loading payment form...
                        </div>
                      )}

                      {paymentIntentError && !intentLoading && (
                        <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">
                          {paymentIntentError}
                          <p className="mt-2 text-xs text-slate-400">
                            Backend should implement POST /api/stripe/create-payment-intent and return {"{ clientSecret }"}.
                          </p>
                        </div>
                      )}

                      {showCardForm && clientSecret && (
                        <Elements
                          stripe={stripePromise}
                          options={{
                            clientSecret,
                            appearance: {
                              theme: "night",
                              variables: {
                                colorPrimary: "#22d3ee",
                                colorBackground: "rgba(255,255,255,0.05)",
                                colorText: "#e2e8f0",
                                colorDanger: "#f87171",
                                borderRadius: "12px",
                              },
                            },
                          }}
                        >
                          <StripeCardForm
                            clientSecret={clientSecret}
                            amountLabel={amountLabel}
                            onSuccess={handlePaymentSuccess}
                            onError={handlePaymentError}
                          />
                        </Elements>
                      )}
                    </>
                  )}

                  {stripePromise && !intentLoading && !clientSecret && !paymentIntentError && price != null && (
                    <p className="text-slate-400 text-sm">Unable to load payment form. Please try again later.</p>
                  )}
                </>
              )}

              {plan === "enterprise" && !useCheckoutApi && (
                <Button
                  variant="outline"
                  className="w-full mt-4 border-white/20 text-white hover:bg-white/5"
                  onClick={() => toast.info("Contact sales for Enterprise")}
                >
                  Contact sales
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </GlobalLayout>
  );
}
