import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import GlobalLayout from "@/components/GlobalLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Empty, EmptyDescription } from "@/components/ui/empty";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import PageHeader from "@/components/PageHeader";
import { Users, UserPlus, Send, Trash2, ArrowUpDown, ArrowUp, ArrowDown, CheckCircle2, Clock3, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { createTeamMember, deleteTeamMemberApi, getTeamMembers, sendTeamMemberInvite, type TeamMemberApiItem, updateTeamMemberRoleApi } from "@/lib/TeamApi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  addTeamMember,
  removeTeamMember,
  setTeamMembers,
  updateTeamMemberInviteStatus,
  updateTeamMemberRole as updateTeamMemberRoleInState,
} from "@/store/slices/teamSlice";

type TeamRole = "viewer" | "editor" | "admin";

interface InviteItem {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  status: "pending";
  inviteStatus: "not_sent" | "sent";
  token: string;
  inviteLink: string;
}

interface AcceptedUserItem {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  status: "accepted";
}

type ConfirmActionDialogState = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  isDestructive?: boolean;
  onConfirm: (() => void) | null;
};

const ROLE_LABEL: Record<TeamRole, string> = {
  viewer: "User",
  editor: "Creator",
  admin: "Admin",
};
const RESEND_COOLDOWN_SECONDS = 30;

type TeamAccessProps = {
  embedded?: boolean;
};

type TeamTableProps = {
  hasRows: boolean;
  emptyText: string;
  sortBy: "name" | "email" | "role";
  sortDirection: "asc" | "desc";
  onToggleSort: (column: "name" | "email" | "role") => void;
  children: ReactNode;
};

const TEAM_TABLE_GRID = "grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_160px_minmax(168px,1fr)] gap-3 items-center";

/** Closed-state role dropdown: matches pill controls (e.g. Resend email) on this page. */
const TEAM_ROLE_SELECT_TRIGGER_CLASS =
  "h-8 w-full max-w-full min-w-0 rounded-lg border border-white/[0.08] bg-white/[0.02] px-2.5 text-xs font-medium text-white shadow-none transition-colors hover:bg-white/[0.06] hover:border-white/15 focus-visible:border-white/20 focus-visible:ring-2 focus-visible:ring-emerald-500/25 focus-visible:ring-offset-0 data-[state=open]:border-white/20 data-[state=open]:bg-white/[0.06] [&_svg]:size-3.5 [&_svg]:text-slate-400 *:data-[slot=select-value]:min-w-0 *:data-[slot=select-value]:truncate";

const TEAM_ROLE_SELECT_CONTENT_CLASS =
  "border border-white/10 bg-[#121a28] text-white shadow-lg";

/** Dropdown width matches trigger only (avoids min-w-[8rem] extra right space) */
const TEAM_ROLE_SELECT_CONTENT_COMPACT_CLASS =
  `${TEAM_ROLE_SELECT_CONTENT_CLASS} min-w-0 w-[var(--radix-select-trigger-width)]`;

const TEAM_ROLE_SELECT_TRIGGER_TABLE_CLASS =
  "h-8 w-[7rem] max-w-full min-w-0 shrink-0 rounded-lg border border-white/[0.08] bg-white/[0.02] px-2.5 text-xs font-medium text-white shadow-none transition-colors hover:bg-white/[0.06] hover:border-white/15 focus-visible:border-white/20 focus-visible:ring-2 focus-visible:ring-emerald-500/25 focus-visible:ring-offset-0 data-[state=open]:border-white/20 data-[state=open]:bg-white/[0.06] [&_svg]:size-3.5 [&_svg]:text-slate-400 *:data-[slot=select-value]:min-w-0 *:data-[slot=select-value]:truncate";

const TEAM_ROLE_SELECT_ITEM_CLASS =
  "cursor-pointer rounded-md text-white focus:bg-white/[0.08] focus:text-white";

