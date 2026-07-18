import { createElement } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

export interface MarkdownAnswerProps {
  readonly content: string;
}

const markdownComponents: Components = {
  a({ children, href }) {
    const isExternal = /^https?:\/\//i.test(href ?? "");
    return createElement(
      "a",
      {
        href,
        rel: isExternal ? "noreferrer noopener" : undefined,
        target: isExternal ? "_blank" : undefined,
      },
      children,
    );
  },
  img({ alt }) {
    return createElement(
      "span",
      { className: "markdown-image-placeholder" },
      `[图片：${alt?.trim() || "未命名图片"}]`,
    );
  },
};

/**
 * Renders assistant output as safe Markdown. Raw HTML stays disabled and remote
 * images are represented as text so model output cannot trigger third-party loads.
 */
export function MarkdownAnswer({ content }: MarkdownAnswerProps) {
  return createElement(
    "div",
    { className: "markdown-answer" },
    createElement(
      ReactMarkdown,
      { components: markdownComponents, remarkPlugins: [remarkGfm] },
      content,
    ),
  );
}
