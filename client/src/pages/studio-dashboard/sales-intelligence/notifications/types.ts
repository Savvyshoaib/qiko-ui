export type SalesNotificationType =
  | "review_required"
  | "sf_sync_success"
  | "sf_sync_failed"
  | "scan_success"
  | "scan_failed"
  | "deadline_reminder";

export type SalesNotification = {
  id: string;
  type: SalesNotificationType;
  notifyType?: "idg_sales" | "others";
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  meta?: {
    opportunityTitle?: string;
    dueInDays?: number;
    sourceKey?: string;
    found?: number;
    created?: number;
    updated?: number;
  };
};

export type NotificationFilter = "all" | "unread" | "read";
