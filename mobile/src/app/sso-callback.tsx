import { Redirect } from "expo-router";

/**
 * Google sign-in comes back to firebird://sso-callback. useSSO has already finished the session
 * by the time the router sees the link, so this just sends the person on through the front door.
 */
export default function SsoCallback() {
  return <Redirect href="/" />;
}
