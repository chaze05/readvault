import { HomePage } from "@/components/home-page";
import { getSession } from "@/lib/session-cookies";

export default async function Page() {
  let signedIn = false;

  try {
    signedIn = Boolean(await getSession());
  } catch {
    signedIn = false;
  }

  return <HomePage signedIn={signedIn} />;
}
