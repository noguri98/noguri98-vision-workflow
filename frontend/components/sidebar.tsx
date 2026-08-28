import Link from "next/link"
import { Sidebar as UISidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton } from "@/components/ui/sidebar"
import { ChevronRight, Edit, Home, Layers, Tag } from "lucide-react"
import sidebarItems from "@/config/json/sidebar.json"

// ponytail: one-level children only, add recursive renderer if deeper nesting needed
const iconMap: Record<string, React.ComponentType<any>> = { Home, Tag, Edit, Layers }

function MenuItem({ item }: { item: any }) {
  const Icon = iconMap[item.icon]
  const hasChildren = !!item.children?.length
  return (
    <SidebarMenuItem>
      <SidebarMenuButton className="text-[15px]" render={hasChildren ? <button type="button" /> : <Link href={item.href || "#"} />}>
        {Icon ? <Icon /> : null}
        <span className="flex-1">{item.label}</span>
        {hasChildren && <ChevronRight className="ml-auto h-4 w-4 opacity-60" />}
      </SidebarMenuButton>
      {hasChildren && (
        <SidebarMenuSub>
          {item.children.map((child: any) => {
            const ChildIcon = iconMap[child.icon]
            return (
              <SidebarMenuSubItem key={child.label}>
                <SidebarMenuSubButton className="text-[14px]" render={<Link href={child.href || "#"} />}>
                  {ChildIcon ? <ChildIcon /> : null}
                  {child.label}
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            )
          })}
        </SidebarMenuSub>
      )}
    </SidebarMenuItem>
  )
}

export default function Sidebar() {
  return (
    <UISidebar collapsible="icon">
      <SidebarHeader />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>메뉴</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sidebarItems.map((item: any) => (
                <MenuItem key={item.label} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />
    </UISidebar>
  )
}
