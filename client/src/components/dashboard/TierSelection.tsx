import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { 
  Check,
  Sparkles,
  Zap,
  Building2,
  Crown,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAppSelector } from "@/store/hooks";
import { getSubscriptionPlans, createSubscriptionCheckout, type SubscriptionPlan } from "@/lib/avatarApi";
import { ContactSalesForm } from "./ContactSalesForm";
import WithPermission from "@/_core/components/WithPermission";
import TierFeatureComparison from "./TierFeatureComparison";

interface TierSelectionProps {
  worker: {
    id: number;
    fullName: string | null;
  };
  onUpdate: () => void;
  /**
   * When `plan.display_price` strictly equals this value (string comparison),
   * show `$ ${plan.amount}` instead of `display_price` (e.g. API placeholder).
   */
  planDisplayPriceDynamicMatch?: string | number;
}

/** Fallback plans when API fails, matching API shape */
const FALLBACK_PLANS: SubscriptionPlan[] = [
  { id: 1, name: "Basic", price_id: "", amount: 20, interval: "month", description: "Basic monthly plan" },
  { id: 2, name: "Premium", price_id: "", amount: 49, interval: "month", description: "Pro monthly plan" },
  { id: 3, name: "Enterprise", price_id: "", amount: 79, interval: "month", description: "Enterprise monthly plan" },
];

