import { useMemo } from "react";
import { useAppSelector } from "@/store/hooks";

export type PermissionType = "viewer" | "editor" | "admin" | "owner";

const PERMISSION_RANK: Record<PermissionType, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
  owner: 4,
};

function normalizePermission(value: unknown): PermissionType {
  if (value == null) {
    return "owner";
  }
  if (value === "admin" || value === "owner" || value === "editor" || value === "viewer") {
    return value;
  }
  return "viewer";
}

export function usePermission() {
  // const userPermission = useAppSelector((state) => state.auth.userInfo?.team_member_role);
  const userPermission = useAppSelector((state) => state?.userContext?.data?.feature?.team?.role);

  return useMemo(() => {
    const permission = normalizePermission(userPermission);

    const hasAtLeast = (required: PermissionType) =>
      PERMISSION_RANK[permission] >= PERMISSION_RANK[required];

    const hasAny = (allowed: PermissionType[]) => {
      const allowedSet = new Set(allowed);
      return allowedSet.has(permission);
    };

    return {
      permission,
      isViewer: permission === "viewer",
      isEditor: permission === "editor",
      isAdmin: permission === "admin",
      isOwner: permission === "owner",
      hasAtLeast,
      hasAny,
    };
  }, [userPermission]);
}

