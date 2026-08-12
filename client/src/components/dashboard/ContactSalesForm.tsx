import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Check, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface ContactSalesFormProps {
  planName?: string;
  onClose: () => void;
  onSubmittedChange?: (submitted: boolean) => void;
}

interface ContactSalePayload {
  name: string;
  email: string;
  contact_number: string;
  message: string;
  plan?: string;
}

async function mockContactSale(payload: ContactSalePayload): Promise<void> {
  // Mock API call to /contact-sale
  console.log("Mock POST /contact-sale", payload);
  await new Promise((resolve) => setTimeout(resolve, 800));
}

export function ContactSalesForm({ planName, onClose, onSubmittedChange }: ContactSalesFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const isFormValid = !!name.trim() && !!email.trim() && !!message.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("Please fill in name, email, and message.");
      return;
    }

    setIsSubmitting(true);
    try {
      await mockContactSale({
        name: name.trim(),
        email: email.trim(),
        contact_number: contactNumber.trim(),
        message: message.trim(),
        plan: planName,
      });
      toast.success("Your request has been sent. We'll be in touch soon.");
      setIsSubmitted(true);
      if (onSubmittedChange) onSubmittedChange(true);
    } catch (error) {
      console.error("Contact sale error", error);
      toast.error("Failed to send your request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="mt-2 relative overflow-hidden rounded-xl bg-gradient-to-b from-[#0f172a] to-[#020617] border border-white/10 px-4 py-5">
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            className="absolute -top-16 -right-10 w-40 h-40 rounded-full bg-[#22D3EE]/20 blur-3xl"
            animate={{ opacity: [0.4, 0.8, 0.4], scale: [1, 1.1, 1] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          <motion.div
            className="absolute -bottom-20 -left-10 w-40 h-40 rounded-full bg-[#6366F1]/25 blur-3xl"
            animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.15, 1] }}
            transition={{ duration: 5, repeat: Infinity }}
          />
        </div>

        <div className="relative flex flex-col items-center text-center space-y-3">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 18 }}
            className="relative w-16 h-16 rounded-full bg-gradient-to-br from-[#22D3EE] to-[#6366F1] flex items-center justify-center shadow-lg shadow-[#22D3EE]/40"
          >
            <motion.div
              className="absolute inset-0 rounded-full border border-white/30"
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            />
            <Check className="w-8 h-8 text-white" strokeWidth={3} />
          </motion.div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 border border-white/10">
              <Sparkles className="w-3 h-3 text-[#22D3EE]" />
              <span className="text-[11px] uppercase tracking-wide text-slate-300">
                Request received
              </span>
            </div>
            <p className="text-base font-semibold text-slate-50">
              Thank you for contacting sales
            </p>
            <p className="text-sm text-slate-400">
              Our team will review your needs and reach out to you soon to design the best plan for you.
            </p>
          </div>

          <Button type="button" className="mt-2" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-2">
      {planName && (
        <p className="text-sm text-muted-foreground">
          You are enquiring about the <span className="font-medium text-foreground">{planName}</span> plan.
        </p>
      )}

      <div className="space-y-1">
        <Label htmlFor="contact-name">Name</Label>
        <Input
          id="contact-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your full name"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="contact-email">Email</Label>
        <Input
          id="contact-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="contact-number">Contact number</Label>
        <Input
          id="contact-number"
          value={contactNumber}
          onChange={(e) => setContactNumber(e.target.value)}
          placeholder="+1 555 000 0000"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="contact-message">Message</Label>
        <Textarea
          id="contact-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us a bit about your needs..."
          rows={4}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="submit"
          disabled={isSubmitting || !isFormValid}
          className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white border-0 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            "Send"
          )}
        </Button>
      </div>
    </form>
  );
}

