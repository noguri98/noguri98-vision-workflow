'use client'

import React from "react"
import { usePathname } from "next/navigation"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import sidebarItems from "@/config/json/sidebar.json"

function findByHref(items: any[], href: string, parent: any[] = []): { label: string; chain: any[] } | null {
  for (const item of items) {
    const chain = [...parent, item]
    if (item.href === href) {
      return { label: item.label, chain }
    }
    if (item.children) {
      const found = findByHref(item.children, href, chain)
      if (found) return found
    }
  }
  return null
}

export default function Header() {
  const pathname = usePathname() || "/"
  const found = findByHref(sidebarItems, pathname)

  const title = found?.label ?? pathname.split("/").filter(Boolean).pop() ?? "Home"

  // Build breadcrumb with English segments
  const segments = pathname.split("/").filter(Boolean)
  const crumbs: { href: string; label: string }[] = []
  if (segments.length === 0) {
    crumbs.push({ href: "/", label: "home" })
  } else {
    // Skip home for /label pages
    const skipHome = segments[0] === "label"
    if (!skipHome) {
      crumbs.push({ href: "/", label: "home" })
    }
    let acc = ""
    for (const seg of segments) {
      acc += "/" + seg
      crumbs.push({ href: acc, label: seg })
    }
  }

  const pageLabel = crumbs[crumbs.length - 1]?.label ?? "home"

  return (
    <header className="border-b bg-background px-4 py-3">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{title}</h1>
        <Breadcrumb>
          <BreadcrumbList>
            {crumbs.map((crumb, i) => {
              const isLast = i === crumbs.length - 1
              return (
                <React.Fragment key={crumb.href}>
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage>{pageLabel}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {!isLast && <BreadcrumbSeparator />}
                </React.Fragment>
              )
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  )
}
