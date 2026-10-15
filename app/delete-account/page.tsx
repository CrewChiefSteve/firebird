import type { Metadata } from "next";
import Link from "next/link";
import { PROJECT } from "@/lib/project";
import { Nav, Footer } from "../Nav";

export const metadata: Metadata = {
  title: `Delete your account · ${PROJECT.title}`,
  description: "How to delete a Project Trans Am crew account, and what is deleted.",
};

const CONTACT = "steve@crewchiefsteve.ai";

/** Public page for Google Play's account-deletion requirement. Works signed out. */
export default function DeleteAccount() {
  return (
    <>
      <Nav />
      <div className="wrap article">
        <header>
          <div className="label">Project Trans Am app and website</div>
          <h1>Delete your account</h1>
        </header>
        <div className="body">
          <p>
            Only crew members have accounts. Reading the story, the build log and the parts list never needs one.
          </p>
          <h2>In the app</h2>
          <ol>
            <li>Crew members: open <strong>More</strong> and tap <strong>Your account</strong>. Signed in but not on the crew list: open the <strong>Crew</strong> tab and tap <strong>Your account</strong>.</li>
            <li>Tap <strong>Delete my account</strong> and confirm.</li>
          </ol>
          <h2>Without the app</h2>
          <p>
            Email <a href={`mailto:${CONTACT}?subject=Delete%20my%20Project%20Trans%20Am%20account`}>{CONTACT}</a> from the
            address you sign in with and ask us to delete your account. We do it within 7 days and reply when it&rsquo;s done.
          </p>
          <h2>What is deleted</h2>
          <p>
            Your sign-in: your email address, name and profile photo, and every session on every device. It can&rsquo;t be
            undone.
          </p>
          <h2>What is kept</h2>
          <p>
            Hours, purchases and receipt photos, payments and build-log posts entered on the shop board are the
            project&rsquo;s books, used to pay the crew and account for the money spent on the car. They stay with the project.
            Ask in the same email if you want something specific removed and we will tell you what we can delete.
          </p>
          <p>
            Offered to adopt a part? That isn&rsquo;t an account, but we will delete your pledge too if you ask. See
            the <Link href="/privacy">privacy policy</Link> for everything we collect.
          </p>
        </div>
      </div>
      <Footer />
    </>
  );
}
