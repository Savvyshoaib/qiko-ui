import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Check, X } from "lucide-react";
import type { SubscriptionPlan } from "@/lib/avatarApi";

type ComparisonRow =
  | {
      key: "digital_workers" | "chats" | "training_rules";
      label: string;
      kind: "value";
      premiumValue?: string;
      enterpriseValue?: string;
    }
  | {
      key: string;
      label: string;
      kind: "boolean";
      premiumIncluded: boolean;
      enterpriseIncluded: boolean;
    };

function getPlanFeatures(plan: SubscriptionPlan | undefined): string[] {
  return Array.isArray((plan as any)?.features) ? (plan as any).features : [];
}

function normalizeBooleanLabel(raw: string): string {
  const t = raw.trim();
  const low = t.toLowerCase();
  switch (low) {
    case "knowledge base auto-learning":
      return "Knowledge Base Auto-Learning";
    case "calendly scheduling integration":
      return "Calendly Integration";
    case "voice call enablement":
      return "Voice Call Enablement";
    case "website chat embed":
      return "Website Chat Embed";
    case "custom knowledge training":
      return "Custom Knowledge Training";
    case "custom model build (ip owned)":
      return "Custom Model Build (IP Owned)";
    case "data tagging and pipeline build":
      return "Data Tagging & AI Pipeline";
    case "on-prem deployment":
      return "On-Prem Deployment";
    case "full model export (gguf)":
      return "Full Model Export (GGUF)";
    case "dedicated account manager":
      return "Dedicated Account Manager";
    default:
      return t;
  }
}

function extractNamedValue(features: string[], regex: RegExp, preferLast = false): string | undefined {
  const iterable = preferLast ? [...features].reverse() : features;
  for (const f of iterable) {
    const m = f.match(regex);
    if (m?.[1]) {
      const v = m[1].trim();
      if (v) return v;
    }
  }
  return undefined;
}

function isValueFeature(feature: string): boolean {
  const t = feature.toLowerCase();
  return (
    /digital worker/.test(t) ||
    /^.*\s+chat(s)?$/.test(t) ||
    /training rules/.test(t) ||
    /unlimited chats/.test(t)
  );
}

interface TierFeatureComparisonProps {
  plans: SubscriptionPlan[];
}

