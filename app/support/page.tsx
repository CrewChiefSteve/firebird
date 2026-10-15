import type { Metadata } from "next";
import Link from "next/link";
import { PROJECT } from "@/lib/project";
import { Nav, Footer } from "../Nav";

export const metadata: Metadata = {
  title: `Support · ${PROJECT.title}`,
  description: "Help with the Project Trans Am app and website.",
};

const CONTACT = "steve@crewchiefsteve.ai";

export default function Support() {
  return (
    <>
      <Nav />
      <div className="wrap article">
        <header>
          <div className="label">Project Trans Am app and website</div>
          <h1>Support</h1>
        </header>
        <div className="body">
          <p>
            Something not working, a question about the build, or a part you want to help with? Email{" "}
            <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. A real person on the crew answers, usually within a day or two.
          </p>
          <h2>Common questions</h2>
          <p><strong>Do I need an account?</strong> No. The story, progress, build log and parts list are open to everyone. Only the crew signs in, from the Crew tab.</p>
          <p><strong>How does adopting a part work?</strong> Pick a part on the <Link href="/parts">Adopt a part</Link> page or tab and leave your name and email. Nothing is paid in the app. Jennifer emails you to sort out the details.</p>
          <p><strong>I&rsquo;m on the crew and can&rsquo;t sign in.</strong> Use the email address Steve added to the crew list. In the app, tap &ldquo;Email me a code&rdquo;; the code arrives in a minute or so, so check spam too.</p>
          <p><strong>How do I delete my account?</strong> See <Link href="/delete-account">Delete your account</Link>.</p>
          <p><strong>Privacy?</strong> See the <Link href="/privacy">privacy policy</Link>.</p>
        </div>
      </div>
      <Footer />
    </>
  );
}
