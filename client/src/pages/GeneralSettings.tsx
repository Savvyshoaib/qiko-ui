import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader";
import { User, Shield, CreditCard, ArrowRight, KeyRound } from "lucide-react";
import { useLocation } from "wouter";
import CalendlyToken from "@/components/dashboard/CalendlyToken";
import WithPermission from "@/_core/components/WithPermission";

const QIKO_USER_INFO_KEY = "qiko_user_info";

function getQikoUserInfo(): { user_name?: string; email?: string; [key: string]: unknown } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(QIKO_USER_INFO_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { user_name?: string; email?: string; [key: string]: unknown };
  } catch {
    return null;
  }
}

export default function GeneralSettings() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<ReturnType<typeof getQikoUserInfo>>(null);

  useEffect(() => {
    setUser(getQikoUserInfo());
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={User}
        title="General Settings"
        description="Manage your account and preferences."
      />

      <Card className="bg-[#0a0f1a] border-white/5">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <User className="w-5 h-5 text-[#6366F1]" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-400">Name</label>
              <p className="text-white">{user?.user_name ?? "Not set"}</p>
            </div>
            <div>
              <label className="text-sm text-slate-400">Email</label>
              <p className="text-white">{user?.email ?? "Not set"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#0a0f1a] border-white/5">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-400" />
            Billing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400 text-sm mb-4">Manage your subscription and payment methods</p>
          <WithPermission>
          <Button
            className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 hover:shadow-emerald-800/50 text-white border-0 shadow-lg shadow-emerald-900/30 focus-visible:ring-2 focus-visible:ring-cyan-400/60"
            onClick={() => setLocation("/app/pricing")}
          >
            <CreditCard className="w-4 h-4 mr-2" />
            View Plans
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          </WithPermission>
        </CardContent>
      </Card>

      <Card className="bg-[#0a0f1a] border-white/5">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-400" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400 text-sm mb-4">Update your account password securely.</p>
          <WithPermission>
            <Button
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:shadow-purple-800/50 text-white border-0 shadow-lg shadow-purple-900/30 focus-visible:ring-2 focus-visible:ring-purple-400/60"
              onClick={() => setLocation("/change-password")}
            >
              <KeyRound className="w-4 h-4 mr-2" />
              Change Password
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </WithPermission>
        </CardContent>
      </Card>

    </div>
  );
}
