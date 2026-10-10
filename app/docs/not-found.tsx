import Link from 'next/link';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/page';

const destinations = [
  { href: '/docs/get-started/introduction', label: 'Introduction' },
  { href: '/docs/get-started/quickstart', label: 'Quick Start' },
  { href: '/docs/capabilities/text-generation', label: 'Text Generation' },
  { href: '/docs/capabilities/text-to-speech', label: 'Text-to-Speech' },
  { href: '/docs/capabilities/speech-to-text', label: 'Speech-to-Text' },
  { href: '/docs/platform/errors', label: 'Errors' },
];

export default function NotFound() {
  return (
    <DocsPage>
      <DocsTitle>Page not found</DocsTitle>
      <DocsDescription>This page moved or never existed. Search the docs with ⌘K, or start from one of these pages.</DocsDescription>
      <DocsBody>
        <ul>
          {destinations.map((destination) => (
            <li key={destination.href}>
              <Link href={destination.href}>{destination.label}</Link>
            </li>
          ))}
        </ul>
      </DocsBody>
    </DocsPage>
  );
}
