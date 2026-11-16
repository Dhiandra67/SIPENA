export type LoginIconName = "brand" | "mail" | "lock" | "eye" | "eyeOff" | "arrow" | "shield";

interface LoginIconProps {
  name: LoginIconName;
  className?: string;
}

function LoginIcon({ name, className }: LoginIconProps) {
  const sharedProps = {
    className,
    "aria-hidden": true as const,
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
    viewBox: "0 0 24 24",
  };

  switch (name) {
    case "brand":
      return (
        <span className={`brand-mark ${className ?? ""}`} aria-hidden="true">
          R
        </span>
      );
    case "mail":
      return (
        <svg {...sharedProps}>
          <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
          <path d="m4.5 7 7.5 6 7.5-6" />
        </svg>
      );
    case "lock":
      return (
        <svg {...sharedProps}>
          <rect x="4.5" y="10" width="15" height="11" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3" />
        </svg>
      );
    case "eye":
      return (
        <svg {...sharedProps}>
          <path d="M2.5 12s3.2-6 9.5-6 9.5 6 9.5 6-3.2 6-9.5 6-9.5-6-9.5-6Z" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      );
    case "eyeOff":
      return (
        <svg {...sharedProps}>
          <path d="m3 3 18 18M10.6 6.2A10.7 10.7 0 0 1 12 6c6.3 0 9.5 6 9.5 6a15 15 0 0 1-3.2 3.8M6.2 6.9C3.8 8.4 2.5 12 2.5 12s3.2 6 9.5 6a9.9 9.9 0 0 0 3-.5" />
          <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
        </svg>
      );
    case "arrow":
      return (
        <svg {...sharedProps}>
          <path d="M4.5 12h15m-6-6 6 6-6 6" />
        </svg>
      );
    case "shield":
      return (
        <svg {...sharedProps}>
          <path d="M12 3 19 6v5c0 4.6-2.9 8-7 10-4.1-2-7-5.4-7-10V6l7-3Z" />
          <path d="m9.5 12 1.7 1.7 3.5-3.8" />
        </svg>
      );
  }
}

export default LoginIcon;
