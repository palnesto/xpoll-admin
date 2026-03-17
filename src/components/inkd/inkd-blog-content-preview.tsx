import { cn } from "@/lib/utils";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatInlineMarkdown(value: string) {
  return value.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

function isLikelyHtml(content: string) {
  return /<\/?[a-z][\s\S]*>/i.test(content);
}

function toPreviewHtml(content: string) {
  const normalized = content.replace(/\r\n?/g, "\n").trim();
  if (!normalized) return "";

  if (isLikelyHtml(normalized)) {
    return normalized.replace(/<p><\/p>/g, "<br />");
  }

  const withSectionBreaks = normalized
    .replace(/(^|\n)\s*\*\*([^*]+)\*\*\s*(?=\S)/g, "$1## $2\n\n")
    .replace(/([.!?])\s+\*\*([^*]+)\*\*\s+(?=\S)/g, "$1\n\n## $2\n\n");
  const lines = withSectionBreaks.split("\n");
  const htmlBlocks: string[] = [];
  const paragraphLines: string[] = [];

  const flushParagraph = () => {
    const text = paragraphLines.join(" ").replace(/\s+/g, " ").trim();
    if (!text) return;

    htmlBlocks.push(`<p>${formatInlineMarkdown(escapeHtml(text))}</p>`);
    paragraphLines.length = 0;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      continue;
    }

    if (line.startsWith("## ")) {
      flushParagraph();
      htmlBlocks.push(`<h3>${escapeHtml(line.slice(3).trim())}</h3>`);
      continue;
    }

    paragraphLines.push(line);
  }

  flushParagraph();

  return htmlBlocks.join("");
}

type InkDBlogContentPreviewProps = {
  content: string;
  className?: string;
};

export function InkDBlogContentPreview({ content, className }: InkDBlogContentPreviewProps) {
  const html = toPreviewHtml(content);
  if (!html) return null;

  return (
    <div
      className={cn(
        "prose max-w-none text-[#2d2d30] prose-p:my-0 prose-p:text-[15px] prose-p:leading-[1.95]",
        "prose-strong:text-[#17171a] prose-strong:font-semibold",
        "prose-h3:mb-4 prose-h3:mt-10 prose-h3:text-[18px] prose-h3:font-semibold prose-h3:tracking-[-0.02em] prose-h3:text-[#17171a]",
        "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
