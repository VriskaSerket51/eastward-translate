import { usePathname } from "next/navigation";
import { Link } from "@heroui/link";
import {
  Navbar as HeroUINavbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenuToggle,
  NavbarMenu,
  NavbarMenuItem,
} from "@heroui/navbar";

import { ThemeSwitch } from "@/components/theme-switch";
import { useSearchParams } from "@/hooks/use-search-params";
import { siteConfig } from "@/config/site";

export const Navbar = () => {
  const [params] = useSearchParams();
  const pathname = usePathname();
  const href = (path: string) =>
    params.has("lang")
      ? path + "?" + new URLSearchParams({ lang: params.get("lang")! })
      : path;
  return (
    <HeroUINavbar maxWidth="full" position="sticky" className="workspace-nav">
      <NavbarContent className="basis-1/5 sm:basis-full" justify="start">
        <NavbarBrand className="gap-3 max-w-fit">
          <Link
            className="flex justify-start items-center gap-1"
            color="foreground"
            href={href("/")}
          >
            <p className="brand-name">Eastward Translate</p>
          </Link>
        </NavbarBrand>
        <div className="hidden sm:flex gap-4 justify-start ml-2">
          {siteConfig.navItems.map((item) => (
            <NavbarItem key={item.href} isActive={pathname === item.href}>
              <Link
                className="nav-link"
                aria-current={pathname === item.href ? "page" : undefined}
                color="foreground"
                href={href(item.href)}
              >
                {item.label}
              </Link>
            </NavbarItem>
          ))}
        </div>
      </NavbarContent>

      <NavbarContent className="basis-1 gap-4" justify="end">
        <ThemeSwitch />
        <NavbarMenuToggle className="sm:hidden" />
      </NavbarContent>

      <NavbarMenu>
        <div className="mx-4 mt-2 flex flex-col gap-2">
          {siteConfig.navMenuItems.map((item, index) => (
            <NavbarMenuItem key={`${item}-${index}`}>
              <Link
                color="foreground"
                href={href(item.href)}
                size="lg"
                aria-current={pathname === item.href ? "page" : undefined}
              >
                {item.label}
              </Link>
            </NavbarMenuItem>
          ))}
        </div>
      </NavbarMenu>
    </HeroUINavbar>
  );
};
