import { Share } from "react-native";
import { PROJECT } from "@shared/project";

export { PROJECT, SHOP_PHASES, SPRINT_PHASES, niceDate, daysUntil } from "@shared/project";

/** The website's static photos (public/photos) are served from the live site. */
export const photo = (p: string) => (/^https?:/.test(p) ? p : PROJECT.siteUrl + p);

/** Where support and privacy requests go (same address the website's /privacy page gives). */
export const SUPPORT_EMAIL = "steve@crewchiefsteve.ai";

export const postUrl = (slug: string) => `${PROJECT.siteUrl}/log/${slug}`;

export function share(url: string, title = PROJECT.title) {
  Share.share({ message: url, url, title }).catch(() => {});
}

/** Public parts that still need a sponsor (same rule as the website). */
export const isOpenPart = (p: { sponsor: string | null; pending: boolean; status: string }) =>
  !p.sponsor && !p.pending && (p.status === "need" || p.status === "hot");
