import { useEffect, useState } from "react";
import { Platform, View } from "react-native";
import { Redirect } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { useClerk, useSignIn, useSignUp, useSSO } from "@clerk/expo";
import { useMe } from "@/lib/data";
import { F, useColors } from "@/lib/theme";
import { Body, Btn, Card, Display, Field, Label, Loading, Muted, P, Screen } from "@/components/ui";

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
  const [step, setStep] = useState<"email" | "code">("email");
  const [newAccount, setNewAccount] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

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

  async function verify() {
    if (!code.trim()) return;
    setBusy(true); setErr("");
    try {
      const flow = newAccount ? signUp : signIn;
      const checked = newAccount
        ? await signUp.verifications.verifyEmailCode({ code: code.trim() })
        : await signIn.emailCode.verifyCode({ code: code.trim() });
      if (checked.error) return setErr(clerkErr(checked.error).text);
      const done = await flow.finalize();
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
          <Field label="Email" value={email} onChangeText={setEmail} placeholder="the address on the crew list" keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" onSubmitEditing={sendCode} returnKeyType="send" />
          <Btn title="Email me a code" kind="primary" busy={busy} onPress={sendCode} />
          {Platform.OS !== "web" && (
            <>
              <Muted style={{ textAlign: "center" }}>or</Muted>
              <Btn title="Continue with Google" busy={busy} onPress={google} />
            </>
          )}
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
        </Card>
      ) : (
        <View style={{ gap: 12 }}>
          <Body>Time clock, job board, parts, ledger, build log and payroll for Jennifer, Steve and Nick. Sign in with the email that’s on the crew list.</Body>
          <SignInForm />
        </View>
      )}
    </Screen>
  );
}
