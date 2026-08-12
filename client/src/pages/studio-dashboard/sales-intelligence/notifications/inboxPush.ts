export const IDG_SALES_INBOX_PUSH_EVENT = "idg-sales-inbox-push";

export type IdgSalesInboxPushItem = {
  id?: string | number;
  userId?: number | string | null;
  notifyType?: string;
  type?: string;
  title?: string;
  body?: string;
  createdAt?: string | null;
  agentId?: string | null;
  metadata?: Record<string, unknown>;
};

export function pushIdgSalesInboxItems(items: IdgSalesInboxPushItem[] | undefined | null): void {
  if (typeof window === "undefined" || !Array.isArray(items) || items.length === 0) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(IDG_SALES_INBOX_PUSH_EVENT, {
      detail: { items },
    })
  );
}
