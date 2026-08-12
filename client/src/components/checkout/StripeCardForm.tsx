"use client";

import { useState } from "react";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2 } from "lucide-react";

interface StripeCardFormProps {
  clientSecret: string;
  amountLabel: string;
  onSuccess: () => void;
  onError: (message: string) => void;
}

export function StripeCardForm({ amountLabel, onSuccess, onError }: StripeCardFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        onError(submitError.message ?? "Validation failed");
        setIsProcessing(false);
        return;
      }

      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/app/pricing?success=true`,
          payment_method_data: {
            billing_details: {
              address: { country: "GB" },
            },
          },
        },
      });

      if (error) {
        onError(error.message ?? "Payment failed");
        return;
      }
      onSuccess();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="[&_.Input]:rounded-xl [&_.Input]:border-white/20 [&_.Input]:bg-white/5 [&_.Input]:text-slate-200">
        <PaymentElement
          options={{
            layout: "tabs",
            defaultCollapsed: false,
            radios: true,
            spacedAccordionItems: false,
          }}
        />
      </div>
      <p className="text-xs text-slate-500">
        Enter your card number, expiry date, and CVC. Payment is secure and powered by Stripe.
      </p>
      <Button
        type="submit"
        disabled={!stripe || !elements || isProcessing}
        className="w-full bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 mr-2" />
            Pay {amountLabel}
          </>
        )}
      </Button>
    </form>
  );
}
