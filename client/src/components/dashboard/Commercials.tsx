import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  DollarSign, 
  MessageSquare, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  Calendar,
  CreditCard,
  UserPlus,
  Activity
} from "lucide-react";

interface CommercialsProps {
  workerId: number;
}

export default function Commercials({ workerId }: CommercialsProps) {
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "all">("30d");

  // Demo data - in production this would come from the backend
  const metrics = {
    totalUsers: 1247,
    userGrowth: 12.5,
    monthlyRevenue: 24850,
    revenueGrowth: 8.3,
    totalConversations: 15420,
    conversationGrowth: 23.1,
    avgRevenuePerUser: 19.93,
    arpuGrowth: -2.1,
    newUsersThisMonth: 156,
    activeUsers: 892,
    churnRate: 3.2,
    lifetimeValue: 245.60,
    conversionRate: 4.8,
    totalTransactions: 3421,
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const GrowthIndicator = ({ value }: { value: number }) => {
    const isPositive = value >= 0;
    return (
      <span className={`flex items-center text-sm ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
        {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
        {Math.abs(value)}%
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Commercials</h2>
          <p className="text-slate-400 mt-1">Business metrics and revenue analytics</p>
        </div>
        <div className="flex gap-2">
          {(["7d", "30d", "90d", "all"] as const).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange(range)}
              className={timeRange === range 
                ? "bg-cyan-500 hover:bg-cyan-600 text-white" 
                : "border-slate-600 text-slate-300 hover:bg-slate-700"
              }
            >
              {range === "all" ? "All Time" : range === "7d" ? "7 Days" : range === "30d" ? "30 Days" : "90 Days"}
            </Button>
          ))}
        </div>
      </div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border-cyan-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-cyan-500/20 rounded-xl">
                <Users className="w-6 h-6 text-cyan-400" />
              </div>
              <GrowthIndicator value={metrics.userGrowth} />
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold text-white">{formatNumber(metrics.totalUsers)}</p>
              <p className="text-slate-400 text-sm mt-1">Total Users</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border-emerald-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-emerald-500/20 rounded-xl">
                <DollarSign className="w-6 h-6 text-emerald-400" />
              </div>
              <GrowthIndicator value={metrics.revenueGrowth} />
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold text-white">{formatCurrency(metrics.monthlyRevenue)}</p>
              <p className="text-slate-400 text-sm mt-1">Monthly Revenue</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-purple-500/20 rounded-xl">
                <MessageSquare className="w-6 h-6 text-purple-400" />
              </div>
              <GrowthIndicator value={metrics.conversationGrowth} />
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold text-white">{formatNumber(metrics.totalConversations)}</p>
              <p className="text-slate-400 text-sm mt-1">Total Conversations</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-amber-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-amber-500/20 rounded-xl">
                <TrendingUp className="w-6 h-6 text-amber-400" />
              </div>
              <GrowthIndicator value={metrics.arpuGrowth} />
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold text-white">${metrics.avgRevenuePerUser.toFixed(2)}</p>
              <p className="text-slate-400 text-sm mt-1">Avg Revenue Per User</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-cyan-400" />
              User Acquisition
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">New Users (This Month)</span>
              <span className="text-white font-semibold">{formatNumber(metrics.newUsersThisMonth)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Active Users</span>
              <span className="text-white font-semibold">{formatNumber(metrics.activeUsers)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Churn Rate</span>
              <span className="text-red-400 font-semibold">{metrics.churnRate}%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-400" />
              Revenue Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Lifetime Value (LTV)</span>
              <span className="text-white font-semibold">{formatCurrency(metrics.lifetimeValue)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Conversion Rate</span>
              <span className="text-emerald-400 font-semibold">{metrics.conversionRate}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Total Transactions</span>
              <span className="text-white font-semibold">{formatNumber(metrics.totalTransactions)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-400" />
              Engagement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Avg Conversations/User</span>
              <span className="text-white font-semibold">{(metrics.totalConversations / metrics.totalUsers).toFixed(1)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Active User Rate</span>
              <span className="text-cyan-400 font-semibold">{((metrics.activeUsers / metrics.totalUsers) * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Retention Rate</span>
              <span className="text-emerald-400 font-semibold">{(100 - metrics.churnRate).toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart Placeholder */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-400" />
            Revenue Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center border border-dashed border-slate-600 rounded-lg">
            <div className="text-center">
              <TrendingUp className="w-12 h-12 text-slate-500 mx-auto mb-3" />
              <p className="text-slate-400">Revenue chart visualization</p>
              <p className="text-slate-500 text-sm mt-1">Connect payment provider to see real data</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Banner */}
      <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-cyan-500/20 rounded-lg">
            <DollarSign className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h4 className="text-white font-medium">Connect Payment Provider</h4>
            <p className="text-slate-400 text-sm mt-1">
              Integrate with Stripe or another payment provider to track real revenue data and user subscriptions.
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20"
            >
              Set Up Payments
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