export default function TierFeatureComparison({ plans }: TierFeatureComparisonProps) {
  const [mobileFeatureTier, setMobileFeatureTier] = useState<"premium" | "enterprise">("premium");

  const comparisonRows = useMemo<ComparisonRow[]>(() => {
    const premiumPlan = plans.find((p) => p.name?.toLowerCase() === "premium");
    const enterprisePlan = plans.find((p) => p.name?.toLowerCase() === "enterprise");

    const premiumFeatures = getPlanFeatures(premiumPlan);
    const enterpriseFeatures = getPlanFeatures(enterprisePlan);

    const marker = "everything in premium";
    const enterpriseIncludesPremium = enterpriseFeatures.some(
      (f) => f.trim().toLowerCase() === marker
    );

    const expandedPremiumFeatures = premiumFeatures;
    const expandedEnterpriseFeatures = enterpriseIncludesPremium
      ? [...premiumFeatures, ...enterpriseFeatures.filter((f) => f.trim().toLowerCase() !== marker)]
      : enterpriseFeatures;

    const digitalWorkersPremium = extractNamedValue(
      expandedPremiumFeatures,
      /^(.*?)\s+digital worker(?:s)?$/i
    );
    const digitalWorkersEnterprise = extractNamedValue(
      expandedEnterpriseFeatures,
      /^(.*?)\s+digital worker(?:s)?$/i,
      true
    );
    const normalizedDigitalWorkersEnterprise = "Custom / Scalable";

    const chatsPremium = extractNamedValue(expandedPremiumFeatures, /^(.*?)\s+chat(?:s)?$/i);
    const chatsEnterprise = extractNamedValue(
      expandedEnterpriseFeatures,
      /^(.*?)\s+chat(?:s)?$/i,
      true
    );

    const trainingRulesPremium = extractNamedValue(
      expandedPremiumFeatures,
      /^(.*?)\s+training rule(?:s)?$/i
    );
    const trainingRulesEnterprise = extractNamedValue(
      expandedEnterpriseFeatures,
      /^(.*?)\s+training rule(?:s)?$/i,
      true
    );

    const booleanRawPremium = expandedPremiumFeatures.filter(
      (f) => !isValueFeature(f) && f.trim().toLowerCase() !== marker
    );
    const booleanRawEnterprise = expandedEnterpriseFeatures.filter(
      (f) => !isValueFeature(f) && f.trim().toLowerCase() !== marker
    );

    const booleanLabelsPremium = booleanRawPremium.map(normalizeBooleanLabel);
    const booleanLabelsEnterprise = booleanRawEnterprise.map(normalizeBooleanLabel);

    const premiumBooleanSet = new Set(booleanLabelsPremium);
    const enterpriseBooleanSet = new Set(booleanLabelsEnterprise);

    const booleanOrderedLabels: string[] = [];
    const seen = new Set<string>();
    for (const label of [...booleanLabelsPremium, ...booleanLabelsEnterprise]) {
      if (seen.has(label)) continue;
      seen.add(label);
      booleanOrderedLabels.push(label);
    }

    return [
      {
        key: "digital_workers",
        label: "Digital Workers",
        kind: "value",
        premiumValue: digitalWorkersPremium,
        enterpriseValue: normalizedDigitalWorkersEnterprise,
      },
      {
        key: "chats",
        label: "Chats",
        kind: "value",
        premiumValue: chatsPremium,
        enterpriseValue: chatsEnterprise,
      },
      {
        key: "training_rules",
        label: "Training Rules",
        kind: "value",
        premiumValue: trainingRulesPremium,
        enterpriseValue: trainingRulesEnterprise,
      },
      ...booleanOrderedLabels.map((label) => ({
        key: label,
        label,
        kind: "boolean" as const,
        premiumIncluded: premiumBooleanSet.has(label),
        enterpriseIncluded: enterpriseBooleanSet.has(label),
      })),
    ];
  }, [plans]);

  return (
    <Card className="qiko-card p-6">
      <h2 className="text-xl font-semibold text-foreground mb-6">Feature Comparison</h2>

      <div className="md:hidden">
        <div className="grid grid-cols-2 gap-2 mb-4 rounded-lg bg-secondary/40 p-1">
          <button
            type="button"
            onClick={() => setMobileFeatureTier("premium")}
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              mobileFeatureTier === "premium"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Premium
          </button>
          <button
            type="button"
            onClick={() => setMobileFeatureTier("enterprise")}
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              mobileFeatureTier === "enterprise"
                ? "bg-purple-500 text-white"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Enterprise
          </button>
        </div>
        <div className="space-y-2">
          {comparisonRows.map((row, index) => {
            if (row.kind === "value") {
              const value =
                mobileFeatureTier === "premium" ? row.premiumValue : row.enterpriseValue;
              return (
                <div
                  key={`${row.key}-${mobileFeatureTier}`}
                  className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 ${
                    index % 2 === 0 ? "bg-secondary/30" : "bg-transparent"
                  }`}
                >
                  <span className="text-sm text-foreground">{row.label}</span>
                  <span className="text-sm text-muted-foreground">{value ?? "—"}</span>
                </div>
              );
            }

            const included =
              mobileFeatureTier === "premium" ? row.premiumIncluded : row.enterpriseIncluded;
            return (
              <div
                key={`${row.key}-${mobileFeatureTier}`}
                className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 ${
                  index % 2 === 0 ? "bg-secondary/30" : "bg-transparent"
                }`}
              >
                <span className="text-sm text-foreground">{row.label}</span>
                <span className="shrink-0 flex justify-center">
                  {included ? (
                    <Check className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <X className="w-5 h-5 text-muted-foreground/50" />
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="hidden md:block overflow-x-auto">
        
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                Feature
              </th>
              <th className="text-center py-3 px-4 text-sm font-medium text-primary">Premium</th>
              <th className="text-center py-3 px-4 text-sm font-medium text-purple-400">
                Enterprise
              </th>
            </tr>
          </thead>
          <tbody>
            <TooltipProvider>
              {comparisonRows.map((row, index) => (
                <tr key={row.key} className={index % 2 === 0 ? "bg-secondary/30" : ""}>
                  <td className="py-3 px-4">
                    <span className="text-sm text-foreground">{row.label}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {row.kind === "value" ? (
                      <span className="text-sm text-foreground">{row.premiumValue ?? "—"}</span>
                    ) : row.premiumIncluded ? (
                      <Check className="w-5 h-5 text-emerald-400 inline-block" />
                    ) : (
                      <X className="w-5 h-5 text-muted-foreground/50 inline-block" />
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {row.kind === "value" ? (
                      <span className="text-sm text-foreground">{row.enterpriseValue ?? "—"}</span>
                    ) : row.enterpriseIncluded ? (
                      <Check className="w-5 h-5 text-emerald-400 inline-block" />
                    ) : (
                      <X className="w-5 h-5 text-muted-foreground/50 inline-block" />
                    )}
                  </td>
                </tr>
              ))}
            </TooltipProvider>
          </tbody>
        </table>
      </div>
    </Card>
  );
}

