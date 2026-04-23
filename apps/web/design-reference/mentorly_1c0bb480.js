// Minimal line-icon set, stroke-based, 1.5px — in-palette with warm paper.
const Icon = ({ d, size = 16, stroke = 1.5, fill = "none", style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={style}>
    {typeof d === "string" ? <path d={d} /> : d}
  </svg>
);

const I = {
  Home:       (p) => <Icon {...p} d={<><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-6h4v6"/></>} />,
  Tasks:      (p) => <Icon {...p} d={<><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h4M7 13h6M7 17h3"/><path d="m15 15 2 2 3-4"/></>} />,
  Log:        (p) => <Icon {...p} d={<><path d="M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4z"/><path d="M8 9h8M8 13h8M8 17h5"/></>} />,
  Mentor:     (p) => <Icon {...p} d={<><circle cx="9" cy="9" r="3.2"/><path d="M3 19c.8-3 3.2-4.8 6-4.8s5.2 1.8 6 4.8"/><circle cx="17" cy="7" r="2.2"/></>} />,
  Eval:       (p) => <Icon {...p} d={<><path d="M12 3 14.2 8.3 20 9l-4.3 4 1.2 5.9L12 16l-5 2.9 1.2-5.9L4 9l5.8-.7z"/></>} />,
  Analytics:  (p) => <Icon {...p} d={<><path d="M4 20V10M10 20V4M16 20v-6M22 20H2"/></>} />,
  Onboard:    (p) => <Icon {...p} d={<><rect x="4" y="4" width="16" height="16" rx="2"/><path d="m8 12 3 3 5-6"/></>} />,
  People:     (p) => <Icon {...p} d={<><circle cx="12" cy="8" r="3.5"/><path d="M4 20c1.2-3.8 4.3-5.6 8-5.6S18.8 16.2 20 20"/></>} />,
  Auto:       (p) => <Icon {...p} d={<><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2 2M16.4 16.4l2 2M5.6 18.4l2-2M16.4 7.6l2-2"/><circle cx="12" cy="12" r="3.5"/></>} />,
  Settings:   (p) => <Icon {...p} d={<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></>} />,
  Search:     (p) => <Icon {...p} d={<><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>} />,
  Plus:       (p) => <Icon {...p} d="M12 5v14M5 12h14" />,
  Bell:       (p) => <Icon {...p} d={<><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/></>} />,
  Filter:     (p) => <Icon {...p} d="M3 5h18l-7 8v6l-4 2v-8z" />,
  Sort:       (p) => <Icon {...p} d="M7 4v16M7 20l-3-3M7 4l-3 3M17 20V4M17 4l3 3M17 20l3-3" />,
  Cal:        (p) => <Icon {...p} d={<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></>} />,
  Clock:      (p) => <Icon {...p} d={<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>} />,
  Check:      (p) => <Icon {...p} d="m5 12 5 5L20 7" />,
  X:          (p) => <Icon {...p} d="M6 6l12 12M18 6 6 18" />,
  Chevron:    (p) => <Icon {...p} d="m9 6 6 6-6 6" />,
  ChevronDn:  (p) => <Icon {...p} d="m6 9 6 6 6-6" />,
  More:       (p) => <Icon {...p} d={<><circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/></>} fill="currentColor" stroke="none" />,
  Dot:        (p) => <Icon {...p} d={<circle cx="12" cy="12" r="3" />} fill="currentColor" stroke="none" />,
  Flag:       (p) => <Icon {...p} d="M4 21V4h10l-1.5 3L14 10H4" />,
  Attach:     (p) => <Icon {...p} d="M21 10.5 12.5 19a5 5 0 1 1-7-7L14 3.5a3.5 3.5 0 0 1 5 5L10.5 17a2 2 0 1 1-3-3L15 6.5" />,
  Msg:        (p) => <Icon {...p} d="M4 5h16v11H8l-4 4z" />,
  Sparkles:   (p) => <Icon {...p} d={<><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/><path d="m6 6 2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/></>} />,
  ArrowUp:    (p) => <Icon {...p} d="M12 19V5M5 12l7-7 7 7" />,
  ArrowDn:    (p) => <Icon {...p} d="M12 5v14M5 12l7 7 7-7" />,
  Logo:       (p) => <Icon {...p} d={<><path d="M4 20V6l8 5 8-5v14"/><circle cx="12" cy="11" r="1.6" fill="currentColor" stroke="none"/></>} />,
  Cmd:        (p) => <Icon {...p} d="M9 3a3 3 0 1 1 0 6H9v6a3 3 0 1 1-3-3h12a3 3 0 1 1-3 3V9a3 3 0 1 1-3-3z" />,
  Timer:      (p) => <Icon {...p} d={<><circle cx="12" cy="13" r="7"/><path d="M12 9v4l2 2M9 3h6M12 6v0"/></>} />,
  Trend:      (p) => <Icon {...p} d="M3 17l6-6 4 4 8-8M15 7h5v5" />,
};

window.I = I;
