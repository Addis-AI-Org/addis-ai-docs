import type { Metadata } from 'next';
import { DocsPage, DocsTitle } from 'fumadocs-ui/page';
import { VoiceStreamingDemo } from '@/components/voice-streaming-demo';

export const metadata: Metadata = {
  title: 'Text-to-Speech Streaming Playground',
  description: 'Try streamed speech with Addis Voices 2 in Amharic, Afaan Oromo, Tigrinya, Swahili, Hausa, Sidama and Wolaytta.',
  alternates: { canonical: '/docs/playground/text-to-speech' },
  openGraph: {
    title: 'Text-to-Speech Streaming Playground | Addis AI Documentation',
    description: 'Try streamed speech with Addis Voices 2 in Amharic, Afaan Oromo, Tigrinya, Swahili, Hausa, Sidama and Wolaytta.',
    url: '/docs/playground/text-to-speech',
    siteName: 'Addis AI Documentation',
    type: 'website',
  },
};

export default function Page() {
  return (
    <DocsPage full tableOfContent={{ enabled: false }} tableOfContentPopover={{ enabled: false }} breadcrumb={{ enabled: false }} footer={{ enabled: false }}>
      <DocsTitle>Text-to-Speech Streaming Playground</DocsTitle>
      <VoiceStreamingDemo fullPage />
    </DocsPage>
  );
}
