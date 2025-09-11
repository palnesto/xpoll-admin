import { forwardRef, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FileUploadButtonProps = React.ComponentPropsWithoutRef<"input"> & {
  buttonClassName?: string;

  children?: React.ReactNode;
  buttonProps?: React.ComponentPropsWithoutRef<"button">;
};

const FileUploadButton = forwardRef<HTMLInputElement, FileUploadButtonProps>(
  ({ buttonClassName, buttonProps, children, ...inputProps }, ref) => {
    const inputRef = useRef<HTMLInputElement | null>(null);

    return (
      <>
        <input
          type="file"
          ref={(node) => {
            inputRef.current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) ref.current = node;
          }}
          className="hidden"
          {...inputProps}
        />
        <Button
          size={"sm"}
          type="button"
          className={cn(buttonClassName, "w-fit")}
          onClick={() => inputRef.current?.click()}
          {...buttonProps}
        >
          {children ?? "Upload File"}
        </Button>
      </>
    );
  }
);

FileUploadButton.displayName = "FileUploadButton";

export default FileUploadButton;
