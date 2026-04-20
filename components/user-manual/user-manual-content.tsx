"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";
import type { Root, Code, Paragraph } from "mdast";
import { createRoot } from "react-dom/client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { RiBook2Line, RiFlowChart, RiUserSettingsLine, RiTicketLine, RiArchiveLine, RiMoneyDollarCircleLine, RiStoreLine, RiFileLine } from "@remixicon/react";
import { TableOfContents } from "./table-of-contents";
import {
  StatusBadgeDemo,
  ServiceCardDemo,
  ServiceTableDemo,
  InvoiceDemo,
  SidebarNavDemo,
} from "./demo-components";

interface DocFile {
  slug: string;
  title: string;
  icon: string;
}

interface H2Heading {
  title: string;
  href: string;
}

const demoComponentsMap: Record<string, React.ComponentType> = {
  StatusBadge: StatusBadgeDemo,
  ServiceCard: ServiceCardDemo,
  ServiceTable: ServiceTableDemo,
  Invoice: InvoiceDemo,
  SidebarNav: SidebarNavDemo,
};

function remarkMermaid() {
  return (tree: Root) => {
    visit(tree, "code", (node: Code) => {
      if (node.lang === "mermaid") {
        (node as unknown as { type: string; value: string }).type = "html";
        node.value = `<pre class="mermaid">${node.value}</pre>`;
      }
    });
  };
}

function remarkDemoBlocks() {
  return (tree: Root) => {
    visit(tree, "paragraph", (node: Paragraph, index, parent) => {
      if (!parent || index == null) return;
      
      const textContent = node.children
        .filter((child) => child.type === "text")
        .map((child) => (child as { value: string }).value)
        .join("");
      
      const demoMatch = textContent.match(/^:::demo\s+(\w+)\s*(?::::)?$/);
      if (demoMatch) {
        const componentName = demoMatch[1];
        (parent.children as unknown as Array<{ type: string; value: string }>)[index] = {
          type: "html",
          value: `<div data-demo="${componentName}"></div>`,
        };
      }
    });
  };
}

function parseMarkdown(content: string): Promise<string> {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMermaid)
    .use(remarkDemoBlocks)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings)
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(content)
    .then((result) => String(result));
}

export function UserManualContent({ files: initialFiles }: { files: DocFile[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = searchParams.get("doc") || initialFiles[0]?.slug || "overview";
  const [content, setContent] = useState("");
  const [html, setHtml] = useState("");
  const [h2Headings, setH2Headings] = useState<H2Heading[]>([]);
  const [files] = useState(initialFiles);
  const [activeId, setActiveId] = useState<string | null>(null);
  const h2HeadingsRef = useRef<H2Heading[]>([]);

  useEffect(() => {
    h2HeadingsRef.current = h2Headings;
  }, [h2Headings]);

  useEffect(() => {
    fetch(`/api/user-manual?slug=${slug}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.content) {
          setContent(data.content);
          setH2Headings(data.h2Headings || []);
          setActiveId(null);
        }
      });
  }, [slug]);

  useEffect(() => {
    if (content) {
      parseMarkdown(content).then(setHtml);
    }
  }, [content]);

  const contentRef = useRef<HTMLDivElement>(null);

const iconMap: Record<string, React.ComponentType<{ className?: string }> | undefined> = {
  RiBook2Line,
  RiFlowChart,
  RiUserSettingsLine,
  RiTicketLine,
  RiArchiveLine,
  RiMoneyDollarCircleLine,
  RiStoreLine,
  RiFileLine,
};

function getIconComponent(iconName: string) {
  return iconMap[iconName] || RiFileLine;
}

  useEffect(() => {
    if (!html || !contentRef.current) return;
    contentRef.current.innerHTML = html;
    
    import("mermaid").then((m) => {
      m.default.initialize({ startOnLoad: false, theme: "neutral" });
      m.default.run({ querySelector: ".mermaid" }).catch(() => {});
    });

    const demoElements = contentRef.current.querySelectorAll("[data-demo]");
    demoElements.forEach((el) => {
      const componentName = el.getAttribute("data-demo");
      if (componentName && demoComponentsMap[componentName]) {
        const DemoComponent = demoComponentsMap[componentName];
        const root = createRoot(el as HTMLElement);
        root.render(<DemoComponent />);
      }
    });
  }, [html]);

  // After html renders, set initial active and start listening to scroll
  useEffect(() => {
    if (!html || h2Headings.length === 0) return;

    const OFFSET = 120;

    const getActiveId = () => {
      const scrollY = window.scrollY + OFFSET;
      const headings = h2HeadingsRef.current
        .map((h) => ({ id: h.href, el: document.getElementById(h.href) }))
        .filter((h): h is { id: string; el: HTMLElement } => h.el !== null);

      if (headings.length === 0) return null;

      let active = headings[0].id;
      for (const { id, el } of headings) {
        if (el.getBoundingClientRect().top + window.scrollY <= scrollY) {
          active = id;
        }
      }
      return active;
    };

    // Set initial state after a tick to ensure DOM is painted
    const initTimer = setTimeout(() => {
      setActiveId(getActiveId());
    }, 50);

    const handleScroll = () => {
      setActiveId(getActiveId());
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      clearTimeout(initTimer);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [html, h2Headings]);

  const handleTocClick = (href: string) => {
    setActiveId(href);
  };

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link href="/user-manual">
                  <RiBook2Line className="size-4" />
                  <span>RMS - User Manual</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Petunjuk Manual</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {files.map((file) => {
                  const IconComponent = getIconComponent(file.icon);
                  return (
                    <SidebarMenuItem key={file.slug}>
                      <SidebarMenuButton
                        isActive={slug === file.slug}
                        onClick={() => router.push(`/user-manual?doc=${file.slug}`)}
                        asChild
                      >
                        <button type="button">
                          <IconComponent className="size-4" />
                          <span>{file.title}</span>
                        </button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-12 items-center gap-2 px-4">
          <SidebarTrigger />
        </header>
        <div className="flex flex-1 gap-8 p-4">
          <div className="flex-1 mx-auto max-w-4xl">
            <div
              ref={contentRef}
              className="prose prose-neutral dark:prose-invert max-w-none mt-8"
            />
          </div>
          <TableOfContents items={h2Headings} activeId={activeId} onItemClick={handleTocClick} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
