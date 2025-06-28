'use client'

import Link from "next/link";
import Image from "next/image";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { HeaderLinksDesktop, HeaderLinksMobile } from "./header-links";
import UserButton from "./user-button";
import OrganizationStatusBanner from "./organization-status-banner";

export default function HeaderComponent() {
  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background">
        <div className="container flex h-16 items-center">
          <Link href="/dashboard" className="mr-6 flex items-center space-x-2">
            <Image 
              src="/logo.png" 
              alt="Juno Logo" 
              width={480} 
              height={480} 
              className="w-32 h-auto -mt-8 -mb-8"
              priority
            />
          </Link>
          <div className="hidden md:flex md:flex-1">
            <HeaderLinksDesktop />
          </div>
          <div className="flex flex-1 items-center justify-end space-x-4">
            <UserButton />
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="ml-2 shrink-0 md:hidden"
                >
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <div className="grid gap-6 py-6">
                  <Link
                    href="/dashboard"
                    className="flex items-center space-x-2"
                  >
                    <Image 
                      src="/logo.png" 
                      alt="Juno Logo" 
                      width={32} 
                      height={32} 
                      className="h-8 w-8"
                    />
                  </Link>
                  <HeaderLinksMobile />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      <OrganizationStatusBanner />
    </>
  );
}

