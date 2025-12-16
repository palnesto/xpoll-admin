import { endpoints } from "@/api/endpoints";
import { ThreeDotMenu } from "@/components/commons/three-dot-menu";
import { TablePage } from "@/components/table-page";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useBlogStore } from "@/stores/blog.store";
import { Delete, Edit, Eye } from "lucide-react";
import { useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { queryClient } from "@/api/queryClient";
import { appToast } from "@/utils/toast";
import { CustomModal } from "@/components/modals/custom-modal";

type BlogRow = {
  _id: string;
  title: string;
  archivedAt: string | null;
};

const BlogsPage = () => {
  const navigate = useNavigate();

  const { data } = useApiQuery(endpoints.entities.blogs.all);

  const entries: BlogRow[] = data?.data?.data?.entries ?? [];

  const isDeleting = useBlogStore((s) => s.isDeleting);
  const setIsDeleting = useBlogStore((s) => s.setIsDeleting);
  const closeDeleteModal = useBlogStore((s) => s.onClose);

  const blogToDelete = useMemo(
    () => entries.find((b) => b._id === isDeleting) ?? null,
    [entries, isDeleting]
  );

  // ✅ DELETE API
  const { mutate: deleteMutate, isPending: isDeletePending } = useApiMutation({
    route: endpoints.entities.blogs.delete, // ✅ set this in endpoints
    method: "DELETE", // if your backend uses POST for delete, change to "POST"
    onSuccess: () => {
      appToast.success("Blog deleted successfully.");
      closeDeleteModal();
      queryClient.invalidateQueries(); // or invalidate only this list key if you have it
    },
    onError: () => {
      appToast.error("Failed to delete blog.");
    },
  });

  const onConfirmDelete = useCallback(() => {
    if (!isDeleting) return;
    deleteMutate({ blogIds: [isDeleting] });
  }, [isDeleting, deleteMutate]);

  // ✅ actions depend on archivedAt
  const actions = useCallback(
    (blog: BlogRow) => {
      const isArchived = !!blog.archivedAt;

      return [
        {
          name: "View",
          icon: Eye,
          onClick: () => navigate(`/blogs/all-blogs/details/${blog._id}`),
        },
        {
          name: "Edit",
          icon: Edit,
          disabled: isArchived,
          onClick: () => {
            if (isArchived) return;
            navigate(`/blogs/all-blogs/edit/${blog._id}`);
          },
        },
        {
          name: "Delete",
          icon: Delete,
          disabled: isArchived,
          onClick: () => {
            if (isArchived) return;
            setIsDeleting(blog._id);
          },
          separatorBefore: true,
        },
      ];
    },
    [navigate, setIsDeleting]
  );

  // ✅ table rows (include isArchived for row styling)
  const tableData = useMemo(() => {
    return entries.map((b) => ({
      id: b._id,
      title: b.title,
      isArchived: !!b.archivedAt,
      options: <ThreeDotMenu actions={actions(b)} />,
    }));
  }, [entries, actions]);

  const columns = [
    { key: "id", header: "ID" },
    { key: "title", header: "Title" },
    {
      key: "options",
      header: "...",
      render: (value: any) => <span>{value}</span>,
      isRightAligned: true,
    },
  ];

  return (
    <>
      <TablePage
        title="Blogs"
        createButtonText="Create"
        onCreate={() => navigate("/blogs/all-blogs/create")}
        columns={columns}
        data={tableData}
        // ✅ you need TablePage to support this. If it doesn't, see section #3 below.
        rowClassName={(row: any) =>
          row.isArchived ? "bg-red-700/40 hover:bg-red-700/50" : ""
        }
      />

      {/* ✅ Delete confirmation modal */}
      <CustomModal
        isOpen={!!isDeleting}
        onClose={closeDeleteModal}
        title="Delete Blog"
        onSubmit={onConfirmDelete}
        submitButtonText={isDeletePending ? "Deleting..." : "Delete"}
        submitButtonClass="bg-red-600 hover:bg-red-700 text-white"
        isSubmitting={isDeletePending}
        needX
      >
        <div className="space-y-2">
          <p className="text-sm text-zinc-700">
            Are you sure you want to delete this blog?
          </p>
          <div className="rounded-lg border p-3 bg-zinc-50">
            <p className="text-sm font-medium text-zinc-900">
              {blogToDelete?.title ?? "—"}
            </p>
            {!!blogToDelete?.archivedAt && (
              <p className="text-xs text-red-600 mt-1">
                This blog is archived (delete is disabled).
              </p>
            )}
          </div>
          <p className="text-xs text-zinc-500">This action cannot be undone.</p>
        </div>
      </CustomModal>
    </>
  );
};

export default BlogsPage;
