export const siteConfig = {
  name: "Eastward Translate",
  description: "Eastward translation editor",
  navItems: [
    { label: "Editor", href: "/" },
    { label: "History", href: "/history" },
    { label: "Profile", href: "/profile" },
    { label: "Progress", href: "/remain" },
  ],
  get navMenuItems() {
    return this.navItems;
  },
};
export type SiteConfig = typeof siteConfig;
