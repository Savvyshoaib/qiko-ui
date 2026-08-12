import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Users, 
  DollarSign, 
  Search, 
  Plus, 
  Hotel, 
  Plane, 
  Car, 
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Filter,
  Sparkles,
  TrendingUp,
  Check,
  UserPlus,
  FileText,
  BarChart3,
  ListFilter,
  Eye,
  Trash2
} from "lucide-react";
import { toast } from "sonner";

// Golf icon component
function GolfIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="18" r="3" />
      <path d="M12 15V3l7 4-7 4" />
    </svg>
  );
}

interface BookingsProps {
  workerId: number;
  onSelectBooking?: (bookingId: number) => void;
}

type BookingStep = 'overview' | 'confirmed' | 'prospects' | 'analytics';

const BOOKING_STEPS = [
  { 
    id: 'overview' as const, 
    label: 'Overview', 
    icon: BarChart3, 
    color: '#6366F1',
    description: 'Quick stats & insights'
  },
  { 
    id: 'confirmed' as const, 
    label: 'Bookings', 
    icon: Calendar, 
    color: '#22D3EE',
    description: 'Active trips & itineraries'
  },
  { 
    id: 'prospects' as const, 
    label: 'Prospects', 
    icon: UserPlus, 
    color: '#10B981',
    description: 'Leads & inquiries'
  },
  { 
    id: 'analytics' as const, 
    label: 'Analytics', 
    icon: TrendingUp, 
    color: '#F59E0B',
    description: 'Performance metrics'
  },
];

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  confirmed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  paid: "bg-green-500/10 text-green-400 border-green-500/20",
  fulfilled: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
};

const PROSPECT_STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  contacted: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  interested: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  quoted: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  converted: "bg-green-500/10 text-green-400 border-green-500/20",
  lost: "bg-red-500/10 text-red-400 border-red-500/20",
};

