import '@/app/global.css';
import { RootProvider } from 'fumadocs-ui/provider/next';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import {
  DEFAULT_DOCUMENTATION_TITLE,
  DEFAULT_METADATA_DESCRIPTION,
  DOCUMENTATION_SITE_NAME,
} from '@/lib/metadata';
import { ORGANIZATION_DEFINITION, ORGANIZATION_ID, SITE_URL } from '@/lib/site';

const inter = Inter({
  subsets: ['latin'],
});

// Link previews need absolute image URLs.
const siteUrl = SITE_URL;

// Points at the company entity declared on addisai.ch and addisassistant.com,
// so the docs count toward the same "Addis AI" rather than a separate one.
const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': ORGANIZATION_ID,
  name: 'Addis AI',
  url: 'https://addisai.ch',
  description: ORGANIZATION_DEFINITION,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: DEFAULT_DOCUMENTATION_TITLE,
    template: `%s | ${DOCUMENTATION_SITE_NAME}`,
  },
  description: DEFAULT_METADATA_DESCRIPTION,
  openGraph: {
    title: DEFAULT_DOCUMENTATION_TITLE,
    description: DEFAULT_METADATA_DESCRIPTION,
    siteName: DOCUMENTATION_SITE_NAME,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: DEFAULT_DOCUMENTATION_TITLE,
    description: DEFAULT_METADATA_DESCRIPTION,
  },
};

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
