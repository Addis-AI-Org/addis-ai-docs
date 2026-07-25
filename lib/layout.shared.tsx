import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { Globe2, KeyRound } from 'lucide-react';

function NpmIcon() {
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-3.5 w-5 items-center justify-center rounded-[2px] bg-[#cb3837] font-mono text-[7px] font-black leading-none tracking-tighter text-white"
    >
      npm
    </span>
  );
}

function PythonIcon() {
  return (
    <span
      aria-hidden="true"
      className="inline-flex size-4 items-center justify-center rounded bg-[#3776ab] font-mono text-[8px] font-bold leading-none text-white"
    >
      Py
    </span>
  );
}

function DiscordIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-4 text-[#5865F2]"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M20.32 4.37a19.8 19.8 0 0 0-4.89-1.52c-.21.38-.46.89-.63 1.28a18.4 18.4 0 0 0-5.49 0 13 13 0 0 0-.64-1.28A19.74 19.74 0 0 0 3.78 4.37C.69 8.95-.15 13.42.27 17.82a19.9 19.9 0 0 0 6 3.03c.48-.66.91-1.37 1.28-2.12a12.9 12.9 0 0 1-2.04-.98l.5-.39a14.2 14.2 0 0 0 12.12 0l.5.39c-.65.39-1.34.72-2.04.98.37.75.8 1.46 1.29 2.12a19.9 19.9 0 0 0 5.99-3.03c.49-5.1-.84-9.52-3.55-13.45ZM8.03 15.15c-1.18 0-2.16-1.08-2.16-2.42s.96-2.42 2.16-2.42c1.21 0 2.18 1.1 2.16 2.42 0 1.34-.96 2.42-2.16 2.42Zm7.97 0c-1.18 0-2.16-1.08-2.16-2.42s.96-2.42 2.16-2.42c1.21 0 2.18 1.1 2.16 2.42 0 1.34-.95 2.42-2.16 2.42Z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-4 text-[#0A66C2]"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45ZM22.23 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0h.01Z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-4 text-fd-foreground/80"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M12 .3a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.04c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.74.08-.73.08-.73 1.21.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18.76.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.63-5.48 5.93.42.36.81 1.1.81 2.22v3.29c0 .31.21.69.83.57A12 12 0 0 0 12 .3Z" />
    </svg>
  );
}

function HuggingFaceIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-4 text-[#FFD21E]"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M1.44 11.51c0 1.1.17 2.16.49 3.15h-.11c-.42 0-.8.16-1.07.45-.35.38-.5.84-.43 1.29.03.22.1.42.21.6-.23.19-.4.45-.48.76-.06.24-.13.75.22 1.28l-.07.1c-.2.4-.22.84-.03 1.26.28.62.97 1.11 2.31 1.64.84.33 1.6.54 1.61.54 1.1.29 2.1.43 2.97.43 1.42 0 2.47-.38 3.15-1.14 1.54.27 2.79.14 3.59.01.68.75 1.73 1.13 3.15 1.13.86 0 1.86-.14 2.97-.43l1.6-.54c1.35-.53 2.04-1.02 2.32-1.64.18-.42.17-.86-.04-1.26l-.06-.1c.35-.53.28-1.04.22-1.28a1.5 1.5 0 0 0-.49-.76c.11-.18.19-.38.22-.6.07-.45-.09-.91-.43-1.29-.27-.29-.65-.45-1.07-.45h-.06c.32-1 .49-2.05.49-3.15C22.6 5.7 17.86 1 12.02 1 6.18 1 1.44 5.7 1.44 11.51Zm10.58-9.49c5.28 0 9.55 4.25 9.55 9.49 0 .77-.09 1.52-.27 2.23l-.01-.01a1.42 1.42 0 0 0-1.11-.51c-.35 0-.71.12-1.07.35-.24.15-.51.42-.78.76a1.62 1.62 0 0 0-1.01-.65c-.08-.01-.16-.02-.24-.02-.92 0-1.48.8-1.69 1.52-.11.24-.61 1.35-1.36 2.1-1.17 1.16-1.45 2.35-.84 3.64-.85.1-1.59.09-2.37-.01.59-1.21.36-2.44-.84-3.63-.76-.75-1.26-1.86-1.36-2.1-.21-.72-.77-1.52-1.7-1.52-.07 0-.15.01-.23.02-.41.06-.76.3-1.02.65-.27-.34-.54-.61-.78-.76-.36-.23-.72-.35-1.07-.35-.43 0-.81.17-1.08.48a9.42 9.42 0 0 1-.26-2.19c0-5.24 4.28-9.49 9.55-9.49ZM8.64 7c-.48.01-.95.27-1.19.73-.35.66-.1 1.48.57 1.84.35.18.49-.53.83-.65.31-.11.84.4 1.01.08.35-.66.1-1.48-.56-1.84A1.36 1.36 0 0 0 8.64 7Zm6.84 0c-.22 0-.44.05-.65.16-.66.36-.92 1.18-.56 1.84.17.32.7-.19 1.01-.08.35.12.49.83.84.65.66-.36.91-1.18.56-1.84-.24-.46-.71-.72-1.2-.73ZM5.73 8.42a.88.88 0 1 0 0 1.76.88.88 0 0 0 0-1.76Zm12.64 0a.88.88 0 1 0 0 1.76.88.88 0 0 0 0-1.76Zm-9.58 3.04c-.18 0-.28.11-.28.42 0 .81.39 2.12 1.43 2.92.21-.71 1.35-1.28 1.51-1.2.23.12.22.44.61.73.39-.29.37-.61.61-.73.16-.08 1.3.49 1.5 1.2 1.04-.8 1.43-2.11 1.43-2.92 0-1.22-1.58.64-3.54.65-1.47-.01-2.73-1.06-3.26-1.07Z" />
    </svg>
  );
}

