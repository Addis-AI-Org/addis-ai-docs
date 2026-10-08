import type { Metadata } from 'next';
import { DocsPage, DocsTitle } from 'fumadocs-ui/page';
import { ScribeDemo } from '@/components/scribe-demo';

export const metadata: Metadata = {
  title: 'Speech-to-Text Playground',
  description: 'Transcribe Amharic live or upload audio with Addis Scribe.',
  alternates: { canonical: '/docs/playground/speech-to-text' },
};

export default function Page() {
  return (
    <DocsPage full tableOfContent={{ enabled: false }} tableOfContentPopover={{ enabled: false }} breadcrumb={{ enabled: false }} footer={{ enabled: false }}>
      <DocsTitle>Speech-to-Text Playground</DocsTitle>
      <ScribeDemo fullPage />
    </DocsPage>
  );
}
