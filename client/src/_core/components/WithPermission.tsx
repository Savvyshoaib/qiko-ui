import { cloneElement, isValidElement, type ReactElement } from "react";
import { usePermission, type PermissionType } from "@/_core/hooks/usePermission";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

type LockableChildProps = {
  disabled?: boolean;
  title?: string;
  onClick?: (event: unknown) => void;
  "aria-disabled"?: boolean;
};

type WithPermissionProps = {
  children: ReactElement<LockableChildProps>;
  permissionType?: PermissionType | string;
  allowFor?: PermissionType[];
  lockTitle?: string;
  showLock?: boolean;
  /** When false and the user is locked out, nothing is rendered (no disabled control, no lock badge). */
  showChildren?: boolean;
  lockIndicatorTopClass?: string;
  className?: string;
};

export default function WithPermission({
  children,
  permissionType,
  allowFor = ["editor", "admin", "owner"],
  lockTitle = "You do not have permission to use this action.",
  showLock = true,
  showChildren = true,
  lockIndicatorTopClass = "top-1/2 -translate-y-1/2",
  className,
}: WithPermissionProps) {
  const { permission } = usePermission();
  const effectivePermission = permissionType ?? permission;
  const isKnownPermission =
    effectivePermission === "viewer" ||
    effectivePermission === "editor" ||
    effectivePermission === "owner" ||
    effectivePermission === "admin";
  const isLocked = !isKnownPermission || !allowFor.includes(effectivePermission);

  if (!isValidElement(children)) return null;

  if (isLocked && !showChildren) {
    return null;
  }

  const blockedClick = (event: unknown) => {
    const e = event as { preventDefault?: () => void; stopPropagation?: () => void };
    e.preventDefault?.();
    e.stopPropagation?.();
  };

  const lockedChild = cloneElement(children, {
    disabled: Boolean(children.props.disabled) || isLocked,
    title: children.props.title ?? (isLocked ? lockTitle : undefined),
    onClick: isLocked ? blockedClick : children.props.onClick,
    "aria-disabled": Boolean(children.props["aria-disabled"]) || isLocked,
  });

  if (!isLocked) {
    return lockedChild;
  }

  return (
    <div className={cn("group relative cursor-not-allowed", className)}>
      {lockedChild}
      {showLock && (
        <span
          className={`pointer-events-none absolute right-2 inline-flex items-center gap-1 rounded-md border border-slate-500/40 bg-slate-800/80 px-1.5 py-0.5 text-[10px] text-slate-100 opacity-100 transition-opacity duration-200 ${lockIndicatorTopClass}`}
          aria-hidden="true"
        >
          <Lock className="h-3 w-3" />
          Locked
        </span>
      )}
    </div>
  );
}

