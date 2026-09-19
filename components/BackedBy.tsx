import { sponsorsByTier } from "@/lib/sponsors";

export default function BackedBy() {
  const [sponsor] = sponsorsByTier("diamond");
  if (!sponsor) return null;

  return (
    <a
      href={sponsor.href}
      target="_blank"
      rel="noopener"
      className="inline-flex items-center gap-2.5 rounded-full border border-black/[0.07] bg-white/70 py-1.5 pl-4 pr-3.5 transition-colors duration-150 ease-out hover:bg-white dark:border-transparent dark:border-apple dark:bg-white/[0.045] dark:hover:bg-white/[0.08]"
    >
      <span className="font-runde text-[11px] font-semibold uppercase tracking-[0.12em] text-black/45 dark:text-white/45">
        Backed by
      </span>
      <span className="h-3.5 w-px bg-black/10 dark:bg-white/15" />
      <img src={sponsor.lightSrc} alt="" className="h-4 w-auto dark:hidden" />
      <img
        src={sponsor.darkSrc}
        alt=""
        className="hidden h-4 w-auto dark:block"
      />
      <span className="sr-only">{sponsor.name}</span>
    </a>
  );
}
