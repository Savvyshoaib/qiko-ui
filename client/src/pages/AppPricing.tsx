import GlobalLayout from "@/components/GlobalLayout";
import TierSelection from "@/components/dashboard/TierSelection";
import ViewPlanButton from "@/components/subscription/ViewPlanButton";
import { useAppSelector } from "@/store/hooks";
// import { trpc } from "@/lib/trpc";

export default function AppPricing() {
  const stripePrice = useAppSelector(
    (state) => (state.auth.subscription as { subscription?: { stripe_price?: unknown } } | null)?.subscription?.stripe_price
  );
  const currentPriceId: string | null = typeof stripePrice === "string" ? stripePrice : null;

  const refetch = () => {}
  const worker = {
    id: 1380008,
    fullName: "John Deo",
    lastSignedIn: "2026-02-10T10:42:46.000Z",
    loginMethod: "email",
    name: "John Deo",
    openId: "qiko_1769695643082_76x87eyuc2h",
    password: "$2b$12$ak6IJiH1wq18X1vZhQAsPucpNf8yXdJPVaoisyl2nU8IdVFvM/Qvq",
    role: "user",
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    updatedAt: "2026-02-10T10:42:46.000Z"
  }
  /*  trpc.worker.get.useQuery(); */

  return (
    <GlobalLayout activeSection="pricing">
      <div className="p-6 lg:p-8 overflow-y-auto h-full">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 
                className="text-2xl lg:text-3xl font-bold mb-2 text-center lg:text-left"
                style={{ 
                  fontFamily: 'Satoshi, sans-serif',
                  background: 'linear-gradient(135deg, #ffffff 0%, #6366F1 50%, #22D3EE 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Plans & Pricing
              </h1>
              <p className="text-slate-400">
                Choose the right plan for your needs
              </p>
            </div>
            <ViewPlanButton isCurrent={Boolean(currentPriceId)} />
          </div>

          {worker ? (
            <TierSelection worker={worker} onUpdate={refetch} />
          ) : (
            <div className="text-center py-12 text-slate-400">
              Create a worker first to view pricing options
            </div>
          )}
        </div>
      </div>
    </GlobalLayout>
  );
}
