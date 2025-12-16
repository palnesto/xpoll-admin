import { endpoints } from "@/api/endpoints";
import { TipTap } from "@/components/editor/tiptap";
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
import { appToast } from "@/utils/toast";
import { RESOURCE_TYPES_STRING } from "@/validators/poll-trial-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

const formSchema = z
  .object({
    title: z
      .string()
      .min(1, { message: "Title is required." })
      .max(500, { message: "Title is too long." }),
    content: z
      .string()
      .min(1, { message: "Content is required." })
      .max(5000, { message: "Content is too long." }),
    pollStatement: z
      .string()
      .min(1, { message: "Poll statement is required." })
      .max(500, { message: "Poll statement is too long." }),
    imageUrls: z
      .array(
        z.object({
          type: z.literal(RESOURCE_TYPES_STRING.IMAGE),
          value: z.array(z.union([z.instanceof(File), z.string()])).nullable(),
        })
      )
      .min(1, { message: "At least one image URL is required." })
      .max(3, { message: "Maximum of 3 images allowed." }),
  })
  .strict();

type FormValues = z.infer<typeof formSchema>;
export default function CreateBlogPage() {
  const navigate = useNavigate();
  const { uploadImage } = useImageUpload();

  const { mutate: blogCreateMutate } = useApiMutation({
    route: endpoints.entities.blogs.create,
    method: "POST",
    onSuccess: (data) => {
      if (data?.statusCode === 201) {
        appToast.success("Blog created successfully");
        if (data?.data?._id) {
          navigate(`/blogs/all-blogs/details/${data?.data?._id}`);
        }
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

  async function onSubmit(values: FormValues) {
    const finalImageUrls = (
      await Promise.all(
        values.imageUrls.map(async (obj) => {
          try {
            const valueArr = obj.value ?? [];
            const file = valueArr[0];

            if (file instanceof File) {
              const url = await uploadImage(file);
              return url;
            } else if (typeof file === "string" && file.trim().length > 0) {
              return file;
            }
            return null;
          } catch (error) {
            console.log(error);
            return null;
          }
        })
      )
    ).filter(Boolean) as string[];

    const payload = {
      title: values.title,
      content: values.content,
      pollStatement: values.pollStatement,
      imageUrls: finalImageUrls,
    };
    blogCreateMutate(payload);
  }
  return (
    <>
      <div className="p-6 space-y-8">
        <h1 className="text-2xl font-bold">Create Blog</h1>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
                    <TipTap
                      description={field.value}
                      onChange={field.onChange}
                    />
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

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <Button
                variant={"secondary"}
                type="button"
                disabled={form.formState.isSubmitting}
                onClick={() => {
                  navigate(-1);
                }}
              >
                Cancel
              </Button>

              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? "Creating Blog..."
                  : "Create Blog"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </>
  );
}
