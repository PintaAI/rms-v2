import fs from "fs";
import path from "path";
import { remark } from "remark";
import remarkGfm from "remark-gfm";

const userDocsDir = path.join(process.cwd(), "user-docs");

export interface DocFile {
  slug: string;
  title: string;
  content: string;
}

/**
 * Read a markdown file from the user-docs folder
 */
export async function readDocFile(slug: string): Promise<DocFile | null> {
  try {
    const filePath = path.join(userDocsDir, `${slug}.md`);
    
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const content = fs.readFileSync(filePath, "utf-8");
    
    // Extract title from first h1 header
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : slug;

    return {
      slug,
      title,
      content,
    };
  } catch (error) {
    console.error(`Error reading doc file ${slug}:`, error);
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
      const slug = file.replace(".md", "");
      const doc = await readDocFile(slug);
      if (doc) {
        docs.push(doc);
      }
    }
    
    return docs;
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
    const result = await remark().use(remarkGfm).process(content);
    return result.toString();
  } catch (error) {
    console.error("Error parsing markdown:", error);
    return content;
  }
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