export function Bookings({ workerId, onSelectBooking }: BookingsProps) {
  const [activeStep, setActiveStep] = useState<BookingStep>('overview');
  const [searchQuery, setSearchQuery] = useState("");

  const { data: bookings, isLoading } = trpc.booking.list.useQuery({ workerId });
  const { data: stats } = trpc.booking.getStats.useQuery({ workerId });
  const { data: prospects, isLoading: prospectsLoading } = trpc.prospect.list.useQuery({ workerId });

  const filteredBookings = bookings?.filter(booking => {
    const matchesSearch = !searchQuery || 
      booking.tripTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.referenceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const filteredProspects = prospects?.filter(prospect => {
    const matchesSearch = !searchQuery || 
      prospect.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prospect.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const formatDate = (date: Date | string | null) => {
    if (!date) return "TBD";
    return new Date(date).toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric",
      year: "numeric"
    });
  };

  const formatCurrency = (amount: number | null, currency = "USD") => {
    if (!amount) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(amount / 100);
  };

  const getStepProgress = (stepId: BookingStep) => {
    switch (stepId) {
      case 'overview': return 100;
      case 'confirmed': return bookings?.length ? 100 : 0;
      case 'prospects': return prospects?.length ? 100 : 0;
      case 'analytics': return 50;
      default: return 0;
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 'overview':
        return (
          <div className="space-y-4">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs text-slate-400">Total Bookings</span>
                </div>
                <p className="text-xl font-bold text-white">{stats?.totalBookings || 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-slate-400">Active Trips</span>
                </div>
                <p className="text-xl font-bold text-white">{stats?.activeBookings || 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-amber-400" />
                  <span className="text-xs text-slate-400">Revenue</span>
                </div>
                <p className="text-xl font-bold text-white">{formatCurrency(stats?.totalRevenue || 0)}</p>
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-1">
                  <UserPlus className="w-4 h-4 text-purple-400" />
                  <span className="text-xs text-slate-400">Prospects</span>
                </div>
                <p className="text-xl font-bold text-white">{prospects?.length || 0}</p>
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h3 className="text-sm font-medium text-white mb-2">Recent Activity</h3>
              <div className="space-y-2">
                {bookings?.slice(0, 3).map((booking) => (
                  <div 
                    key={booking.id}
                    onClick={() => onSelectBooking?.(booking.id)}
                    className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/10 hover:border-cyan-500/30 cursor-pointer transition-all"
                  >
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{booking.tripTitle || 'Untitled Trip'}</p>
                      <p className="text-xs text-slate-400">{booking.customer?.name || 'No customer'}</p>
                    </div>
                    <Badge className={`text-[10px] ${STATUS_COLORS[booking.status || 'draft']}`}>
                      {booking.status}
                    </Badge>
                  </div>
                )) || (
                  <p className="text-sm text-slate-400 text-center py-4">No recent bookings</p>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2">
              <Button 
                onClick={() => setActiveStep('confirmed')}
                className="h-10 bg-gradient-to-r from-cyan-500 to-blue-500 hover:opacity-90 text-white text-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Booking
              </Button>
              <Button 
                onClick={() => setActiveStep('prospects')}
                variant="outline"
                className="h-10 border-white/10 text-white hover:bg-white/5 text-sm"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add Prospect
              </Button>
            </div>
          </div>
        );

      case 'confirmed':
        return (
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search bookings..."
                className="pl-9 h-9 bg-white/5 border-white/10 text-white text-sm"
              />
            </div>

            {/* Bookings List */}
            {isLoading ? (
              <div className="text-center py-8">
                <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : filteredBookings?.length ? (
              <div className="space-y-2">
                {filteredBookings.map((booking) => (
                  <div 
                    key={booking.id}
                    onClick={() => onSelectBooking?.(booking.id)}
                    className="group p-3 rounded-lg bg-white/5 border border-white/10 hover:border-cyan-500/30 cursor-pointer transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-white">{booking.tripTitle || 'Untitled Trip'}</p>
                        <p className="text-xs text-slate-400">{booking.customer?.name || 'No customer'}</p>
                      </div>
                      <Badge className={`text-[10px] ${STATUS_COLORS[booking.status || 'draft']}`}>
                        {booking.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(booking.tripStartDate)}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        {formatCurrency(booking.totalValue || 0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No bookings yet</p>
                <Button 
                  onClick={() => toast.info('Create booking - Coming soon!')}
                  className="mt-3 h-8 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Create First Booking
                </Button>
              </div>
            )}
          </div>
        );

      case 'prospects':
        return (
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search prospects..."
                className="pl-9 h-9 bg-white/5 border-white/10 text-white text-sm"
              />
            </div>

            {/* Prospects List */}
            {prospectsLoading ? (
              <div className="text-center py-8">
                <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : filteredProspects?.length ? (
              <div className="space-y-2">
                {filteredProspects.map((prospect) => (
                  <div 
                    key={prospect.id}
                    className="group p-3 rounded-lg bg-white/5 border border-white/10 hover:border-green-500/30 transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-white">{prospect.name || 'Unknown'}</p>
                        <p className="text-xs text-slate-400">{prospect.email || 'No email'}</p>
                      </div>
                      <Badge className={`text-[10px] ${PROSPECT_STATUS_COLORS[prospect.status || 'new']}`}>
                        {prospect.status}
                      </Badge>
                    </div>
                    {prospect.conversationSummary && (
                      <p className="text-xs text-slate-400 line-clamp-2">{prospect.conversationSummary}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <UserPlus className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No prospects yet</p>
                <Button 
                  onClick={() => toast.info('Add prospect - Coming soon!')}
                  className="mt-3 h-8 bg-green-500/20 text-green-400 hover:bg-green-500/30 text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add First Prospect
                </Button>
              </div>
            )}
          </div>
        );

      case 'analytics':
        return (
          <div className="space-y-4">
            {/* Conversion Funnel */}
            <div>
              <h3 className="text-sm font-medium text-white mb-3">Conversion Funnel</h3>
              <div className="space-y-2">
                {[
                  { label: 'Inquiries', value: prospects?.length || 0, color: '#6366F1', width: '100%' },
                  { label: 'Quoted', value: prospects?.filter(p => p.status === 'quoted').length || 0, color: '#22D3EE', width: '60%' },
                  { label: 'Converted', value: prospects?.filter(p => p.status === 'converted').length || 0, color: '#10B981', width: '30%' },
                ].map((stage) => (
                  <div key={stage.label} className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 w-20">{stage.label}</span>
                    <div className="flex-1 h-6 bg-white/5 rounded overflow-hidden">
                      <div 
                        className="h-full rounded flex items-center justify-end pr-2 transition-all"
                        style={{ width: stage.width, backgroundColor: `${stage.color}30` }}
                      >
                        <span className="text-xs font-medium" style={{ color: stage.color }}>{stage.value}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <p className="text-xs text-slate-400 mb-1">Avg. Booking Value</p>
                <p className="text-lg font-bold text-white">
                  {stats?.totalBookings ? formatCurrency((stats.totalRevenue || 0) / stats.totalBookings) : '-'}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <p className="text-xs text-slate-400 mb-1">Conversion Rate</p>
                <p className="text-lg font-bold text-white">
                  {prospects?.length ? `${Math.round((prospects.filter(p => p.status === 'converted').length / prospects.length) * 100)}%` : '0%'}
                </p>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header - Compact */}
      <div className="px-4 py-3 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">Bookings</h1>
            <p className="text-xs text-slate-400">Manage trips & prospects</p>
          </div>
          <Button 
            onClick={() => toast.info('New booking - Coming soon!')}
            size="sm"
            className="h-8 bg-gradient-to-r from-cyan-500 to-blue-500 hover:opacity-90 text-white text-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            New
          </Button>
        </div>
      </div>

      {/* Step Pills - Horizontal */}
      <div className="px-4 py-2 border-b border-white/5 overflow-x-auto">
        <div className="flex gap-1.5 min-w-max">
          {BOOKING_STEPS.map((step) => {
            const Icon = step.icon;
            const progress = getStepProgress(step.id);
            const isActive = activeStep === step.id;
            
            return (
              <button
                key={step.id}
                onClick={() => setActiveStep(step.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${
                  isActive 
                    ? 'bg-white/10 border border-white/20' 
                    : 'hover:bg-white/5 border border-transparent'
                }`}
              >
                <div 
                  className="w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${step.color}20` }}
                >
                  {progress >= 100 ? (
                    <Check className="w-3 h-3" style={{ color: step.color }} />
                  ) : (
                    <Icon className="w-3 h-3" style={{ color: step.color }} />
                  )}
                </div>
                <span className={`text-xs font-medium ${isActive ? 'text-white' : 'text-slate-400'}`}>
                  {step.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-md mx-auto">
          {/* Step Header */}
          <div className="mb-4">
            {BOOKING_STEPS.filter(s => s.id === activeStep).map(step => {
              const Icon = step.icon;
              return (
                <div key={step.id} className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${step.color}20` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: step.color }} />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-white">{step.label}</h2>
                    <p className="text-xs text-slate-400">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Step Content */}
          {renderStepContent()}
        </div>
      </div>
    </div>
  );
}
