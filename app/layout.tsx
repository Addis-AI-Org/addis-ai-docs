import '@/app/global.css';
import { RootProvider } from 'fumadocs-ui/provider/next';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://docs.addisassistant.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Addis AI documentation',
    template: '%s | Addis AI documentation',
  },
  description: 'Build chat, voice, speech, translation, and multimodal applications with the official Addis AI SDKs.',
  applicationName: 'Addis AI documentation',
  openGraph: {
    type: 'website',
    siteName: 'Addis AI documentation',
    title: 'Addis AI documentation',
    description: 'SDK-first documentation for the Addis AI platform.',
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
