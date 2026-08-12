import { getSalesIntelMock, isMockDataEnabled } from "@/data/services";
import type { SalesNotification } from "./types";

/** Sales Intelligence inbox seed — sourced from mock-data.json only. */
export const MOCK_SALES_NOTIFICATIONS: SalesNotification[] = isMockDataEnabled()
  ? getSalesIntelMock().notifications.map(
      (item) =>
        ({
          id: String(item.id),
          type: item.type as SalesNotification["type"],
          title: String(item.title ?? ""),
          body: String(item.body ?? ""),
          createdAt: String(item.createdAt ?? new Date().toISOString()),
          read: Boolean(item.read),
          meta: (item.metadata ?? item.meta) as SalesNotification["meta"],
        }) satisfies SalesNotification
    )
  : [];
