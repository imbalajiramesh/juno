'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const HeaderNames = [
  "Dashboard",
  "Customers",
  "Team",
  "Agent",
  "Settings"
]

export function HeaderLinksDesktop() {
  const pathname = usePathname()
  return (
    <nav className="flex items-center space-x-6">
      {HeaderNames.map((name) => (
        <Link
          href={"/" + name.toLowerCase()}
          key={name.toLowerCase()}
          className={`text-sm font-medium transition-colors hover:text-primary ${
            pathname === "/" + name.toLowerCase()
              ? "text-foreground"
              : "text-muted-foreground"
          }`}
        >
          {name}
        </Link>
      ))}
    </nav>
  )
}

export function HeaderLinksMobile() {
  const pathname = usePathname()
  return (
    <nav className="flex flex-col space-y-4">
      {HeaderNames.map((name) => (
        <Link
          href={"/" + name.toLowerCase()}
          key={name.toLowerCase()}
          className={`text-sm font-medium transition-colors hover:text-primary ${
            pathname === "/" + name.toLowerCase()
              ? "text-foreground"
              : "text-muted-foreground"
          }`}
        >
          {name}
        </Link>
      ))}
    </nav>
  )
}

 