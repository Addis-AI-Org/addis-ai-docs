import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { Github, KeyRound, Linkedin } from 'lucide-react';

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
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.3"
      viewBox="4.5 2.5 15 15"
    >
      <path d="M7.6 6.3A15 15 0 0 1 12 5.6a15 15 0 0 1 4.4.7c1.45 2.05 2.34 4.38 2.55 6.85a13.8 13.8 0 0 1-3.75 2.15l-.95-1.25" />
      <path d="M16.55 13.05A9.7 9.7 0 0 1 12 14.1a9.7 9.7 0 0 1-4.55-1.05" />
      <path d="m9.75 14.05-.95 1.25a13.8 13.8 0 0 1-3.75-2.15A14.3 14.3 0 0 1 7.6 6.3" />
      <path d="M8.55 9.25h.01M15.44 9.25h.01" strokeWidth="2" />
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
      strokeWidth="1.7"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="9.5" r="5.5" />
      <path d="M9.3 8.3h.01M14.7 8.3h.01" strokeWidth="2.3" />
      <path d="M9.4 11.2c1.5 1.15 3.7 1.15 5.2 0" />
      <path d="m8.3 14.1-3.1 2.45c-1.1.86-1.25 2.25-.38 3.18.74.8 1.98.82 2.85.15L12 16.55" />
      <path d="m15.7 14.1 3.1 2.45c1.1.86 1.25 2.25.38 3.18-.74.8-1.98.82-2.85.15L12 16.55" />
    </svg>
  );
}

const communityLinks = [
  {
    type: 'icon' as const,
    text: 'Discord',
    label: 'Discord',
    url: 'https://discord.gg/8cF6d9CkTM',
    icon: <DiscordIcon />,
    external: true,
    on: 'menu' as const,
  },
  {
    type: 'icon' as const,
    text: 'LinkedIn',
    label: 'LinkedIn',
    url: 'https://www.linkedin.com/company/addisai/?',
    icon: <Linkedin aria-hidden="true" className="size-4" />,
    external: true,
    on: 'menu' as const,
  },
  {
    type: 'icon' as const,
    text: 'GitHub',
    label: 'GitHub',
    url: 'https://github.com/Addis-AI-Org',
    icon: <Github aria-hidden="true" className="size-4" />,
    external: true,
    on: 'menu' as const,
  },
  {
    type: 'icon' as const,
    text: 'Hugging Face',
    label: 'Hugging Face',
    url: 'https://huggingface.co/addisai',
    icon: <HuggingFaceIcon />,
    external: true,
    on: 'menu' as const,
  },
];

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
      url: 'https://addisassistant.com',
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
      ...communityLinks,
    ],
  };
}
