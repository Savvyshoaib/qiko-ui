import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ArrowLeft,
  Calendar, 
  Users, 
  DollarSign, 
  Hotel, 
  Plane, 
  Car, 
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Mail,
  Phone,
  FileText,
  Send,
  Edit,
  MoreHorizontal,
  ExternalLink
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

interface BookingDetailProps {
  bookingId: number;
  onBack: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  confirmed: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  paid: "bg-green-500/10 text-green-500 border-green-500/20",
  fulfilled: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
};

const ITEM_STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  confirmed: "bg-green-500/10 text-green-500 border-green-500/20",
  cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
  completed: "bg-purple-500/10 text-purple-500 border-purple-500/20",
};

const ACTION_STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  in_progress: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  completed: "bg-green-500/10 text-green-500 border-green-500/20",
  skipped: "bg-slate-500/10 text-slate-500 border-slate-500/20",
};

const ITEM_TYPE_ICONS: Record<string, React.ReactNode> = {
  hotel: <Hotel className="w-5 h-5" />,
  flight: <Plane className="w-5 h-5" />,
  golf: <GolfIcon className="w-5 h-5" />,
  transfer: <Car className="w-5 h-5" />,
  activity: <MapPin className="w-5 h-5" />,
  restaurant: <MapPin className="w-5 h-5" />,
  other: <FileText className="w-5 h-5" />,
};

const ACTION_TYPE_ICONS: Record<string, React.ReactNode> = {
  email: <Mail className="w-4 h-4" />,
  call: <Phone className="w-4 h-4" />,
  task: <FileText className="w-4 h-4" />,
  reminder: <Clock className="w-4 h-4" />,
  follow_up: <Send className="w-4 h-4" />,
};

