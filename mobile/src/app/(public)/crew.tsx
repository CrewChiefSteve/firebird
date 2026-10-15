import { useEffect, useState } from "react";
import { Platform, Switch, View } from "react-native";
import { Redirect, router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { useClerk, useSignIn, useSignUp, useSSO } from "@clerk/expo";
import { useMe } from "@/lib/data";
import { PROJECT } from "@/lib/site";
import { F, useColors } from "@/lib/theme";
import { Body, Btn, Card, Display, Field, Label, Loading, Muted, P, Row, Screen } from "@/components/ui";

WebBrowser.maybeCompleteAuthSession();

/** Clerk returns `{ error }` instead of throwing; pull a readable line and the code out of it. */
function clerkErr(e: unknown): { code: string; text: string } {
  const x = e as { code?: string; message?: string; longMessage?: string; errors?: { code?: string; longMessage?: string; message?: string }[] };
  const first = x?.errors?.[0];
  return { code: first?.code ?? x?.code ?? "", text: first?.longMessage ?? first?.message ?? x?.longMessage ?? x?.message ?? "Something went wrong." };
}

function SignInForm() {
  const c = useColors();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const { startSSOFlow } = useSSO();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code" | "finish" | "second">("email");
  // Second check Clerk can ask for after the code (2FA, or a new device under Device Trust).
  const [second, setSecond] = useState<"email_code" | "phone_code" | "totp" | null>(null);
  const [code2, setCode2] = useState("");
  // A brand-new account can still owe the instance things beyond the email (name, password, terms).
  const [missing, setMissing] = useState<string[]>([]);
  const [extra, setExtra] = useState({ firstName: "", lastName: "", password: "", legalAccepted: false });
  const [newAccount, setNewAccount] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  // Password sign-in is for accounts that have one, chiefly the App Review account
  // (reviewers can't receive an emailed code). The crew use the code or Google.
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState("");

  // Warm the browser on Android so the Google sheet opens quickly.
  useEffect(() => {
    if (Platform.OS !== "android") return;
    WebBrowser.warmUpAsync().catch(() => {});
    return () => { WebBrowser.coolDownAsync().catch(() => {}); };
  }, []);

  async function sendCode() {
    const address = email.trim().toLowerCase();
    if (!address) return;
    setBusy(true); setErr("");
    try {
      const created = await signIn.create({ identifier: address });
      if (created.error) {
        const { code: errCode, text } = clerkErr(created.error);
        if (errCode !== "form_identifier_not_found") return setErr(text);
        // First time on this Clerk instance: sign up with the same emailed code.
        const up = await signUp.create({ emailAddress: address });
        if (up.error) return setErr(clerkErr(up.error).text);
        setNewAccount(true);
        // Picked up a sign-up that already proved this email: skip the code.
        if (!signUp.unverifiedFields.includes("email_address")) {
          if (signUp.status === "complete") { const done = await signUp.finalize(); if (done.error) setErr(clerkErr(done.error).text); return; }
          setMissing([...signUp.missingFields]);
          return setStep("finish");
        }
        const sent = await signUp.verifications.sendEmailCode();
        if (sent.error) return setErr(clerkErr(sent.error).text);
        setNewAccount(true);
      } else {
        const sent = await signIn.emailCode.sendCode();
        if (sent.error) return setErr(clerkErr(sent.error).text);
        setNewAccount(false);
      }
      setStep("code");
    } finally { setBusy(false); }
  }

  async function signInWithPassword() {
    const address = email.trim().toLowerCase();
    if (!address || !password) return setErr("Enter your email and password.");
    setBusy(true); setErr("");
    try {
      const r = await signIn.password({ identifier: address, password });
      if (r.error) return setErr(clerkErr(r.error).text);
      if (signIn.status !== "complete") return startSecondStep();
      const done = await signIn.finalize();
      if (done.error) setErr(clerkErr(done.error).text);
    } finally { setBusy(false); }
  }

  async function verify() {
    if (!code.trim()) return;
    setBusy(true); setErr("");
    try {
      const flow = newAccount ? signUp : signIn;
      const checked = newAccount
        ? await signUp.verifications.verifyEmailCode({ code: code.trim() })
        : await signIn.emailCode.verifyCode({ code: code.trim() });
      // Re-checking a sign-up whose email Clerk already verified is fine: carry on to what's left.
      if (checked.error && clerkErr(checked.error).code !== "verification_already_verified") return setErr(clerkErr(checked.error).text);
      if (newAccount && signUp.status !== "complete") {
        setMissing([...signUp.missingFields]);
        return setStep("finish");
      }
      if (!newAccount && signIn.status !== "complete") return startSecondStep();
      const done = await flow.finalize();
      if (done.error) setErr(clerkErr(done.error).text);
    } finally { setBusy(false); }
  }

  async function startSecondStep() {
    const status = signIn.status;
    if (status !== "needs_second_factor" && status !== "needs_client_trust") {
      return setErr(status === "needs_new_password" ? "This account needs a new password. Reset it on the website, then sign in here." : `Sign-in stopped at "${status.replace(/_/g, " ")}". Try the website.`);
    }
    const offered = signIn.supportedSecondFactors.map((f) => f.strategy);
    const pick = (["email_code", "phone_code", "totp"] as const).find((s) => offered.includes(s));
    if (!pick) return setErr("This account's second step isn't supported in the app yet. Sign in on the website.");
    if (pick === "email_code") { const r = await signIn.mfa.sendEmailCode(); if (r.error) return setErr(clerkErr(r.error).text); }
    if (pick === "phone_code") { const r = await signIn.mfa.sendPhoneCode(); if (r.error) return setErr(clerkErr(r.error).text); }
    setSecond(pick); setCode2(""); setStep("second");
  }

  async function verifySecond() {
    if (!code2.trim() || !second) return;
    setBusy(true); setErr("");
    try {
      const params = { code: code2.trim() };
      const r = second === "email_code" ? await signIn.mfa.verifyEmailCode(params) : second === "phone_code" ? await signIn.mfa.verifyPhoneCode(params) : await signIn.mfa.verifyTOTP(params);
      if (r.error) return setErr(clerkErr(r.error).text);
      const done = await signIn.finalize();
      if (done.error) setErr(clerkErr(done.error).text);
    } finally { setBusy(false); }
  }

  async function finishSignUp() {
    setBusy(true); setErr("");
    try {
      const names = {
        firstName: missing.includes("first_name") ? extra.firstName.trim() : undefined,
        lastName: missing.includes("last_name") ? extra.lastName.trim() : undefined,
        legalAccepted: missing.includes("legal_accepted") ? extra.legalAccepted : undefined,
      };
      const res = missing.includes("password") ? await signUp.password({ password: extra.password, ...names }) : await signUp.update(names);
      if (res.error) return setErr(clerkErr(res.error).text);
      if (signUp.status !== "complete") {
        setMissing([...signUp.missingFields]);
        return setErr("Still needs: " + signUp.missingFields.join(", ").replace(/_/g, " ") + ".");
      }
      const done = await signUp.finalize();
      if (done.error) setErr(clerkErr(done.error).text);
    } finally { setBusy(false); }
  }

  async function google() {
    setBusy(true); setErr("");
    try {
      const { createdSessionId, setActive } = await startSSOFlow({ strategy: "oauth_google", redirectUrl: AuthSession.makeRedirectUri({ path: "sso-callback" }) });
      if (createdSessionId && setActive) await setActive({ session: createdSessionId });
    } catch (e) { setErr(clerkErr(e).text); }
    finally { setBusy(false); }
  }

  return (
    <Card style={{ gap: 12 }}>
      {step === "email" ? (
        <>
          <Field label="Email" value={email} onChangeText={setEmail} placeholder="the address on the crew list" keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" onSubmitEditing={usePassword ? undefined : sendCode} returnKeyType={usePassword ? "next" : "send"} />
          {usePassword ? (
            <>
              <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" textContentType="password" onSubmitEditing={signInWithPassword} returnKeyType="go" />
              <Btn title="Sign in" kind="primary" busy={busy} onPress={signInWithPassword} />
              <Btn title="Email me a code instead" kind="quiet" small onPress={() => { setUsePassword(false); setErr(""); }} />
            </>
          ) : (
            <>
              <Btn title="Email me a code" kind="primary" busy={busy} onPress={sendCode} />
              <Btn title="Sign in with a password" kind="quiet" small onPress={() => { setUsePassword(true); setErr(""); }} />
            </>
          )}
          {/* Google on Android only. On iPhone, App Store guideline 4.8 would require Sign in with
              Apple beside it; the emailed code covers the crew there (Clerk matches the email, so a
              Google account signs in fine with a code). Add Apple first if Google is wanted on iOS. */}
          {Platform.OS === "android" && !usePassword && (
            <>
              <Muted style={{ textAlign: "center" }}>or</Muted>
              <Btn title="Continue with Google" busy={busy} onPress={google} />
            </>
          )}
        </>
      ) : step === "second" ? (
        <>
          <P>{second === "totp" ? "Enter the code from your authenticator app." : second === "phone_code" ? "One more step: we texted you a code." : "One more step: we emailed you a second code to confirm this phone."}</P>
          <Field label="Code" value={code2} onChangeText={setCode2} keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" onSubmitEditing={verifySecond} returnKeyType="done" maxLength={6} />
          <Btn title="Confirm" kind="primary" busy={busy} onPress={verifySecond} />
          <Btn title="Start over" kind="quiet" small onPress={() => { setStep("email"); setCode(""); setCode2(""); setErr(""); }} />
        </>
      ) : step === "finish" ? (
        <>
          <P>First time signing in here. A couple more things to finish your account:</P>
          {missing.includes("first_name") && <Field label="First name" value={extra.firstName} onChangeText={(v) => setExtra((x) => ({ ...x, firstName: v }))} autoComplete="given-name" />}
          {missing.includes("last_name") && <Field label="Last name" value={extra.lastName} onChangeText={(v) => setExtra((x) => ({ ...x, lastName: v }))} autoComplete="family-name" />}
          {missing.includes("password") && <Field label="Password" value={extra.password} onChangeText={(v) => setExtra((x) => ({ ...x, password: v }))} secureTextEntry autoComplete="new-password" textContentType="newPassword" />}
          {missing.includes("legal_accepted") && (
            <Row>
              <Switch value={extra.legalAccepted} onValueChange={(v) => setExtra((x) => ({ ...x, legalAccepted: v }))} />
              <P style={{ flex: 1 }}>I accept the terms of service and privacy policy</P>
            </Row>
          )}
          {missing.some((m) => !["first_name", "last_name", "password", "legal_accepted"].includes(m)) && (
            <Muted>This account also needs {missing.filter((m) => !["first_name", "last_name", "password", "legal_accepted"].includes(m)).join(", ").replace(/_/g, " ")}. Finish signing up on the website, then come back.</Muted>
          )}
          <Btn title="Finish and sign in" kind="primary" busy={busy} onPress={finishSignUp} />
        </>
      ) : (
        <>
          <P>We sent a code to <P style={{ fontFamily: F.sans7 }}>{email.trim()}</P>.</P>
          <Field label="Code" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" onSubmitEditing={verify} returnKeyType="done" maxLength={6} />
          <Btn title="Sign in" kind="primary" busy={busy} onPress={verify} />
          <Btn title="Use a different email" kind="quiet" small onPress={() => { setStep("email"); setCode(""); setErr(""); }} />
        </>
      )}
      {err ? <P style={{ color: c.crit }}>{err}</P> : null}
    </Card>
  );
}

export default function Crew() {
  const c = useColors();
  const me = useMe();
  const { signOut } = useClerk();
  if (me === undefined) return <Loading text="Checking who’s here…" />;
  if (me.crew) return <Redirect href="/clock" />;

  return (
    <Screen>
      <Label>Crew sign-in</Label>
      <Display>Trans Am <Display style={{ color: c.gold }}>Shop</Display></Display>
      {me.signedIn ? (
        <Card style={{ gap: 10 }}>
          <Body>You’re signed in as <Body style={{ fontFamily: F.serif6 }}>{me.email}</Body>, but that address isn’t on the crew list.</Body>
          <Muted>Ask Steve to add you, then sign in again.</Muted>
          <Btn title="Sign out" onPress={() => signOut()} />
          <Btn title="Your account" kind="quiet" onPress={() => router.push("/account")} />
        </Card>
      ) : (
        <View style={{ gap: 12 }}>
          <Body>Time clock, job board, parts, ledger, build log and payroll for Jennifer, Steve and Nick. Sign in with the email that’s on the crew list.</Body>
          <SignInForm />
        </View>
      )}
      <Row style={{ justifyContent: "center" }} gap={18}>
        <Btn title="Privacy" kind="quiet" small onPress={() => WebBrowser.openBrowserAsync(PROJECT.siteUrl + "/privacy")} />
        <Btn title="Support" kind="quiet" small onPress={() => WebBrowser.openBrowserAsync(PROJECT.siteUrl + "/support")} />
      </Row>
    </Screen>
  );
}