function TeamTableSkeleton() {
  return (
    <div className="space-y-2">
      <div className={`${TEAM_TABLE_GRID} hidden md:grid px-3 py-1`}>
        <Skeleton className="h-3 w-16 bg-slate-300/40" />
        <Skeleton className="h-3 w-20 bg-slate-300/40" />
        <Skeleton className="h-3 w-12 ml-auto bg-slate-300/40" />
        <Skeleton className="h-3 w-14 ml-auto bg-slate-300/40" />
      </div>
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className={`${TEAM_TABLE_GRID} rounded-lg border border-white/10 bg-white/[0.01] px-3 py-1`}>
          <Skeleton className="h-4 w-28 bg-slate-300/35" />
          <Skeleton className="h-4 w-40 bg-slate-300/35" />
          <Skeleton className="h-8 w-24 ml-auto bg-slate-300/35" />
          <Skeleton className="h-8 w-16 ml-auto bg-slate-300/35" />
        </div>
      ))}
    </div>
  );
}

function TeamTable({ hasRows, emptyText, sortBy, sortDirection, onToggleSort, children }: TeamTableProps) {
  if (!hasRows) {
    return (
      <Empty className="border-white/10 bg-white/[0.01] py-10">
        <EmptyDescription className="text-slate-400">{emptyText}</EmptyDescription>
      </Empty>
    );
  }

  const sortIcon = (column: "name" | "email" | "role") => {
    if (sortBy !== column) return <ArrowUpDown className="w-3 h-3 text-slate-500" />;
    return sortDirection === "asc" ? (
      <ArrowUp className="w-3 h-3 text-emerald-400" />
    ) : (
      <ArrowDown className="w-3 h-3 text-emerald-400" />
    );
  };

  return (
    <div className="space-y-1">
      <div className={`${TEAM_TABLE_GRID} hidden md:grid px-3 py-1 text-[10px] uppercase tracking-wide text-slate-500`}>
        <button
          type="button"
          onClick={() => onToggleSort("name")}
          className={`inline-flex items-center gap-1 text-left`}
        >
          Name {sortIcon("name")}
        </button>
        <button
          type="button"
          onClick={() => onToggleSort("email")}
          className={`inline-flex items-center gap-1 text-left`}
        >
          Email {sortIcon("email")}
        </button>
        <button
          type="button"
          onClick={() => onToggleSort("role")}
          className={`inline-flex items-center justify-end gap-1 text-right`}
        >
          Role {sortIcon("role")}
        </button>
        <span className="flex justify-end text-right">Actions</span>
      </div>
      {children}
    </div>
  );
}

type InviteMemberDialogProps = {
  onSubmit: (payload: { name: string; email: string; role: TeamRole }) => Promise<void>;
};