export function BookingDetail({ bookingId, onBack }: BookingDetailProps) {
  const utils = trpc.useUtils();
  const { data: booking, isLoading } = trpc.booking.get.useQuery({ bookingId });
  
  const updateActionMutation = trpc.booking.updateAction.useMutation({
    onSuccess: () => {
      utils.booking.get.invalidate({ bookingId });
      toast.success("Action updated");
    },
  });

  const formatDate = (date: Date | string | null) => {
    if (!date) return "TBD";
    return new Date(date).toLocaleDateString("en-US", { 
      weekday: "short",
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

  const handleActionComplete = (actionId: number, completed: boolean) => {
    updateActionMutation.mutate({
      actionId,
      status: completed ? "completed" : "pending",
      completedAt: completed ? new Date().toISOString() : undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading booking details...</div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-muted-foreground">Booking not found</div>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Bookings
        </Button>
      </div>
    );
  }

  const pendingActions = booking.pendingActions?.filter(a => a.status === "pending") || [];
  const completedActions = booking.pendingActions?.filter(a => a.status === "completed") || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="font-mono text-sm text-muted-foreground">
                {booking.referenceNumber}
              </span>
              <Badge variant="outline" className={STATUS_COLORS[booking.status || "draft"]}>
                {booking.status}
              </Badge>
            </div>
            <h2 className="text-2xl font-bold">{booking.tripTitle || "Untitled Trip"}</h2>
            {booking.destination && (
              <p className="text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="w-4 h-4" />
                {booking.destination}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" size="sm">
            <Send className="w-4 h-4 mr-2" />
            Send to Customer
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Export PDF</DropdownMenuItem>
              <DropdownMenuItem>Duplicate Booking</DropdownMenuItem>
              <DropdownMenuItem className="text-red-500">Cancel Booking</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Trip Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Trip Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Dates</p>
                  <p className="font-medium">
                    {formatDate(booking.tripStartDate)} - {formatDate(booking.tripEndDate)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Travelers</p>
                  <p className="font-medium">{booking.travelers || 1} guest{(booking.travelers || 1) !== 1 ? "s" : ""}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Value</p>
                  <p className="font-medium text-lg">{formatCurrency(booking.totalValue, booking.currency || "USD")}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payment</p>
                  {booking.fullPaymentReceived ? (
                    <p className="font-medium text-green-500 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Fully Paid
                    </p>
                  ) : booking.depositPaid ? (
                    <p className="font-medium text-blue-500">Deposit Paid</p>
                  ) : (
                    <p className="font-medium text-amber-500">Pending</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Booked Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Booked Items</CardTitle>
                  <CardDescription>
                    {booking.items?.length || 0} item{(booking.items?.length || 0) !== 1 ? "s" : ""} in this booking
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {!booking.items?.length ? (
                <div className="p-6 text-center text-muted-foreground">
                  No items booked yet. Add hotels, flights, golf, or other services.
                </div>
              ) : (
                <div className="divide-y">
                  {booking.items.map((item) => (
                    <div key={item.id} className="p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          item.status === "confirmed" ? "bg-green-500/10 text-green-500" :
                          item.status === "cancelled" ? "bg-red-500/10 text-red-500" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {ITEM_TYPE_ICONS[item.itemType]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{item.title}</h4>
                            <Badge variant="outline" className={ITEM_STATUS_COLORS[item.status || "pending"]}>
                              {item.status}
                            </Badge>
                          </div>
                          {item.provider && (
                            <p className="text-sm text-muted-foreground">{item.provider}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            {item.startDate && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {formatDate(item.startDate)}
                                {item.endDate && ` - ${formatDate(item.endDate)}`}
                              </span>
                            )}
                            {item.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                {item.location}
                              </span>
                            )}
                          </div>
                          {item.providerReference && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Confirmation: <span className="font-mono">{item.providerReference}</span>
                            </p>
                          )}
                          {item.apiProvider && (
                            <Badge variant="secondary" className="mt-2 text-xs">
                              Booked via {item.apiProvider}
                            </Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            {formatCurrency(item.price, item.currency || "USD")}
                          </p>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="mt-1">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>Edit Item</DropdownMenuItem>
                              <DropdownMenuItem>Mark as Confirmed</DropdownMenuItem>
                              <DropdownMenuItem>View Details</DropdownMenuItem>
                              <DropdownMenuItem className="text-red-500">Remove Item</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Customer</CardTitle>
            </CardHeader>
            <CardContent>
              {booking.customer ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                      {booking.customer.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold">{booking.customer.name}</p>
                      {booking.customer.email && (
                        <p className="text-sm text-muted-foreground">{booking.customer.email}</p>
                      )}
                    </div>
                  </div>
                  {booking.customer.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      {booking.customer.phone}
                    </div>
                  )}
                  <Separator />
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Mail className="w-4 h-4 mr-1" />
                      Email
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Phone className="w-4 h-4 mr-1" />
                      Call
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No customer assigned</p>
                  <Button variant="outline" size="sm" className="mt-2">
                    Add Customer
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Actions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Pending Actions</CardTitle>
                {pendingActions.length > 0 && (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                    {pendingActions.length}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {!pendingActions.length ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500 opacity-50" />
                  All actions completed!
                </div>
              ) : (
                <div className="divide-y">
                  {pendingActions.map((action) => (
                    <div key={action.id} className="p-3 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={action.status === "completed"}
                          onCheckedChange={(checked) => handleActionComplete(action.id, checked as boolean)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">
                              {ACTION_TYPE_ICONS[action.actionType]}
                            </span>
                            <p className="font-medium text-sm">{action.title}</p>
                          </div>
                          {action.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {action.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            {action.priority === "high" || action.priority === "urgent" ? (
                              <Badge variant="outline" className="text-xs bg-red-500/10 text-red-500 border-red-500/20">
                                {action.priority}
                              </Badge>
                            ) : null}
                            {action.dueDate && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Due {formatDate(action.dueDate)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="p-3 border-t">
                <Button variant="ghost" size="sm" className="w-full">
                  + Add Action
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Completed Actions */}
          {completedActions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-muted-foreground">Completed</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {completedActions.slice(0, 5).map((action) => (
                    <div key={action.id} className="p-3 opacity-60">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm line-through">{action.title}</p>
                          {action.completedAt && (
                            <p className="text-xs text-muted-foreground">
                              Completed {formatDate(action.completedAt)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
