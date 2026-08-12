"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getSubscriptionPortalUrl } from "@/lib/avatarApi";
import WithPermission from "@/_core/components/WithPermission";

interface ViewPlanButtonProps {
  isCurrent: boolean;
}

export default function ViewPlanButton({ isCurrent }: ViewPlanButtonProps) {
  const [loading, setLoading] = useState(false);

  if (!isCurrent) return null;

  const handleClick = async () => {
    setLoading(true);
    try {
      const portalUrl = await getSubscriptionPortalUrl();
      window.open(portalUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to open billing portal");
    } finally {
      setLoading(false);
    }
  };

  return (<>
  <WithPermission>
    <Button
      variant="outline"
      onClick={handleClick}
      disabled={loading}
      className="border-white/20 text-white hover:bg-white/5"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <ExternalLink className="h-4 w-4 mr-2" />
      )}
      View My Plan Details
    </Button>
    </WithPermission>
    </>
  );
}
