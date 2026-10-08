import '@/app/global.css';
import { RootProvider } from 'fumadocs-ui/provider/next';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import {
  DEFAULT_DOCUMENTATION_TITLE,
  DEFAULT_METADATA_DESCRIPTION,
  DOCUMENTATION_SITE_NAME,
} from '@/lib/metadata';

const inter = Inter({
  subsets: ['latin'],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

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
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
