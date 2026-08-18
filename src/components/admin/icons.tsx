import type { ReactNode } from "react";

/**
 * Lucide-style inline SVG icons for admin pages. Mirrors the icon conventions
 * used in the admin shell (24x24 viewBox, currentColor stroke).
 */
export function Icon({
  path,
  className,
}: {
  path: ReactNode;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {path}
    </svg>
  );
}

export function MapPinIcon({ className }: { className?: string }) {
  return (
    <Icon
      className={className}
      path={
        <>
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
          <circle cx="12" cy="10" r="3" />
        </>
      }
    />
  );
}

export function WarehouseIcon({ className }: { className?: string }) {
  return (
    <Icon
      className={className}
      path={
        <>
          <path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z" />
          <path d="M6 18h12" />
          <path d="M6 14h12" />
          <rect width="12" height="12" x="6" y="10" />
        </>
      }
    />
  );
}

export function AlertTriangleIcon({ className }: { className?: string }) {
  return (
    <Icon
      className={className}
      path={
        <>
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </>
      }
    />
  );
}

export function BanknoteIcon({ className }: { className?: string }) {
  return (
    <Icon
      className={className}
      path={
        <>
          <rect width="20" height="12" x="2" y="6" rx="2" />
          <circle cx="12" cy="12" r="2" />
          <path d="M6 12h.01M18 12h.01" />
        </>
      }
    />
  );
}

export function BoxesIcon({ className }: { className?: string }) {
  return (
    <Icon
      className={className}
      path={
        <>
          <path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z" />
          <path d="m7 16.5-4.74-2.85" />
          <path d="m7 16.5 5-3" />
          <path d="M7 16.5v5.17" />
          <path d="M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z" />
          <path d="m17 16.5-5-3" />
          <path d="m17 16.5 4.74-2.85" />
          <path d="M17 16.5v5.17" />
          <path d="M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z" />
          <path d="M12 8 7.26 5.15" />
          <path d="m12 8 4.74-2.85" />
          <path d="M12 13.5V8" />
        </>
      }
    />
  );
}

export function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <Icon
      className={className}
      path={
        <>
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </>
      }
    />
  );
}