import { z } from "zod";
import { hasMeaningfulText, isValidExternalLink } from "./inkd-blog-edit.utils";

export const blogFormSchema = z.object({
  title: z.string().trim().min(1, "Min 1 character").max(2000, "Max 2000 characters"),
  description: z
    .string()
    .min(100, "Min 100 characters")
    .max(15000, "Max 15000 characters")
    .superRefine((val, ctx) => {
      if (!hasMeaningfulText(val)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Description is required" });
      }
    }),
  externalLinks: z
    .array(z.string().trim().max(2048).refine((v) => !v || isValidExternalLink(v), "Enter a valid URL"))
    .max(50)
    .optional()
    .default([])
    .transform((arr) => (Array.isArray(arr) ? arr : []).map((x) => String(x ?? "").trim()).slice(0, 50)),
});

export type BlogForm = z.infer<typeof blogFormSchema>;
