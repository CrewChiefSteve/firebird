import { Platform } from "react-native";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import { getFunctionName, type FunctionArgs, type FunctionReference, type FunctionReturnType } from "convex/server";
import { api } from "@convex/_generated/api";

/**
 * Demo mode renders the crew screens from typed sample data (src/lib/demo.ts) with writes turned off,
 * so the shop side can be looked at without a crew sign-in. Dev builds only: add ?demo to the web URL
 * (?demo=jen to look as the payer), or set EXPO_PUBLIC_DEMO=1.
 */
const webDemo = Platform.OS === "web" && typeof location !== "undefined" ? new URLSearchParams(location.search).get("demo") : null;
export const DEMO: false | "steve" | "jen" =
  __DEV__ && (process.env.EXPO_PUBLIC_DEMO === "1" || webDemo !== null) ? (webDemo === "jen" ? "jen" : "steve") : false;

// Behind __DEV__ so release builds fold the branch away and leave the sample data out.
const demo: typeof import("./demo") | null = __DEV__ && DEMO ? require("./demo") : null;

export function useQ<Q extends FunctionReference<"query">>(ref: Q, args?: FunctionArgs<Q> | "skip"): FunctionReturnType<Q> | undefined {
  const fake = demo?.demoQuery(getFunctionName(ref), DEMO || "steve");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const real = useQuery(ref as any, fake !== undefined ? "skip" : (args ?? {})) as FunctionReturnType<Q> | undefined;
  return fake !== undefined ? (fake as FunctionReturnType<Q>) : real;
}

export function useM<M extends FunctionReference<"mutation">>(ref: M): (args: FunctionArgs<M>) => Promise<FunctionReturnType<M>> {
  const real = useMutation(ref);
  if (demo) return async () => demo.demoWrite(getFunctionName(ref)) as FunctionReturnType<M>;
  return real as unknown as (args: FunctionArgs<M>) => Promise<FunctionReturnType<M>>;
}

export function useA<A extends FunctionReference<"action">>(ref: A): (args: FunctionArgs<A>) => Promise<FunctionReturnType<A>> {
  const real = useAction(ref);
  if (demo) return async () => demo.demoWrite(getFunctionName(ref)) as FunctionReturnType<A>;
  return real as unknown as (args: FunctionArgs<A>) => Promise<FunctionReturnType<A>>;
}

/** Who's signed in, and whether they're on the crew. Undefined while Clerk and Convex settle. */
export function useMe() {
  const { isLoading } = useConvexAuth();
  return useQ(api.crew.me, isLoading && !DEMO ? "skip" : {});
}
