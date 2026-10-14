import { Navbar } from "@/components/navbar";

export default function DefaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex min-h-0 w-full flex-1 flex-col px-3 py-4 sm:px-6">
        {children}
      </main>
    </div>
  );
}
