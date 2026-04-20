import fs from "fs";
import path from "path";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";
import type { Root, Code, Paragraph } from "mdast";

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
      if (!parent || index === null) return;
      
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

const userDocsDir = path.join(process.cwd(), "user-manual");

export interface DocFile {
  slug: string;
  title: string;
  icon: string;
  content: string;
}

/**
 * Read a markdown file from the user-docs folder
 * Filename format: {number}-{title}[{icon}].md
 * Example: 01-overview[RiBook2Line].md
 */
export async function readDocFile(filename: string): Promise<DocFile | null> {
  try {
    const filePath = path.join(userDocsDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const content = fs.readFileSync(filePath, "utf-8");
    
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : filename;

    const iconMatch = filename.match(/\[([A-Za-z]+)\]\.md$/);
    const icon = iconMatch ? iconMatch[1] : "RiFileLine";

    const slug = filename.replace(/\[([A-Za-z]+)\]\.md$/, ".md").replace(".md", "");

    return {
      slug,
      title,
      icon,
      content,
    };
  } catch (error) {
    console.error(`Error reading doc file ${filename}:`, error);
    return null;
  }
}

/**
 * Find and read a doc file by slug (without icon suffix)
 * Example: slug "01-overview" matches file "01-overview[RiBook2Line].md"
 */
export async function findDocFileBySlug(slug: string): Promise<DocFile | null> {
  try {
    const files = fs.readdirSync(userDocsDir).filter((file) => file.endsWith(".md"));
    
    const matchingFile = files.find((file) => {
      const fileSlug = file.replace(/\[([A-Za-z]+)\]\.md$/, ".md").replace(".md", "");
      return fileSlug === slug;
    });

    if (!matchingFile) {
      return null;
    }

    return readDocFile(matchingFile);
  } catch (error) {
    console.error(`Error finding doc file by slug ${slug}:`, error);
    return null;
  }
}

/**
 * Get list of all available documentation files
 */
export async function getAllDocFiles(): Promise<DocFile[]> {
  try {
    const files = fs.readdirSync(userDocsDir).filter((file) => file.endsWith(".md"));
    
    const docs: DocFile[] = [];
    
    for (const file of files) {
      const doc = await readDocFile(file);
      if (doc) {
        docs.push(doc);
      }
    }
    
    return docs.sort((a, b) => a.slug.localeCompare(b.slug));
  } catch (error) {
    console.error("Error reading doc files:", error);
    return [];
  }
}

/**
 * Parse markdown to HTML using remark
 */
export async function parseMarkdown(content: string): Promise<string> {
  try {
    const result = await unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkMermaid)
      .use(remarkDemoBlocks)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeSlug)
      .use(rehypeAutolinkHeadings)
      .use(rehypeStringify, { allowDangerousHtml: true })
      .process(content);
    return result.toString();
  } catch (error) {
    console.error("Error parsing markdown:", error);
    return content;
  }
}

export function getDemoComponents(content: string): string[] {
  const matches = content.matchAll(/:::demo\s+(\w+)\s*:::/g);
  return Array.from(matches, (m) => m[1]);
}

/**
 * Get the table of contents from markdown content
 */
export function getTableOfContents(content: string): Array<{ level: number; title: string; href: string }> {
  const headings = content.match(/^#{1,6}\s+(.+)$/gm) || [];
  
  return headings.map((heading) => {
    const level = heading.match(/^#+/)?.[0].length || 1;
    const title = heading.replace(/^#+\s+/, "");
    const href = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");
    
    return { level, title, href };
  });
}

export function getH2Headings(content: string): Array<{ title: string; href: string }> {
  const headings = content.match(/^##\s+(.+)$/gm) || [];
  
  return headings.map((heading) => {
    const title = heading.replace(/^##\s+/, "");
    const href = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");
    
    return { title, href };
  });
}
