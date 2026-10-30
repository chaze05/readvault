import { HomePage } from "@/components/home-page";
import { getCurrentUser } from "@/lib/current-user";

export default async function Page() {
  let signedIn = false;

  try {
    signedIn = Boolean(await getCurrentUser());
  } catch {
    signedIn = false;
  }

  return <HomePage signedIn={signedIn} />;
}
