import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { GripVertical, Link as LinkIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { InkdAgentCreateFormValues } from "@/schema/inkd-agent-create.schema";

const MAX_PRIORITY_SOURCES = 5;

const INPUT_CLASS =
  "w-full h-11 rounded-2xl border px-3 text-base font-light tracking-wide bg-white text-[#111] placeholder:text-[#9a9aab] focus:ring-2 focus-visible:outline-none border-[#DDE2E5] focus:border-[#E8EAED] focus:ring-[#E8EAED]";

const ADD_BUTTON_CLASS =
  "rounded-full bg-[#E4F2DF] px-4 py-1.5 text-[11px] font-semibold text-[#315326] hover:text-[#315326] hover:bg-[#d4e8cf] disabled:opacity-60 shrink-0";

function normalizeUrl(s: string): string {
  const t = s.trim();
  if (!t) return "";
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

function isValidUrl(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  try {
    const url = new URL(normalizeUrl(t));
    const host = url.hostname;
    return (
      host === "localhost" || (host.length > 0 && host.includes("."))
    );
  } catch {
    return false;
  }
}

type Props = {
  form: UseFormReturn<InkdAgentCreateFormValues>;
  priorityFields: Array<{ id: string }>;
  append: (value: string) => void;
  remove: (index: number) => void;
  move: (from: number, to: number) => void;
};

export function PriorityScrapingStep({
  form,
  priorityFields,
  append,
  remove,
  move,
}: Props) {
  const [newUrl, setNewUrl] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const { formState: { errors } } = form;
  const sources = form.watch("prioritySources") ?? [];

  const handleAddLink = () => {
    setAddError(null);
    const raw = newUrl.trim();
    if (!raw) {
      setAddError("Enter a URL to add");
      return;
    }
    if (!isValidUrl(raw)) {
      setAddError(
        "Enter a valid URL (e.g. https://x.com/xpollplatform or app.xpoll.io)",
      );
      return;
    }
    if (sources.length >= MAX_PRIORITY_SOURCES) {
      setAddError("Maximum 5 URLs allowed");
      return;
    }
    const normalized = normalizeUrl(raw);
    if (sources.some((u) => normalizeUrl(String(u).trim()) === normalized)) {
      setAddError("This URL is already in the list");
      return;
    }
    append(normalized);
    setNewUrl("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Label className="text-xs font-semibold text-[#5E6366]">
          Paste URL to parse…
        </Label>
        <span className="text-xs text-[#5E6366]">
          {sources.length}/{MAX_PRIORITY_SOURCES}
        </span>
      </div>

      <div className="flex gap-2">
        <input
          placeholder="https://example.com or example.com"
          value={newUrl}
          onChange={(e) => {
            setNewUrl(e.target.value);
            setAddError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddLink();
            }
          }}
          className={cn(
            "flex-1",
            INPUT_CLASS,
            addError ? "border-red-500 focus:ring-red-200" : undefined,
          )}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddLink}
          disabled={sources.length >= MAX_PRIORITY_SOURCES}
          className={ADD_BUTTON_CLASS}
        >
          + Add Link
        </Button>
      </div>

      {addError ? (
        <p className="mt-1 text-xs text-destructive">{addError}</p>
      ) : null}

      <DragDropContext
        onDragEnd={(result: any) => {
          if (!result.destination) return;
          if (result.destination.index === result.source.index) return;
          move(result.source.index, result.destination.index);
        }}
      >
        <Droppable droppableId="priority-list">
          {(provided: any) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="space-y-3"
            >
              {priorityFields.map((field, index) => (
                <Draggable
                  key={field.id}
                  draggableId={field.id}
                  index={index}
                >
                  {(drag: any) => (
                    <div
                      ref={drag.innerRef}
                      {...drag.draggableProps}
                      className="flex items-center gap-3 rounded-2xl bg-[#f5f5f7] px-4 py-3"
                    >
                      <button
                        type="button"
                        {...drag.dragHandleProps}
                        className="cursor-grab text-[#b5b5c2]"
                      >
                        <GripVertical className="h-4 w-4" />
                      </button>
                      <span className="h-2 w-2 shrink-0 rounded-full bg-[#78BC61]" />
                      <LinkIcon className="h-4 w-4 shrink-0 text-[#78BC61]" />
                      <span className="min-w-0 flex-1 truncate text-sm text-[#111]">
                        {sources[index] ?? ""}
                      </span>
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="shrink-0 rounded-lg p-2 text-[#5d5d66] hover:bg-black/5"
                        aria-label="Remove URL"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {errors.prioritySources && (
        <p className="text-xs text-red-600">
          {(errors.prioritySources as { message?: string })?.message ??
            "Please fix the URLs above"}
        </p>
      )}
    </div>
  );
}
