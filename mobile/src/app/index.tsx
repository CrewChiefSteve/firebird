import { Redirect } from "expo-router";
import { useMe } from "@/lib/data";
import { Loading } from "@/components/ui";

/** Crew land on the time clock; everyone else gets the public side. */
export default function Index() {
  const me = useMe();
  if (me === undefined) return <Loading text="Connecting to the shop…" />;
  return <Redirect href={me.crew ? "/clock" : "/home"} />;
}
