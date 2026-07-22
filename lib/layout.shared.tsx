import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
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
    links: [],
  };
}
