// Material-style icon set, sized 20×20 by default.
// Uses `currentColor` so they tint with the parent text color.

type IconProps = { size?: number; className?: string };

const base = (size: number = 20) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "currentColor",
  "aria-hidden": true,
});

export const HomeIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3l9-8z" />
  </svg>
);

export const TrashIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M9 3h6l1 2h4v2H4V5h4l1-2zm-3 6h12l-1 12H7L6 9zm3 2v8h2v-8H9zm4 0v8h2v-8h-2z" />
  </svg>
);

export const FolderIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M10 4l2 2h8a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2h6z" />
  </svg>
);

export const ImageIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2zM8.9 13.98l2.1 2.53 3.1-3.99L19 18H5l3.9-4.02z" />
  </svg>
);

export const SearchIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 10-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5zM10 14a4 4 0 110-8 4 4 0 010 8z" />
  </svg>
);

export const TuneIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M3 17v2h6v-2H3zm0-7v2h10v-2H3zm0-7v2h14V3H3zm14 18v-4h4v-2h-4v-4h-2v10h2zm-4-10v-2H3v2h10z" />
  </svg>
);

export const HelpIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26A2 2 0 0014 9c0-1.1-.9-2-2-2s-2 .9-2 2H8a4 4 0 118 0c0 .88-.36 1.68-.93 2.25z" />
  </svg>
);

export const SettingsIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96a7.03 7.03 0 00-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96a.488.488 0 00-.59.22L2.15 8.87a.49.49 0 00.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L2.27 14.5a.49.49 0 00-.12.61l1.92 3.32c.13.22.39.31.62.22l2.39-.96c.5.39 1.03.71 1.62.94l.36 2.54c.04.24.23.41.47.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.49 0 .62-.22l1.92-3.32c.12-.22.07-.49-.12-.61l-2.03-1.58zM12 15.6A3.6 3.6 0 1112 8.4a3.6 3.6 0 010 7.2z" />
  </svg>
);

export const AppsIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z" />
  </svg>
);

export const PlusIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
  </svg>
);

export const ChevronDownIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
  </svg>
);

export const ChevronRightIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M10 17l5-5-5-5v10z" />
  </svg>
);

export const MenuIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
  </svg>
);

export const RefreshIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M17.65 6.35A7.96 7.96 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A6 6 0 0112 18a6 6 0 110-12c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
  </svg>
);

export const RenameIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
  </svg>
);

export const OpenInNewIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M19 19H5V5h7V3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" />
  </svg>
);

export const LinkIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M3.9 12a3.1 3.1 0 013.1-3.1h4V7H7a5 5 0 100 10h4v-1.9H7A3.1 3.1 0 013.9 12zM8 13h8v-2H8v2zm9-6h-4v1.9h4a3.1 3.1 0 010 6.2h-4V17h4a5 5 0 000-10z" />
  </svg>
);

export const PublicIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm-1 17.93A8.01 8.01 0 014.07 13H7v1a2 2 0 002 2v3.93zm6.9-2.54A1.99 1.99 0 0016 16h-1v-3a1 1 0 00-1-1H8v-2h2a1 1 0 001-1V7h2a2 2 0 002-2v-.41A8 8 0 0117.9 17.39z" />
  </svg>
);

export const PrivateIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V10a2 2 0 00-2-2zm-6 9a2 2 0 110-4 2 2 0 010 4zm3.1-9H8.9V6a3.1 3.1 0 016.2 0v2z" />
  </svg>
);

export const InfoIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
  </svg>
);

export const MoveIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M20 6h-8l-2-2H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2zm-9 11.5l-3.5-3.5 1.41-1.41L10 14.67V11h2v3.67l1.09-1.08 1.41 1.41L11 17.5z" />
  </svg>
);

export const RestoreIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M13 3a9 9 0 00-9 9H1l3.89 3.89.07.14L9 12H6a7 7 0 117 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.96 8.96 0 0013 21a9 9 0 000-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" />
  </svg>
);

export const SortIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M3 18h6v-2H3v2zm0-5h12v-2H3v2zm0-7v2h18V6H3z" />
  </svg>
);

export const GridIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M4 11h7V4H4v7zm0 9h7v-7H4v7zm9 0h7v-7h-7v7zm0-16v7h7V4h-7z" />
  </svg>
);

export const ListIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
  </svg>
);

export const SunIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.79 1.42-1.41zM4 10.5H1v2h3v-2zm9-9.95h-2V3.5h2V.55zm7.45 3.91l-1.41-1.41-1.79 1.79 1.41 1.41 1.79-1.79zm-3.21 13.7l1.79 1.8 1.41-1.41-1.8-1.79-1.4 1.4zM20 10.5v2h3v-2h-3zm-8-5a6 6 0 100 12 6 6 0 000-12zm-1 17.45h2V19.5h-2v2.95zm-7.45-3.91l1.41 1.41 1.79-1.8-1.41-1.41-1.79 1.8z" />
  </svg>
);

export const MoonIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36A5.4 5.4 0 0112 3z" />
  </svg>
);
