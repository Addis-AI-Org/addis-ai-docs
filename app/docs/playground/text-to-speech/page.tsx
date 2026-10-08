import type { Metadata } from 'next';
import { DocsPage, DocsTitle } from 'fumadocs-ui/page';
import { VoiceStreamingDemo } from '@/components/voice-streaming-demo';

export const metadata: Metadata = {
  title: 'Realtime Voice Playground',
  description: 'Try live speech generation with Addis Voices 2.',
  alternates: { canonical: '/docs/playground/realtime-voice' },
};

export default function Page() {
  return (
    <DocsPage full tableOfContent={{ enabled: false }} tableOfContentPopover={{ enabled: false }} breadcrumb={{ enabled: false }} footer={{ enabled: false }}>
      <DocsTitle>Realtime Voice Playground</DocsTitle>
      <VoiceStreamingDemo fullPage />
    </DocsPage>
  );
}
