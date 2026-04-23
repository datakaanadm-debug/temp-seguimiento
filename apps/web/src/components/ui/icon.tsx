import type { SVGProps } from 'react'

/**
 * Line-icon set Mentorly — stroke 1.5px, 24×24 viewbox.
 * Uso: <Icon.Home /> · <Icon.Tasks size={18} />
 */

type IconProps = SVGProps<SVGSVGElement> & { size?: number; stroke?: number }

const Base = ({
  size = 16,
  stroke = 1.5,
  children,
  fill = 'none',
  ...rest
}: IconProps & { children: React.ReactNode }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke="currentColor"
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...rest}
  >
    {children}
  </svg>
)

export const Icon = {
  Home: (p: IconProps) => (
    <Base {...p}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20h14V9.5" />
      <path d="M10 20v-6h4v6" />
    </Base>
  ),
  Tasks: (p: IconProps) => (
    <Base {...p}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 9h4M7 13h6M7 17h3" />
      <path d="m15 15 2 2 3-4" />
    </Base>
  ),
  Log: (p: IconProps) => (
    <Base {...p}>
      <path d="M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4z" />
      <path d="M8 9h8M8 13h8M8 17h5" />
    </Base>
  ),
  Mentor: (p: IconProps) => (
    <Base {...p}>
      <circle cx="9" cy="9" r="3.2" />
      <path d="M3 19c.8-3 3.2-4.8 6-4.8s5.2 1.8 6 4.8" />
      <circle cx="17" cy="7" r="2.2" />
    </Base>
  ),
  Eval: (p: IconProps) => (
    <Base {...p}>
      <path d="M12 3 14.2 8.3 20 9l-4.3 4 1.2 5.9L12 16l-5 2.9 1.2-5.9L4 9l5.8-.7z" />
    </Base>
  ),
  Analytics: (p: IconProps) => (
    <Base {...p}>
      <path d="M4 20V10M10 20V4M16 20v-6M22 20H2" />
    </Base>
  ),
  Onboard: (p: IconProps) => (
    <Base {...p}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="m8 12 3 3 5-6" />
    </Base>
  ),
  People: (p: IconProps) => (
    <Base {...p}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4 20c1.2-3.8 4.3-5.6 8-5.6S18.8 16.2 20 20" />
    </Base>
  ),
  Auto: (p: IconProps) => (
    <Base {...p}>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2 2M16.4 16.4l2 2M5.6 18.4l2-2M16.4 7.6l2-2" />
      <circle cx="12" cy="12" r="3.5" />
    </Base>
  ),
  Settings: (p: IconProps) => (
    <Base {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </Base>
  ),
  Search: (p: IconProps) => (
    <Base {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </Base>
  ),
  Plus: (p: IconProps) => (
    <Base {...p}>
      <path d="M12 5v14M5 12h14" />
    </Base>
  ),
  X: (p: IconProps) => (
    <Base {...p}>
      <path d="M6 6 18 18M18 6 6 18" />
    </Base>
  ),
  Cal: (p: IconProps) => (
    <Base {...p}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </Base>
  ),
  Bell: (p: IconProps) => (
    <Base {...p}>
      <path d="M6 8a6 6 0 1 1 12 0c0 6 3 7 3 7H3s3-1 3-7" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </Base>
  ),
  Clock: (p: IconProps) => (
    <Base {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Base>
  ),
  Flag: (p: IconProps) => (
    <Base {...p}>
      <path d="M4 21V4M4 4h13l-2 4 2 4H4" />
    </Base>
  ),
  Attach: (p: IconProps) => (
    <Base {...p}>
      <path d="m21 12-8 8a5.7 5.7 0 0 1-8-8l8-8a4 4 0 0 1 6 6l-8 8a2.3 2.3 0 0 1-3-3l7-7" />
    </Base>
  ),
  Chev: (p: IconProps) => (
    <Base {...p}>
      <path d="m9 6 6 6-6 6" />
    </Base>
  ),
  ChevDown: (p: IconProps) => (
    <Base {...p}>
      <path d="m6 9 6 6 6-6" />
    </Base>
  ),
  Sparkles: (p: IconProps) => (
    <Base {...p}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <path d="m5 5 3 3M16 16l3 3M5 19l3-3M16 8l3-3" />
    </Base>
  ),
  AlertTriangle: (p: IconProps) => (
    <Base {...p}>
      <path d="M12 4 2 20h20z" />
      <path d="M12 10v4M12 18v.01" />
    </Base>
  ),
  Check: (p: IconProps) => (
    <Base {...p}>
      <path d="m5 12 5 5L20 7" />
    </Base>
  ),
  Panel: (p: IconProps) => (
    <Base {...p}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
    </Base>
  ),
  Menu: (p: IconProps) => (
    <Base {...p}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </Base>
  ),
  LogOut: (p: IconProps) => (
    <Base {...p}>
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="m10 17 5-5-5-5M15 12H3" />
    </Base>
  ),
  Filter: (p: IconProps) => (
    <Base {...p}>
      <path d="M3 5h18l-7 9v5l-4 1v-6z" />
    </Base>
  ),
  Download: (p: IconProps) => (
    <Base {...p}>
      <path d="M12 3v12M7 10l5 5 5-5M4 21h16" />
    </Base>
  ),
}

export type IconName = keyof typeof Icon
