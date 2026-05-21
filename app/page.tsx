import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import Gallery from "./components/Gallery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <Gallery userEmail={user.email} />;
}
