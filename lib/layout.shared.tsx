import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { Github, Globe2, KeyRound, Linkedin } from 'lucide-react';

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
      className="size-4"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M20.32 4.37a19.8 19.8 0 0 0-4.89-1.52c-.21.38-.46.89-.63 1.28a18.4 18.4 0 0 0-5.49 0 13 13 0 0 0-.64-1.28A19.74 19.74 0 0 0 3.78 4.37C.69 8.95-.15 13.42.27 17.82a19.9 19.9 0 0 0 6 3.03c.48-.66.91-1.37 1.28-2.12a12.9 12.9 0 0 1-2.04-.98l.5-.39a14.2 14.2 0 0 0 12.12 0l.5.39c-.65.39-1.34.72-2.04.98.37.75.8 1.46 1.29 2.12a19.9 19.9 0 0 0 5.99-3.03c.49-5.1-.84-9.52-3.55-13.45ZM8.03 15.15c-1.18 0-2.16-1.08-2.16-2.42s.96-2.42 2.16-2.42c1.21 0 2.18 1.1 2.16 2.42 0 1.34-.96 2.42-2.16 2.42Zm7.97 0c-1.18 0-2.16-1.08-2.16-2.42s.96-2.42 2.16-2.42c1.21 0 2.18 1.1 2.16 2.42 0 1.34-.95 2.42-2.16 2.42Z" />
    </svg>
  );
}

function HuggingFaceIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="10.5" r="5.5" />
      <path d="M9.5 9h.01M14.5 9h.01M9.5 12.5c1.5 1.2 3.5 1.2 5 0M6.7 14.4l-3.2 2.8c-.8.7-.9 1.9-.2 2.7.7.8 1.9.9 2.7.2l3.2-2.7M17.3 14.4l3.2 2.8c.8.7.9 1.9.2 2.7-.7.8-1.9.9-2.7.2l-3.2-2.7" />
    </svg>
  );
}

const communityLinks = [
  {
    label: 'Addis AI website',
    url: 'https://addisassistant.com',
    icon: <Globe2 aria-hidden="true" className="size-4" />,
  },
  {
    label: 'Discord',
    url: 'https://discord.gg/8cF6d9CkTM',
    icon: <DiscordIcon />,
  },
  {
    label: 'LinkedIn',
    url: 'https://www.linkedin.com/company/addisai/?',
    icon: <Linkedin aria-hidden="true" className="size-4" />,
  },
  {
    label: 'GitHub',
    url: 'https://github.com/Addis-AI-Org',
    icon: <Github aria-hidden="true" className="size-4" />,
  },
  {
    label: 'Hugging Face',
    url: 'https://huggingface.co/addisai',
    icon: <HuggingFaceIcon />,
  },
];

function CommunityLinks() {
  return (
    <nav
      aria-label="Addis AI community links"
      className="mx-2 mt-2 flex items-center gap-0.5 border-t border-fd-border pt-2.5"
    >
      {communityLinks.map(({ icon, label, url }) => (
        <a
          aria-label={`${label} (opens in a new tab)`}
          className="inline-flex size-8 items-center justify-center rounded-md text-fd-muted-foreground/70 transition-colors duration-150 hover:bg-fd-accent/50 hover:text-fd-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-fd-background"
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
      {
        type: 'custom',
        on: 'menu',
        children: <CommunityLinks />,
      },
    ],
  };
}
