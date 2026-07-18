import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MarkdownAnswer } from "./MarkdownAnswer";

describe("MarkdownAnswer", () => {
  it("渲染问答常用的 GFM 标题、列表、表格、引用和代码", () => {
    const html = renderToStaticMarkup(
      createElement(MarkdownAnswer, {
        content: [
          "### 📁 制度分类",
          "",
          "- **会议管理制度**",
          "- `采购管理办法`",
          "",
          "> 关键结论需要结合原文复核。",
          "",
          "| 文件名称 | 分类 |",
          "| --- | --- |",
          "| 采购管理办法 | 采购 |",
        ].join("\n"),
      }),
    );

    expect(html).toContain("<h3>");
    expect(html).toContain("<ul>");
    expect(html).toContain("<strong>会议管理制度</strong>");
    expect(html).toContain("<code>采购管理办法</code>");
    expect(html).toContain("<blockquote>");
    expect(html).toContain("<table>");
  });

  it("禁用原始 HTML 和远程图片，并保护外部链接", () => {
    const html = renderToStaticMarkup(
      createElement(MarkdownAnswer, {
        content: [
          "<script>alert('xss')</script>",
          "[制度原文](https://example.com/policy)",
          "![跟踪图片](https://example.com/tracker.png)",
        ].join("\n\n"),
      }),
    );

    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html).toContain("target=\"_blank\"");
    expect(html).toContain("rel=\"noreferrer noopener\"");
    expect(html).toContain("[图片：跟踪图片]");
  });
});
