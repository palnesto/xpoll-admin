const ResourceAssetsPreview = ({
  src,
  label,
}: {
  src: string;
  label: string;
}) => {
  return (
    <div className="flex items-center gap-2 overflow-hidden">
      <img
        src={src}
        alt={label}
        className="h-10 w-10 rounded object-cover flex-shrink-0"
      />
      <p className="truncate text-sm text-zinc-100">{label}</p>
    </div>
  );
};

export default ResourceAssetsPreview;
