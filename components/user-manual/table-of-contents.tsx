"use client";

import React from "react";

interface TocItem {
  title: string;
  href: string;
}

interface TableOfContentsProps {
  items: TocItem[];
  activeId?: string | null;
  onItemClick?: (href: string) => void;
}

export function TableOfContents({ items, activeId, onItemClick }: TableOfContentsProps) {
  if (items.length === 0) return null;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    onItemClick?.(href);
    const element = document.getElementById(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="hidden lg:block">
      <nav className="sticky top-16 w-48 shrink-0">
        <h4 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Daftar isi
        </h4>
        <ul className="space-y-1 border-l border-muted">
          {items.map((item) => (
            <li key={item.href}>
              <a
                href={`#${item.href}`}
                onClick={(e) => handleClick(e, item.href)}
                className={`block text-xs py-0.5 pl-3 transition-colors truncate ${
                  activeId === item.href
                    ? "text-primary font-medium border-l-2 -ml-px border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}