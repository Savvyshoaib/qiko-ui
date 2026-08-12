import { createElement, type ComponentType, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchAvatarAgents } from "@/store/slices/avatarSlice";
import { WORKER_LIMIT } from "@/constants/brand";
import { useLocation } from "wouter";

export function useWorkerAccess() {
  const dispatch = useAppDispatch();
  const agents = useAppSelector((state) => state.avatar.agents);
  const agentsLoading = useAppSelector((state) => state.avatar.loading.agents);
  const isAuthenticated = useAppSelector((state) => Boolean(state.auth.token));
  const workerLimitRaw = useAppSelector(
    (state) =>
      (state.auth.subscription as { subscription?: { worker_limit?: unknown } } | null)?.subscription
        ?.worker_limit
  );
  // const { subscribed } = useAppSelector(
  //   (state) => state?.auth?.subscription ?? { subscribed: false }
  // );
  const subscription = useAppSelector((state) => state.auth.subscription);
  const subscribed = subscription?.subscribed;

  const workerLimit =
    typeof workerLimitRaw === "number"
      ? workerLimitRaw
      : typeof workerLimitRaw === "string"
      ? Number(workerLimitRaw)
      : WORKER_LIMIT;

  const isSubscribed = subscribed === true || subscribed === "true";
  const hasReachedWorkerLimit = agents.length >= workerLimit;
  const canCreateWorker = !isSubscribed || !hasReachedWorkerLimit;

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!isSubscribed) return;
    if (agents.length > 0) return;
    dispatch(fetchAvatarAgents());
  }, [dispatch, isAuthenticated, isSubscribed, agents.length]);

  return {
    isAuthenticated,
    isSubscribed,
    hasReachedWorkerLimit,
    canCreateWorker,
    agentsLoading,
    agentsCount: agents.length,
  };
}

export function WorkerLimitGuard({
  component: Component,
  fallbackPath = "/app/pricing",
}: {
  component: ComponentType;
  fallbackPath?: string;
}) {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isSubscribed, hasReachedWorkerLimit, agentsLoading, agentsCount } =
    useWorkerAccess();

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!isSubscribed || hasReachedWorkerLimit) {
      setLocation(fallbackPath);
    }
  }, [isAuthenticated, isSubscribed, hasReachedWorkerLimit, fallbackPath, setLocation]);

  if (!isAuthenticated) return createElement(Component);
  if (!isSubscribed) return null;
  if (isSubscribed && agentsLoading && agentsCount === 0) return null;
  if (isSubscribed && hasReachedWorkerLimit) return null;

  return createElement(Component);
}
