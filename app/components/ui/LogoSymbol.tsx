/**
 * SVG hourglass logo symbol — no external image dependency.
 */
export function LogoSymbol({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="logo__symbol"
    >
      {/* Hourglass outline */}
      <path
        d="M4 2h12M4 18h12M5 2v2l5 6-5 6v2M15 2v2l-5 6 5 6v2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Sand flowing */}
      <path
        d="M8 5.5h4M8.5 14h3"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}
