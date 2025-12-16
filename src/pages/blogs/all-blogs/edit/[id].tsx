import { endpoints } from "@/api/endpoints";
import { TipTap } from "@/components/editor/tiptap";
import { ImageCarousel } from "@/components/image";
import ResourceAssetsEditor from "@/components/polling/editors/ResourceAssetsEditor";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useImageUpload } from "@/hooks/upload/useAssetUpload";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useApiQuery } from "@/hooks/useApiQuery";
import { appToast } from "@/utils/toast";
import { RESOURCE_TYPES_STRING } from "@/validators/poll-trial-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";

const formSchema = z
  .object({
    title: z.string().min(1, { message: "Title is required." }).optional(),
    content: z.string().min(1, { message: "Content is required." }).optional(),
    pollStatement: z
      .string()
      .min(1, { message: "Poll statement is required." })
      .optional(),
    imageUrls: z
      .array(
        z.object({
          type: z.literal(RESOURCE_TYPES_STRING.IMAGE),
          value: z.array(z.union([z.instanceof(File), z.string()])).nullable(),
        })
      )
      .min(1, { message: "At least one image is required." })
      .max(3, { message: "Maximum of 3 images allowed." })
      .optional(),
  })
  .strict();

type FormValues = z.infer<typeof formSchema>;
export default function EditBlogPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { uploadImage, loading: imageUploading } = useImageUpload();

  const { data: blogRes, isPending: isBlogDataPending } = useApiQuery(
    id ? endpoints.entities.blogs.getById(id) : "",
    { enabled: !!id }
  );
  const blog = blogRes?.data?.data?.blog;

  const { mutate: blogEditMutate, isPending: isBlogEditPending } =
    useApiMutation({
      route: endpoints.entities.blogs.update(id as string),
      method: "PATCH",
      onSuccess: (data) => {
        if (data?.statusCode === 200) {
          appToast.success("Blog updated successfully");
          navigate(`/blogs/all-blogs/details/${id}`);
        }
      },
    });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
      pollStatement: "",
      imageUrls: [],
    },
  });

  useEffect(() => {
    if (!blog) return;

    form.reset({
      title: blog?.title ?? "",
      content: blog?.content ?? "",
      pollStatement: blog?.pollStatement ?? "",
      imageUrls: (blog?.imageUrls ?? []).map((url: string) => ({
        type: RESOURCE_TYPES_STRING.IMAGE,
        value: [url],
      })),
    });
  }, [blog]);

  // for preview carousel, you need string[]
  const previewImages: string[] = useMemo(() => {
    const items = form.watch("imageUrls") ?? [];
    return items
      .map((x) => x.value?.[0])
      .filter((v): v is string => typeof v === "string" && v.length > 0);
  }, [form.watch("imageUrls")]);

  async function onSubmit(values: FormValues) {
    const finalImageUrls = (
      await Promise.all(
        values.imageUrls.map(async (obj) => {
          const first = obj.value?.[0];

          if (first instanceof File) {
            return await uploadImage(first);
          }

          if (typeof first === "string" && first.trim()) {
            return first.trim();
          }

          return null;
        })
      )
    ).filter(Boolean) as string[];

    if (finalImageUrls.length === 0) {
      appToast.error("Please add at least one image.");
      return;
    }

    const payload = {
      title: values.title,
      content: values.content,
      pollStatement: values.pollStatement,
      imageUrls: finalImageUrls, // ✅ backend wants string[]
    };

    blogEditMutate(payload as any);
  }

  const disableSubmit =
    isBlogDataPending || isBlogEditPending || imageUploading;

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold">Edit Blog</h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Preview */}
          {previewImages.length > 0 && <ImageCarousel images={previewImages} />}

          <FormField
            control={form.control}
            name="imageUrls"
            render={() => (
              <FormItem>
                <FormLabel>Images</FormLabel>
                <FormControl>
                  <ResourceAssetsEditor
                    control={form.control}
                    name="imageUrls"
                    maxAssets={3}
                    isEditing={true}
                    mediaAllowed={["image"]}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter your blog post title"
                    {...field}
                    className="text-lg"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Content</FormLabel>
                <FormControl>
                  <TipTap description={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="pollStatement"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Poll Statement</FormLabel>
                <FormControl>
                  <Input placeholder="Enter your poll statement" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end space-x-4">
            <Button
              variant="secondary"
              type="button"
              disabled={disableSubmit}
              onClick={() => navigate(-1)}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={disableSubmit}>
              {disableSubmit ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
