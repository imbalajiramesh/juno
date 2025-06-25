import Link from "next/link";
import UserButton from "./user-button";

export function HeaderLinksMobile() {
  return (
    <>
      <Link href="/dashboard" className="text-sm font-medium">
        Dashboard
      </Link>
      <Link href="/customers" className="text-sm font-medium">
        Customers
      </Link>
      <Link href="/leads" className="text-sm font-medium">
        Leads
      </Link>
      <Link href="/team" className="text-sm font-medium">
        Team
      </Link>
      <div className="mt-4">
        <UserButton />
      </div>
    </>
  );
} 