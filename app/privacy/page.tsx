import type { Metadata } from "next";
import Link from "next/link";
import { PROJECT } from "@/lib/project";
import { Nav, Footer } from "../Nav";

export const metadata: Metadata = {
  title: `Privacy · ${PROJECT.title}`,
  description: "What the Project Trans Am website and app collect, why, who handles it, and how to have it deleted.",
};

const CONTACT = "steve@crewchiefsteve.ai";

export default function Privacy() {
  return (
    <>
      <Nav />
      <div className="wrap article">
        <header>
          <div className="label">Effective October 15, 2026</div>
          <h1>Privacy</h1>
        </header>
        <div className="body">
          <p>
            This covers the Project Trans Am website (firebird.crewchiefsteve.com) and the Project Trans Am app for iPhone and
            Android. Both are run by CrewChiefSteve Technologies, Inc. for a family car restoration. We collect as little as
            the project needs, we never sell it, and there is no advertising or tracking.
          </p>

          <h2>If you just read along</h2>
          <p>
            Reading the story, the build log, or the parts list needs no account and collects nothing about you. The app
            has no analytics and no ad SDKs. Our hosting providers keep ordinary server logs (IP address, time, page
            requested) for security and to keep the service running, for their usual short retention period.
          </p>

          <h2>If you offer to adopt a part</h2>
          <p>
            The Adopt-a-part form asks for your name and email, and optionally a company name, how you want to be credited,
            and a note for Joe. We store it with the part you picked and email it to Jennifer so she can reply and sort out
            the details. No payment is taken in the app or on the website. If you choose to be credited, the name or
            company you picked appears on the public site next to the part; your email never does. We keep pledges for the
            life of the project. Ask us and we will delete yours.
          </p>

          <h2>If you are on the crew</h2>
          <p>
            The Crew tab is for the people doing the restoration. Signing in uses your email address (and your name and
            photo if you sign in with Google). The app keeps your sign-in in the phone&rsquo;s secure storage. While you use the shop board we store what you enter there: time-clock hours,
            jobs and tasks, parts, purchases and receipt photos, build-log posts and photos, and payment records. Receipt
            photos you choose to have read are sent to OpenAI to pull out the vendor, date and amount; OpenAI does not use
            API data to train its models. Photos and PDFs come from your camera, photo library or files only when you pick one.
          </p>
          <p>
            You can delete your account in the app (More → Your account → Delete my account) or
            on the <Link href="/delete-account">delete-account page</Link>. That removes your sign-in. The hours, receipts,
            posts and payments you entered are the project&rsquo;s books, used to pay the crew and account for every dollar
            spent, so they stay with the project unless you ask us to remove something specific.
          </p>

          <h2>Who handles the data</h2>
          <ul>
            <li><strong>Convex</strong> stores the project&rsquo;s data and uploaded photos.</li>
            <li><strong>Clerk</strong> handles crew sign-in.</li>
            <li><strong>Vercel</strong> hosts the website.</li>
            <li><strong>Resend</strong> delivers the pledge emails to Jennifer.</li>
            <li><strong>OpenAI</strong> reads receipt photos for the crew, when asked to.</li>
          </ul>
          <p>
            Each is a service provider working for us under its own privacy and security terms. Data is stored in the
            United States and encrypted in transit.
          </p>

          <h2>Children</h2>
          <p>The website and app are not directed to children under 13, and we do not knowingly collect their information.</p>

          <h2>Your choices</h2>
          <p>
            Email <a href={`mailto:${CONTACT}`}>{CONTACT}</a> to see, correct or delete anything we hold about you. We answer
            within 30 days. If this policy changes we will update the date at the top.
          </p>
        </div>
      </div>
      <Footer />
    </>
  );
}
