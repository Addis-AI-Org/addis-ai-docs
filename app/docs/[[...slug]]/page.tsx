import { getPageImage, source } from "@/lib/source";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/page";
import { notFound, redirect  } from "next/navigation";
import { getMDXComponents } from "@/mdx-components";
import type { Metadata } from "next";
import { createRelativeLink } from "fumadocs-ui/mdx";
import { NewBadge } from "@/components/docs";
import { PageActions } from "@/components/page-actions";
import {
  DEFAULT_METADATA_DESCRIPTION,
  DOCUMENTATION_SITE_NAME,
  formatDocumentationTitle,
} from "@/lib/metadata";

const introductionUrl = "/docs/get-started/introduction";

export default async function Page(props: PageProps<"/docs/[[...slug]]">) {
  const params = await props.params;
    // 2. ADD THIS BLOCK:
  // If the user visits "/docs" (no slug), send them to Introduction
  if (!params.slug) {
    redirect(introductionUrl);
  }
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;

  return (
    <DocsPage
      toc={page.data.toc}
      tableOfContent={{
        style: "clerk",
        single: false,
      }}
      full={page.data.full}
      lastUpdate={page.data.lastModified}
      editOnGithub={{
        owner: "Addis-AI-Org",
        repo: "addis-ai-docs",
        sha: "main",
        path: `content/docs/${page.path}`,
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <DocsTitle>{page.data.title}</DocsTitle>
        {page.data.isNew ? <NewBadge /> : null}
      </div>
      <DocsDescription>{page.data.description}</DocsDescription>
      <PageActions markdownUrl={`${page.url}.mdx`} />
      <DocsBody>
        <MDX
          components={getMDXComponents({
            // this allows you to link to other pages with relative file paths
            a: createRelativeLink(source, page),
          })}
        />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(
  props: PageProps<"/docs/[[...slug]]">
): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();
  const image = getPageImage(page).url;
  const description = page.data.description ?? DEFAULT_METADATA_DESCRIPTION;
  const title = formatDocumentationTitle(page.data.title);

  return {
    title: page.data.title,
    description,
    alternates: { canonical: page.url },
    openGraph: {
      title,
      description,
      siteName: DOCUMENTATION_SITE_NAME,
      images: image,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image,
    },
  };
}