function InviteMemberDialog({ onSubmit }: InviteMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteRole, setInviteRole] = useState<TeamRole>("viewer");
  const inviteNameRef = useRef("");
  const inviteEmailRef = useRef("");

  useEffect(() => {
    if (!open) {
      inviteNameRef.current = "";
      inviteEmailRef.current = "";
      setInviteRole("viewer");
    }
  }, [open]);

  const submitInvite = async () => {
    try {
      setIsSubmitting(true);
      await onSubmit({
        name: inviteNameRef.current,
        email: inviteEmailRef.current,
        role: inviteRole,
      });
      setOpen(false);
    } catch {
      setOpen(true);
      // Keep modal open when invite fails.
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full md:w-auto">
          <UserPlus className="w-4 h-4 mr-2" />
          Add Team
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#0a0f1a] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-emerald-400" />
            Add Team Member
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            Send an invite by entering name, email, and role.
          </DialogDescription>
        </DialogHeader>
        <div className="min-w-0 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-slate-300">Name</Label>
            <Input
              defaultValue=""
              onChange={(e) => {
                inviteNameRef.current = e.target.value;
              }}
              placeholder="Jane Doe"
              className="bg-white/[0.03] border-white/[0.08] text-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300">Email</Label>
            <Input
              defaultValue=""
              onChange={(e) => {
                inviteEmailRef.current = e.target.value;
              }}
              placeholder="name@company.com"
              className="bg-white/[0.03] border-white/[0.08] text-white"
            />
          </div>
          <div className="min-w-0 space-y-1.5">
            <Label className="text-slate-300">Role</Label>
            <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as TeamRole)}>
              <SelectTrigger className={TEAM_ROLE_SELECT_TRIGGER_CLASS}>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent className={TEAM_ROLE_SELECT_CONTENT_CLASS}>
                <SelectItem value="viewer" className={TEAM_ROLE_SELECT_ITEM_CLASS}
                  description="Can access Studio and use chat. Cannot create/edit workers, update configuration, manage knowledge/rules, or manage users."
                >
                  User
                </SelectItem>
                <SelectItem value="editor" className={TEAM_ROLE_SELECT_ITEM_CLASS}
                  description="Can access Studio, chat, create/edit workers, update worker configuration, rules, and knowledge. Cannot manage users or roles.">
                  Creator
                </SelectItem>
                <SelectItem value="admin" className={TEAM_ROLE_SELECT_ITEM_CLASS}
                  description="Full access, including user invites, removals, role management, worker configuration, Studio access, and chat access.">
                  Admin
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="border-white/20 text-slate-200 hover:bg-white/10 hover:text-white"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button type="button" onClick={submitInvite} disabled={isSubmitting}>
            <Send className="w-4 h-4 mr-2" />
            {isSubmitting ? "Sending..." : "Send Invite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function TeamAccess({ embedded = false }: TeamAccessProps) {
  const dispatch = useAppDispatch();
  const teamMembers = useAppSelector((state) => state.team.members);
  const [activeTab, setActiveTab] = useState<"accepted" | "pending">("accepted");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | TeamRole>("all");
  const [acceptedSortBy, setAcceptedSortBy] = useState<"name" | "email" | "role">("name");
  const [acceptedSortDirection, setAcceptedSortDirection] = useState<"asc" | "desc">("asc");
  const [pendingSortBy, setPendingSortBy] = useState<"name" | "email" | "role">("name");
  const [pendingSortDirection, setPendingSortDirection] = useState<"asc" | "desc">("asc");
  const [isMembersLoading, setIsMembersLoading] = useState(true);
  const [resendingInviteId, setResendingInviteId] = useState<string | null>(null);
  const [resendCooldownById, setResendCooldownById] = useState<Record<string, number>>({});
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmActionDialogState>({
    open: false,
    title: "",
    description: "",
    confirmLabel: "Confirm",
    isDestructive: false,
    onConfirm: null,
  });

  const mapApiRoleToUiRole = (role: string): TeamRole => {
    if (role === "viewer" || role === "editor" || role === "admin") return role;
    return "admin";
  };

  const mapMemberToAccepted = (member: TeamMemberApiItem): AcceptedUserItem => ({
    id: String(member.id),
    name: member.user?.user_name || "Unknown",
    email: member.user?.email || "",
    role: mapApiRoleToUiRole(member.role),
    status: "accepted",
  });

  const mapMemberToPending = (member: TeamMemberApiItem): InviteItem => ({
    id: String(member.id),
    name: member.user?.user_name || "Unknown",
    email: member.user?.email || "",
    role: mapApiRoleToUiRole(member.role),
    status: "pending",
    inviteStatus: member.invite_status === "sent" ? "sent" : "not_sent",
    token: String(member.id),
    inviteLink: "",
  });

  const loadTeamMembers = async () => {
    try {
      setIsMembersLoading(true);
      const response = await getTeamMembers();
      // Live Settings list excludes owner (`GET /team/members`); keep a guard in case API changes.
      const members = (response.data?.members ?? []).filter(
        (member) => String(member.role).toLowerCase() !== "owner"
      );
      dispatch(setTeamMembers(members));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to fetch team members");
    } finally {
      setIsMembersLoading(false);
    }
  };

  useEffect(() => {
    loadTeamMembers();
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setResendCooldownById((prev) => {
        if (Object.keys(prev).length === 0) return prev;
        const next: Record<string, number> = {};
        for (const [id, seconds] of Object.entries(prev)) {
          if (seconds > 1) next[id] = seconds - 1;
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const acceptedUsers = useMemo(
    () => teamMembers.filter((member) => member.invite_status === "accepted").map(mapMemberToAccepted),
    [teamMembers]
  );
  const invites = useMemo(
    () =>
      teamMembers
        .filter((member) => member.invite_status === "not_sent" || member.invite_status === "sent")
        .map(mapMemberToPending),
    [teamMembers]
  );

  const getInviteStatusLabel = (status: InviteItem["inviteStatus"]) =>
    status === "sent" ? "Invited" : "Not sent";

  const pendingCount = invites.length;
  const acceptedCount = acceptedUsers.length;

  const filteredAcceptedUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return acceptedUsers.filter((user) => {
      const matchesSearch =
        !query ||
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query);
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [acceptedUsers, searchTerm, roleFilter]);

  const filteredPendingInvites = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return invites.filter((invite) => {
      const matchesSearch =
        !query ||
        invite.name.toLowerCase().includes(query) ||
        invite.email.toLowerCase().includes(query);
      const matchesRole = roleFilter === "all" || invite.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [invites, searchTerm, roleFilter]);

  const sortedAcceptedUsers = useMemo(() => {
    const sorted = [...filteredAcceptedUsers].sort((a, b) => {
      const left = (a[acceptedSortBy] ?? "").toString().toLowerCase();
      const right = (b[acceptedSortBy] ?? "").toString().toLowerCase();
      return left.localeCompare(right);
    });
    return acceptedSortDirection === "asc" ? sorted : sorted.reverse();
  }, [filteredAcceptedUsers, acceptedSortBy, acceptedSortDirection]);

  const sortedPendingInvites = useMemo(() => {
    const sorted = [...filteredPendingInvites].sort((a, b) => {
      const left = (a[pendingSortBy] ?? "").toString().toLowerCase();
      const right = (b[pendingSortBy] ?? "").toString().toLowerCase();
      return left.localeCompare(right);
    });
    return pendingSortDirection === "asc" ? sorted : sorted.reverse();
  }, [filteredPendingInvites, pendingSortBy, pendingSortDirection]);

  const toggleAcceptedSort = (column: "name" | "email" | "role") => {
    if (acceptedSortBy === column) {
      setAcceptedSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setAcceptedSortBy(column);
    setAcceptedSortDirection("asc");
  };

  const togglePendingSort = (column: "name" | "email" | "role") => {
    if (pendingSortBy === column) {
      setPendingSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setPendingSortBy(column);
    setPendingSortDirection("asc");
  };

  const handleInvite = async ({ name, email, role }: { name: string; email: string; role: TeamRole }) => {
    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedName) {
      const msg = "Please enter a name";
      toast.error(msg);
      throw new Error(msg);
    }
    if (!normalizedEmail) {
      const msg = "Please enter an email";
      toast.error(msg);
      throw new Error(msg);
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
    if (!emailOk) {
      const msg = "Please enter a valid email";
      toast.error(msg);
      throw new Error(msg);
    }
    if (invites.some((i) => i.email === normalizedEmail)) {
      const msg = "Invite already exists for this email";
      toast.error(msg);
      throw new Error(msg);
    }

    try {
      const createdMember = await createTeamMember({
        email: normalizedEmail,
        role,
        user_name: normalizedName,
      });

      const createdData = createdMember.data;
      const createdId = Number(createdData?.id);
      const memberId = Number.isFinite(createdId) ? createdId : Date.now();
      dispatch(
        addTeamMember({
          id: memberId,
          team_id: createdData?.team_id,
          user_id: createdData?.user_id,
          role,
          status: "inactive",
          invite_status: "not_sent",
          invited_at: null,
          accepted_at: null,
          user: {
            id: memberId,
            user_name: normalizedName,
            email: normalizedEmail,
            type: "team_member",
          },
        })
      );

      await sendTeamMemberInvite(memberId);
      dispatch(updateTeamMemberInviteStatus({ id: memberId, invite_status: "sent" }));
      setResendCooldownById((prev) => ({ ...prev, [String(memberId)]: RESEND_COOLDOWN_SECONDS }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create and send invite");
      throw error;
    }

    toast.success("Invite created and sent");
  };

  const handleResendInvite = async (item: InviteItem) => {
    try {
      setResendingInviteId(item.id);
      const res = await sendTeamMemberInvite(item.id);
      toast.success(res.message || `Invite resent to ${item.email}`);
      dispatch(updateTeamMemberInviteStatus({ id: Number(item.id), invite_status: "sent" }));
      setResendCooldownById((prev) => ({ ...prev, [item.id]: RESEND_COOLDOWN_SECONDS }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to resend invite");
    } finally {
      setResendingInviteId(null);
    }
  };

  const handleRemoveInvite = async (id: string) => {
    try {
      setDeletingMemberId(id);
      const res = await deleteTeamMemberApi(id);
      dispatch(removeTeamMember(Number(id)));
      toast.success(res.message || "Pending invite removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove invite");
    } finally {
      setDeletingMemberId(null);
    }
  };

  const handleAcceptedRoleChange = async (id: string, role: TeamRole) => {
    try {
      setUpdatingRoleId(id);
      const res = await updateTeamMemberRoleApi(id, { role });
      dispatch(updateTeamMemberRoleInState({ id: Number(id), role }));
      toast.success(res.message || `Role updated to ${ROLE_LABEL[role]}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update role");
    } finally {
      setUpdatingRoleId(null);
    }
  };

  const handleRemoveAcceptedUser = async (id: string) => {
    const removedUser = acceptedUsers.find((user) => user.id === id);
    try {
      setDeletingMemberId(id);
      const res = await deleteTeamMemberApi(id);
      dispatch(removeTeamMember(Number(id)));
      if (removedUser) {
        toast.success(res.message || `${removedUser.email} removed. Access revoked.`);
      } else {
        toast.success(res.message || "Team member removed");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove team member");
    } finally {
      setDeletingMemberId(null);
    }
  };

  const openConfirmationDialog = (config: Omit<ConfirmActionDialogState, "open">) => {
    setConfirmDialog({
      ...config,
      open: true,
    });
  };

  const closeConfirmationDialog = () => {
    setConfirmDialog((prev) => ({
      ...prev,
      open: false,
      onConfirm: null,
    }));
  };

  const confirmDialogAction = () => {
    confirmDialog.onConfirm?.();
    closeConfirmationDialog();
  };

  const content = (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        icon={Users}
        title="Team Access"
        description="Invite users and assign roles: User, Creator, or Admin."
        action={<InviteMemberDialog onSubmit={handleInvite} />}
      />

      <Card className="bg-transparent border-0 rounded-none shadow-none">
        <CardHeader className="space-y-4 px-0 pt-0">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "accepted" | "pending")}>
            <TabsList className="h-10 rounded-xl bg-[#050b16] p-1">
              <TabsTrigger
                value="accepted"
                className="rounded-lg px-2 text-slate-300 data-[state=active]:text-cyan-300 data-[state=active]:bg-[#16243a]"
              >
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Accepted
                  <Badge
                    variant="secondary"
                    className="h-5 min-w-5 px-1.5 rounded-full bg-cyan-500/15 text-cyan-200 border border-cyan-400/30"
                  >
                    {acceptedCount}
                  </Badge>
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="pending"
                className="rounded-lg px-2 text-slate-300 data-[state=active]:text-cyan-300 data-[state=active]:bg-[#16243a]"
              >
                <span className="inline-flex items-center gap-2">
                  <Clock3 className="w-4 h-4" />
                  Pending
                  <Badge
                    variant="secondary"
                    className="h-5 min-w-5 px-1.5 rounded-full bg-violet-500/15 text-violet-200 border border-violet-400/30"
                  >
                    {pendingCount}
                  </Badge>
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_100px] gap-3">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or email"
              className="bg-white/[0.03] border-white/[0.08] text-white"
            />
            <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as "all" | TeamRole)}>
              <SelectTrigger className={TEAM_ROLE_SELECT_TRIGGER_CLASS}>
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent className={TEAM_ROLE_SELECT_CONTENT_COMPACT_CLASS}>
                <SelectItem value="all" compact className={TEAM_ROLE_SELECT_ITEM_CLASS}>
                  All roles
                </SelectItem>
                <SelectItem value="viewer" compact className={TEAM_ROLE_SELECT_ITEM_CLASS}>
                  User
                </SelectItem>
                <SelectItem value="editor" compact className={TEAM_ROLE_SELECT_ITEM_CLASS}>
                  Creator
                </SelectItem>
                <SelectItem value="admin" compact className={TEAM_ROLE_SELECT_ITEM_CLASS}>
                  Admin
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {isMembersLoading ? (
            <TeamTableSkeleton />
          ) : activeTab === "accepted" ? (
            <TeamTable
              hasRows={sortedAcceptedUsers.length > 0}
              emptyText="No accepted users found."
              sortBy={acceptedSortBy}
              sortDirection={acceptedSortDirection}
              onToggleSort={toggleAcceptedSort}
            >
              {sortedAcceptedUsers.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  transition={{ duration: 0.22, ease: "easeInOut" }}
                  className={`${TEAM_TABLE_GRID} rounded-lg border border-white/10 bg-white/[0.01] px-3 py-1`}
                >
                  <div className="min-w-0">
                    <p className="text-xs text-white">{item.name}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{item.email}</p>
                  </div>
                  <div className="md:flex md:justify-end">
                    {updatingRoleId === item.id ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled
                        className="h-8 w-full gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] px-2.5 text-[11px] font-medium text-white opacity-80 md:ml-auto md:w-[112px] justify-center shadow-none"
                      >
                        <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
                        <span>Updating</span>
                      </Button>
                    ) : (
                      <Select
                        value={item.role}
                        onValueChange={(v) => {
                          const nextRole = v as TeamRole;
                          if (nextRole === item.role) return;
                          openConfirmationDialog({
                            title: "Update user role?",
                            description: `This will change ${item.email} from ${ROLE_LABEL[item.role]} to ${ROLE_LABEL[nextRole]}.`,
                            confirmLabel: "Update Role",
                            onConfirm: () => handleAcceptedRoleChange(item.id, nextRole),
                          });
                        }}
                      >
                        <SelectTrigger
                          size="sm"
                          className={`${TEAM_ROLE_SELECT_TRIGGER_TABLE_CLASS} md:ml-auto`}
                        >
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent
                          align="end"
                          className={TEAM_ROLE_SELECT_CONTENT_COMPACT_CLASS}
                        >
                          <SelectItem value="viewer" compact className={TEAM_ROLE_SELECT_ITEM_CLASS}>
                            User
                          </SelectItem>
                          <SelectItem value="editor" compact className={TEAM_ROLE_SELECT_ITEM_CLASS}>
                            Creator
                          </SelectItem>
                          <SelectItem value="admin" compact className={TEAM_ROLE_SELECT_ITEM_CLASS}>
                            Admin
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="flex items-center gap-2 md:justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs border-transparent text-red-300 hover:text-red-200 hover:bg-red-500/10"
                      disabled={deletingMemberId === item.id}
                      onClick={() =>
                        openConfirmationDialog({
                          title: "Remove accepted user?",
                          description: `${item.email} will lose team access immediately.`,
                          confirmLabel: "Remove User",
                          isDestructive: true,
                          onConfirm: () => handleRemoveAcceptedUser(item.id),
                        })
                      }
                    >
                      {deletingMemberId === item.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                </motion.div>
              ))}
            </TeamTable>
          ) : (
            <TeamTable
              hasRows={sortedPendingInvites.length > 0}
              emptyText="No pending invites found."
              sortBy={pendingSortBy}
              sortDirection={pendingSortDirection}
              onToggleSort={togglePendingSort}
            >
              {sortedPendingInvites.map((item) => {
                const resendCooldown = resendCooldownById[item.id] ?? 0;
                const isResendDisabled =
                  resendingInviteId === item.id || deletingMemberId === item.id || resendCooldown > 0;
                return (
                <motion.div
                  key={item.id}
                  layout
                  transition={{ duration: 0.22, ease: "easeInOut" }}
                  className={`${TEAM_TABLE_GRID} rounded-lg border border-white/10 bg-white/[0.01] px-3 py-1`}
                >
                  <div className="min-w-0">
                    <p className="text-xs text-white">{item.name}</p>
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs text-slate-400 mt-0.5 truncate mr-2">{item.email}</span>
                    <Badge
                      variant="secondary"
                      className={`mt-1 h-5 px-2 rounded-full text-[10px] ${
                        item.inviteStatus === "sent"
                          ? "bg-emerald-500/15 text-emerald-200 border border-emerald-400/30"
                          : "bg-amber-500/15 text-amber-200 border border-amber-400/30"
                      }`}
                    >
                      {getInviteStatusLabel(item.inviteStatus)}
                    </Badge>
                  </div>
                  <div className="md:text-right">
                    <p className="text-xs text-slate-300 mt-0.5">{ROLE_LABEL[item.role]}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 min-h-8 gap-1.5 px-2.5 border-white/[0.08] bg-white/[0.02] text-slate-200 hover:text-white hover:bg-emerald-500/15 hover:border-emerald-400/25"
                      onClick={() => handleResendInvite(item)}
                      disabled={isResendDisabled}
                      aria-label={`Resend invite email to ${item.email}`}
                      title={
                        resendCooldown > 0
                          ? `Resend email in ${resendCooldown}s`
                          : "Resend invite email"
                      }
                    >
                      {resendingInviteId === item.id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
                          <span className="text-[11px] font-medium tabular-nums">Sending...</span>
                        </>
                      ) : resendCooldown > 0 ? (
                        <>
                          <Clock3 className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                          <span className="text-[11px] font-medium tabular-nums text-slate-400">
                            {resendCooldown}s
                          </span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-[11px] font-medium">Resend email</span>
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0 border-transparent text-red-300 hover:text-red-200 hover:bg-red-500/10"
                      disabled={deletingMemberId === item.id}
                      onClick={() =>
                        openConfirmationDialog({
                          title: "Remove pending invite?",
                          description: `The invite for ${item.email} will be deleted and can no longer be used.`,
                          confirmLabel: "Remove Invite",
                          isDestructive: true,
                          onConfirm: () => handleRemoveInvite(item.id),
                        })
                      }
                      aria-label={`Remove pending invite for ${item.email}`}
                      title="Remove invite"
                    >
                      {deletingMemberId === item.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                </motion.div>
                );
              })}
            </TeamTable>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && closeConfirmationDialog()}>
        <AlertDialogContent className="bg-[#0a0f1a] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300">
              {confirmDialog.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/20 text-slate-200 hover:bg-white/10 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDialogAction}
              className={
                confirmDialog.isDestructive
                  ? "bg-red-600 hover:bg-red-500 text-white"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white"
              }
            >
              {confirmDialog.confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  if (embedded) return content;

  return (
    <GlobalLayout activeSection="settings">
      <div className="p-6 lg:p-8 overflow-y-auto h-full">{content}</div>
    </GlobalLayout>
  );
}

