import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { KeyRound } from 'lucide-react';

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
