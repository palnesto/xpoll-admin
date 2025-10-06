"use client";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";

const CheckIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={cn("w-6 h-6", className)}
  >
    <path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const CheckFilled = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={cn("w-6 h-6", className)}
  >
    <path
      fillRule="evenodd"
      d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
      clipRule="evenodd"
    />
  </svg>
);

const LoaderCore = ({ steps }: { steps: string[] }) => {
  return (
    <div className="flex flex-col mt-10">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const isSecondLast =
          steps?.length < 2 ? false : index === steps.length - 2;

        return (
          <motion.div
            key={index}
            className="flex gap-2 mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div>
              {isLast ? (
                <CheckIcon className="text-black dark:text-white animate-pulse" />
              ) : (
                <CheckFilled className="text-black dark:text-purple-500" />
              )}
            </div>
            <span
              className={cn("text-black dark:text-white opacity-50", {
                "opacity-100": isSecondLast,
                "text-purple-500 font-semibold animate-pulse opacity-100":
                  isLast,
              })}
            >
              {step}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
};

export const MultiStepLoader = ({ steps }: { steps: string[] }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative flex items-start justify-start p-4 w-fit"
    >
      <LoaderCore steps={steps} />
    </motion.div>
  );
};
