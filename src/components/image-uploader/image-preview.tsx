import React from "react";

interface ImagePreviewProps {
  src: string;
  alt: string;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({ src, alt }) => {
  return (
    <div className="w-16 h-16 relative rounded-lg overflow-hidden bg-gray-700">
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        onLoad={() => {
          URL.revokeObjectURL(src);
        }}
      />
    </div>
  );
};
