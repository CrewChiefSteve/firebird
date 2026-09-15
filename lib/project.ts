export const PROJECT = {
  title: "Project Firebird",
  tagline: "Her first car. His birthday. A crew of three.",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://firebird.crewchiefsteve.com",
  heroPhoto: "/photos/2026-09-14/shell-on-the-dolly.jpg",
  milestones: {
    rolling: { label: "Rolling chassis", date: "2026-09-28" },
    birthday: { label: "Joe's birthday drive", date: "2027-02-14" },
  },
  people: [
    {
      name: "Joe Cobb",
      role: "The birthday boy",
      photos: ["/photos/people/joe-and-jennifer.jpg"],
      blurb: "Racer, dad, and the reason this car is going back together. He gets the keys on February 14.",
    },
    {
      name: "Jennifer, Steve & Nick",
      role: "The crew",
      photos: ["/photos/people/jennifer-jo-cobb.jpg", "/photos/people/steve-and-nick-bonneville.jpg"],
      blurb:
        "Jennifer Jo Cobb, NASCAR driver and founder of Driven2Honor, whose first car this was. Steve, who took it apart years ago. Nick, who's helping put it back. All three of them turn wrenches, and Jennifer isn't afraid to get her hands dirty.",
    },
  ],
  gallery: [
    { photo: "/photos/people/joe-and-jennifer-kleenex.jpg", caption: "Joe and Jennifer, both in firesuits, at the track." },
    { photo: "/photos/people/jennifer-pit-road.jpg", caption: "Jennifer on pit road." },
    { photo: "/photos/people/joe-and-jennifer.jpg", caption: "Joe and Jennifer under the lights." },
  ],
  thanks: [] as string[],
};

export const SHOP_PHASES = ["Rust Repair", "POR-15", "Rear End", "Front Clip", "Drivetrain", "Body & Paint", "Interior", "Other"];
export const SPRINT_PHASES = ["Rust Repair", "POR-15", "Rear End", "Front Clip"];

export function niceDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export function daysUntil(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(y, m - 1, d).getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((t - today.getTime()) / 86400000);
}
