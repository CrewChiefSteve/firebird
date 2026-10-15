import { useSyncExternalStore } from "react";
import { Platform } from "react-native";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import { getFunctionName, type FunctionArgs, type FunctionReference, type FunctionReturnType } from "convex/server";
import { api } from "@convex/_generated/api";
import { demoQuery, demoWrite } from "./demo";

/**
 * Demo mode renders the crew screens from typed sample data (src/lib/demo.ts) with writes turned off,
 * so the shop side can be looked at without real crew data. Two ways in:
 * - Dev builds: add ?demo to the web URL (?demo=jen to look as the payer), or set EXPO_PUBLIC_DEMO=1.
 * - Release builds: signing in as the App Review account (REVIEW_EMAIL). Apple and Google review the
 *   crew tools with sample data instead of the crew's real hours, wages and receipts, and can't change them.
 */
const webDemo = Platform.OS === "web" && typeof location !== "undefined" ? new URLSearchParams(location.search).get("demo") : null;
const devDemo: false | "steve" | "jen" =
  __DEV__ && (process.env.EXPO_PUBLIC_DEMO === "1" || webDemo !== null) ? (webDemo === "jen" ? "jen" : "steve") : false;

/** The store-review sign-in. Set per build in eas.json; see docs/STORE_LAUNCH.md for creating it. */
export const REVIEW_EMAIL = (process.env.EXPO_PUBLIC_REVIEW_EMAIL ?? "").trim().toLowerCase();

let reviewDemo = false;
const listeners = new Set<() => void>();
/** Called from the root layout whenever the signed-in email changes. */
export function setReviewDemo(on: boolean) {
  if (on === reviewDemo) return;
  reviewDemo = on;
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

/** "steve" or "jen" while the screens show sample data, false otherwise. */
export function useDemo(): false | "steve" | "jen" {
  const review = useSyncExternalStore(subscribe, () => reviewDemo, () => reviewDemo);
  return devDemo || (review ? "jen" : false);
}

export function useQ<Q extends FunctionReference<"query">>(ref: Q, args?: FunctionArgs<Q> | "skip"): FunctionReturnType<Q> | undefined {
  const as = useDemo();
  const fake = as ? demoQuery(getFunctionName(ref), as) : undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const real = useQuery(ref as any, fake !== undefined ? "skip" : (args ?? {})) as FunctionReturnType<Q> | undefined;
  return fake !== undefined ? (fake as FunctionReturnType<Q>) : real;
}

export function useM<M extends FunctionReference<"mutation">>(ref: M): (args: FunctionArgs<M>) => Promise<FunctionReturnType<M>> {
  const real = useMutation(ref);
  if (useDemo()) return async () => demoWrite(getFunctionName(ref)) as FunctionReturnType<M>;
  return real as unknown as (args: FunctionArgs<M>) => Promise<FunctionReturnType<M>>;
}

export function useA<A extends FunctionReference<"action">>(ref: A): (args: FunctionArgs<A>) => Promise<FunctionReturnType<A>> {
  const real = useAction(ref);
  if (useDemo()) return async () => demoWrite(getFunctionName(ref)) as FunctionReturnType<A>;
  return real as unknown as (args: FunctionArgs<A>) => Promise<FunctionReturnType<A>>;
}

/** Who's signed in, and whether they're on the crew. Undefined while Clerk and Convex settle. */
export function useMe() {
  const { isLoading } = useConvexAuth();
  const demo = useDemo();
  return useQ(api.crew.me, isLoading && !demo ? "skip" : {});
}
