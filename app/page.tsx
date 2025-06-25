import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { ScreenLoader } from "@/components/screen-loader";

export default async function Home() {
  const user = await getUser();
  
  // If user is signed in, redirect to dashboard
  if (user) {
    redirect('/dashboard');
  }
  
  // If user is not signed in, redirect to login
  redirect('/login');
}
