import { SignIn } from "@clerk/nextjs";
import { Nav } from "../../Nav";

export default function SignInPage() {
  return (
    <>
      <Nav shop />
      <div className="wrap" style={{ display: "grid", placeItems: "center", padding: "40px 20px" }}>
        <div style={{ display: "grid", gap: 14, justifyItems: "center" }}>
          <p className="label">Crew sign-in</p>
          <SignIn />
        </div>
      </div>
    </>
  );
}