export default function TierSelection({
  worker,
  onUpdate,
  planDisplayPriceDynamicMatch,
}: TierSelectionProps) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<number | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactPlan, setContactPlan] = useState<SubscriptionPlan | null>(null);
  const [contactSubmitted, setContactSubmitted] = useState(false);

  const contactPlanName = contactPlan?.name ?? "";
  const contactPlanLower = contactPlanName.toLowerCase();
  const contactIconBg =
    contactPlanLower === "basic"
      ? "bg-blue-500/20"
      : contactPlanLower === "pro" || contactPlanLower === "premium"
      ? "bg-primary/20"
      : "bg-purple-500/20";

  useEffect(() => {
    let cancelled = false;
    setPlansLoading(true);
    setPlansError(null);
    getSubscriptionPlans()
      .then((data) => {
        if (!cancelled) {
          const list = Array.isArray(data) ? data : [];
          // console.log("list", data);
          setPlans(list.length > 0 ? list : FALLBACK_PLANS);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setPlansError(err instanceof Error ? err.message : "Failed to load plans");
          setPlans(FALLBACK_PLANS);
        }
      })
      .finally(() => {
        if (!cancelled) setPlansLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const handleContactSales = () => {
    const landingPageUrl = import.meta.env.VITE_LANDING_PAGE_URL ?? "https://www.qiko.ai";
    const enterpriseUrl = `${landingPageUrl.replace(/\/+$/, "")}/enterprise`;
    window.open(enterpriseUrl, "_blank");
  };

  const stripePrice = useAppSelector(
    (state) => (state.auth.subscription as { subscription?: { stripe_price?: unknown } } | null)?.subscription?.stripe_price
  );

  const currentPriceId: string | null =
    typeof stripePrice === "string" ? stripePrice : null;

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    if (!plan.price_id) {
      toast.error("This plan is not available for checkout.");
      return;
    }
    setCheckoutLoading(plan.id);
    createSubscriptionCheckout(plan.price_id)
      .then((checkoutUrl) => {
        window.location.href = checkoutUrl;
      })
      .catch((err) => {
        setCheckoutLoading(null);
        toast.error(err instanceof Error ? err.message : "Checkout failed");
      });
  };
  const displayPlans = plans.length ? plans : FALLBACK_PLANS;

  return (
    <div className="flex-1  lg:p-8 overflow-auto">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-foreground mb-2">
            Choose Your Plan
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Start with Basic to test your digital worker, upgrade to Premium for custom fine-tuning, 
            or go Enterprise for on-premise deployment.
          </p>
        </div>

        {plansError && (
          <p className="text-center text-sm text-amber-600 dark:text-amber-400 mb-4">
            Could not load latest prices. Showing default pricing.
          </p>
        )}

        {/* Plan Cards from API – single card appears in center column */}
        <div className="grid md:grid-cols-2 gap-6 mb-12 max-w-5xl mx-auto justify-items-center [&>*:only-child]:md:col-start-2">
          {plansLoading ? (
            [1, 2].map((i) => (
              <Card key={i} className="qiko-card p-6 h-full flex flex-col w-full max-w-sm justify-self-center">
                <div className="h-10 w-32 rounded bg-muted animate-pulse mb-4" />
                <div className="h-12 w-24 rounded bg-muted animate-pulse mb-6" />
                <div className="flex-1 space-y-3">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="h-4 w-full rounded bg-muted animate-pulse" />
                  ))}
                </div>
                <div className="h-10 w-full rounded bg-muted animate-pulse mt-6" />
              </Card>
            ))
          ) : (
            displayPlans.map((plan, index) => {

                // if(index === 0) return
                const isCurrent = (currentPriceId !== null && plan.price_id === currentPriceId);
                const isMiddle = index === 1;
                const displayPrice = (plan as SubscriptionPlan & { display_price?: string | number }).display_price;

                const dynamicValue =
                  planDisplayPriceDynamicMatch ??
                  (import.meta.env.VITE_PLAN_DISPLAY_PRICE_DYNAMIC_MATCH as string | number | undefined);
                const isDynamicMatch =
                  dynamicValue !== undefined &&
                  dynamicValue !== null &&
                  String(dynamicValue).trim() !== "" &&
                  String(plan.display_price) === String(dynamicValue);

                return (
                  <motion.div
                    key={plan.id}
                    className="w-full max-w-sm"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className={`qiko-card p-6 h-full flex flex-col relative ${
                      isCurrent ? "border-primary" : isMiddle ? "border-primary/50" : ""
                    }`}>
                      {isMiddle && displayPlans.length >= 2 && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground">
                          <Sparkles className="w-3 h-3 mr-1" />
                          Most Popular
                        </Badge>
                      </div>
                    )}
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`p-2 rounded-lg ${
                        index === 0 ? "bg-blue-500/20" : index === 1 ? "bg-primary/20" : "bg-purple-500/20"
                      }`}>
                        {index === 0 && <Zap className="w-6 h-6 text-blue-400" />}
                        {index === 1 && <Crown className="w-6 h-6 text-primary" />}
                        {index >= 2 && <Building2 className="w-6 h-6 text-purple-400" />}
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{(plan.name === "Pro" ? "Premium" : plan.name)}</h3>
                        
                        {plan.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{plan?.description?.replace("Pro", "Premium")}</p>
                        )}
                        
                      </div>
                      {isCurrent && (
                        <Badge className="ml-auto">Current</Badge>
                      )}
                    </div>

                    <div className="mb-6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-foreground">
                        { ((plan?.name !== "Enterprise") && displayPrice) && '$ ' }
                        {displayPrice}
                        </span>
                        { ((plan.name !== "Enterprise") && displayPrice) && <span className="text-muted-foreground">
                          /{plan.interval === "month" ? "month" : plan.interval}
                        </span> }
                      </div>
                    </div>

                    <ul className="flex-1 mb-6 space-y-3">
                      {(Array.isArray((plan as any).features) ? (plan as any).features : []).map((label: string, i: number) => (
                        <li key={`${plan.id}-${label}-${i}`} className="flex items-center gap-3 text-sm">
                          <Check className="w-5 h-5 shrink-0 text-emerald-400" />
                          <span className="text-muted-foreground">{label}</span>
                        </li>
                      ))}
                    </ul>

                    {(plan.name.toLowerCase() === "basic") ? (<>
                    <WithPermission>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          setContactPlan(plan);
                          setContactOpen(true);
                        }}
                      >
                        Contact sales
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                      </WithPermission>
                      </>
                    ) : (<>
                    <WithPermission>
                      <Button
                        variant={isCurrent ? "outline" : isMiddle ? "default" : "outline"}
                        className={isMiddle && !isCurrent ? "w-full qiko-btn-primary" : "w-full"}
                        disabled={isCurrent || checkoutLoading !== null}
                        onClick={() => {
                          const isPremiumPlan = plan.name.toLowerCase() === "premium";
                          if (isPremiumPlan) {
                            handleSelectPlan(plan);
                            return;
                          }
                          handleContactSales();
                        }}
                      >
                        {checkoutLoading === plan.id ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Redirecting…
                          </>
                        ) : (
                          <>
                            {isCurrent
                              ? "Current Plan"
                              : plan.name.toLowerCase() === "premium"
                              ? "Choose Plan"
                              : "Contact Us"}
                            {!isCurrent && <ArrowRight className="w-4 h-4 ml-2" />}
                          </>
                        )}
                      </Button>
                      </WithPermission>
                      </>
                    )}
                  </Card>
                </motion.div>
                );
              })
          )}
        </div>

        <TierFeatureComparison plans={displayPlans} />

        {/* FAQ Section */}
        {/* <div className="mt-12">
          <h2 className="text-xl font-semibold text-foreground mb-6 text-center">
            Frequently Asked Questions
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="qiko-card p-6">
              <h3 className="font-medium text-foreground mb-2">
                What is a fine-tuned model?
              </h3>
              <p className="text-sm text-muted-foreground">
                A fine-tuned model is trained specifically on your data, learning your unique expertise, 
                tone, and way of communicating. It's like having an AI that truly understands your business.
              </p>
            </Card>
            <Card className="qiko-card p-6">
              <h3 className="font-medium text-foreground mb-2">
                What is on-prem deployment?
              </h3>
              <p className="text-sm text-muted-foreground">
                On-premise means you can download and run your AI model on your own servers. 
                This gives you complete control over your data and no per-request costs.
              </p>
            </Card>
            <Card className="qiko-card p-6">
              <h3 className="font-medium text-foreground mb-2">
                How much training data do I need?
              </h3>
              <p className="text-sm text-muted-foreground">
                We recommend at least 200 conversation examples for a good fine-tuned model. 
                The Readiness dashboard will guide you on what data to add.
              </p>
            </Card>
            <Card className="qiko-card p-6">
              <h3 className="font-medium text-foreground mb-2">
                Can I upgrade or downgrade anytime?
              </h3>
              <p className="text-sm text-muted-foreground">
                Yes! You can change your plan at any time. Upgrades take effect immediately, 
                and downgrades apply at the end of your billing period.
              </p>
            </Card>
          </div>
        </div> */}
        <Dialog
          open={contactOpen}
          onOpenChange={(open) => {
            setContactOpen(open);
            if (!open) {
              setContactPlan(null);
              setContactSubmitted(false);
            }
          }}
        >
          <DialogContent className={contactSubmitted ? "sm:max-w-md p-0 bg-transparent border-none shadow-none" : "sm:max-w-md p-0 bg-transparent border-none shadow-none"}>
            <div className="relative w-full">
              <div className="relative rounded-3xl bg-slate-950 border border-slate-800 shadow-2xl shadow-black/40">
                {!contactSubmitted && (
                  <div className="px-6 pt-6 pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${contactIconBg}`}>
                        {contactPlanLower === "basic" && <Zap className="w-5 h-5 text-blue-400" />}
                        {(contactPlanLower === "pro" || contactPlanLower === "premium") && (
                          <Crown className="w-5 h-5 text-primary" />
                        )}
                        {contactPlanLower === "enterprise" && <Building2 className="w-5 h-5 text-purple-400" />}
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-400">
                          Contact sales
                        </p>
                        <p className="text-sm font-semibold text-foreground">
                          {contactPlanName || "Enterprise"} plan
                        </p>
                        {contactPlanName && (
                          <p className="text-[11px] text-muted-foreground">
                            You are enquiring about the {contactPlanName} plan.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                <div className="px-6 pb-6 pt-2">
                  <ContactSalesForm
                    planName={contactPlan?.name}
                    onClose={() => setContactOpen(false)}
                    onSubmittedChange={(submitted) => setContactSubmitted(submitted)}
                  />
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
