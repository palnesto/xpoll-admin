import { cn } from "@/lib/utils";

export const RichTextPreview = ({ content }: { content: string }) => {
  const transformedContent = content.replace(/<p><\/p>/g, "<br />");

  return (
    <div
      className={cn(
        "prose dark:prose-invert max-w-none",
        "rounded-lg border border-input bg-background p-4 mt-4",
        "[&>*:first-child]:mt-0",
        "[&>*:last-child]:mb-0"
      )}
      dangerouslySetInnerHTML={{ __html: transformedContent }}
    />
  );
};
