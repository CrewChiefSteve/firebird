import { createContext, useContext } from "react";
import type { Doc } from "@convex/_generated/dataModel";

/** The signed-in crew member, provided by app/(shop)/_layout.tsx once the gate has passed. */
export const CrewContext = createContext<Doc<"crew"> | null>(null);

export function useCrew(): Doc<"crew"> {
  const crew = useContext(CrewContext);
  if (!crew) throw new Error("useCrew outside the shop");
  return crew;
}
