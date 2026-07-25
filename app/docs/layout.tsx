import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions, CommunityLinks } from '@/lib/layout.shared';
import { source } from '@/lib/source';

export default function Layout({ children }: LayoutProps<'/docs'>) {
  return (
    <DocsLayout
      tree={source.pageTree}
      sidebar={{ footer: <CommunityLinks /> }}
      {...baseOptions()}
    >
      {children}
    </DocsLayout>
  );
}
