import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { Braces, ExternalLink, KeyRound, Package } from 'lucide-react';
import Image from 'next/image';

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
          <Image
            src="/images/Addis-Ai-Logo-Dark.png"
            alt="Addis AI"
            className="block dark:hidden"
            width={110}
            height={24}
            priority
          />
          <Image
            src="/images/addis_ai_full.png"
            alt="Addis AI"
            className="hidden dark:block"
            width={148}
            height={24}
            priority
          />
        </>
      ),
    },
    links: [
      {
        type: 'menu',
        text: 'SDK resources',
        icon: <Package className="size-4" />,
        items: [
          {
            text: 'API keys',
            url: 'https://addisassistant.com/apikeys',
            external: true,
            icon: <KeyRound className="size-4" />,
          },
          {
            text: 'Node.js on npm',
            url: 'https://www.npmjs.com/package/addisai',
            external: true,
            icon: <Package className="size-4" />,
          },
          {
            text: 'Python on PyPI',
            url: 'https://pypi.org/project/addisai/',
            external: true,
            icon: <Package className="size-4" />,
          },
          {
            text: 'Node.js on GitHub',
            url: 'https://github.com/Addis-AI-Org/addisai-js',
            external: true,
            icon: <Braces className="size-4" />,
          },
          {
            text: 'Python on GitHub',
            url: 'https://github.com/Addis-AI-Org/addisai-py',
            external: true,
            icon: <ExternalLink className="size-4" />,
          },
        ],
      },
    ],
  };
}