const communityLinks = [
  {
    label: 'Addis AI website',
    url: 'https://addisassistant.com',
    icon: <Globe2 aria-hidden="true" className="size-4 text-fd-primary" />,
  },
  {
    label: 'Discord',
    url: 'https://discord.gg/8cF6d9CkTM',
    icon: <DiscordIcon />,
  },
  {
    label: 'LinkedIn',
    url: 'https://www.linkedin.com/company/addisai/?',
    icon: <LinkedInIcon />,
  },
  {
    label: 'GitHub',
    url: 'https://github.com/Addis-AI-Org',
    icon: <GitHubIcon />,
  },
  {
    label: 'Hugging Face',
    url: 'https://huggingface.co/addisai',
    icon: <HuggingFaceIcon />,
  },
];

export function CommunityLinks() {
  return (
    <nav
      aria-label="Addis AI community links"
      className="flex items-center gap-1 pt-1"
    >
      {communityLinks.map(({ icon, label, url }) => (
        <a
          aria-label={`${label} (opens in a new tab)`}
          className="inline-flex size-8 items-center justify-center rounded-md transition-colors duration-150 hover:bg-fd-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-primary/40"
          href={url}
          key={label}
          rel="noopener noreferrer"
          target="_blank"
          title={label}
        >
          {icon}
        </a>
      ))}
    </nav>
  );
}

/**
 * Shared layout configurations
 *
 * you can customise layouts individually from:
 * Home Layout: app/(home)/layout.tsx
 * Docs Layout: app/docs/layout.tsx
 */
export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <>         
            {/* Light Mode Logo: Visible by default, hidden when .dark class is present */}
          <img 
            src="/images/Addis-Ai-Logo-Dark.png" 
            alt="Addis AI"
            className="block dark:hidden pr-20"
            height="24"
          />

          {/* Dark Mode Logo: Hidden by default, visible when .dark class is present */}
          <img 
            src="/images/addis_ai_full.png" 
            alt="Addis AI"
            className="hidden dark:block pr-20"
            height="24"
          />
        </>
      ),
    },
    links: [
      {
        type: 'custom',
        on: 'menu',
        children: (
          <p className="px-2 pb-1 pt-3 text-xs font-semibold text-fd-foreground">
            SDK resources
          </p>
        ),
      },
      {
        text: 'API keys',
        url: 'https://addisassistant.com/apikeys',
        external: true,
        on: 'menu',
        icon: <KeyRound className="size-4" />,
      },
      {
        text: 'Node.js on npm',
        url: 'https://www.npmjs.com/package/addisai',
        external: true,
        on: 'menu',
        icon: <NpmIcon />,
      },
      {
        text: 'Python on PyPI',
        url: 'https://pypi.org/project/addisai/',
        external: true,
        on: 'menu',
        icon: <PythonIcon />,
      },
    ],
  };
}
