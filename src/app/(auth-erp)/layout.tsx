import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s — Yemanuel",
    default: "Yemanuel",
  },
};

export default function AuthErpLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-erp-navy text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(1100px_520px_at_50%_-18%,rgb(18_48_74/0.85),transparent_70%),radial-gradient(760px_360px_at_88%_108%,rgb(244_180_0/0.07),transparent_60%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgb(255_255_255/0.028)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.028)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(680px_420px_at_50%_34%,black,transparent_78%)]"
      />

      <main className="relative flex flex-1 items-center justify-center px-4 py-12 sm:px-6 sm:py-16">
        {children}
      </main>

      <footer className="relative flex flex-col items-center gap-1 pb-7">
        <p className="text-[11px] font-medium tracking-[0.24em] text-white/45">
          YEMANUEL <span className="text-erp-gold">ERP</span>
        </p>
        <p className="text-[10px] tracking-wide text-white/30">
          Secure management workspace
        </p>
      </footer>
    </div>
  );
}