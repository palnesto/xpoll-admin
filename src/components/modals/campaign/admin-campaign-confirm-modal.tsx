import { AnimatePresence, motion } from "framer-motion";
import type { AdminCreateCampaignFormValues } from "@/schema/admin-campaign.schema";
import { cn } from "@/lib/utils";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  snapshot: AdminCreateCampaignFormValues | null;
  selectedPlanName?: string;
  selectedPlanPriceLabel?: string;
  selectedUserName?: string;
  register: (name: "agree", options?: object) => any;
  errors: { agree?: { message?: string } };
  agree: boolean;
  onCreate: () => Promise<void>;
  isCreating: boolean;
};

const overlay = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const card = {
  initial: { opacity: 0, y: 18, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 18, scale: 0.98 },
};

export function AdminCampaignConfirmModal({
  isOpen,
  onClose,
  snapshot,
  selectedPlanName,
  selectedPlanPriceLabel,
  selectedUserName,
  register,
  errors,
  agree,
  onCreate,
  isCreating,
}: Props) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50"
        initial="initial"
        animate="animate"
        exit="exit"
        onClick={onClose}
      >
        <motion.div
          variants={overlay}
          transition={{ duration: 0.18 }}
          className="absolute inset-0 bg-black/80"
        />

        <div className="absolute inset-0 flex items-center justify-center p-4 overflow-y-scroll">
          <motion.div
            variants={card}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="w-full max-w-lg rounded-2xl bg-gray-300 shadow-inner shadow-black overflow-y-scroll"
            onClick={(e) => e.stopPropagation()}
          >
            <section className="p-7 text-[#646464] max-w-7xl overflow-y-scroll h-fit">
              <header>
                <h1 className="text-black font-semibold">
                  {snapshot?.campaignName || "Campaign"}
                </h1>
                <h2 className="text-sm">{snapshot?.goal}</h2>
                {selectedUserName && (
                  <p className="mt-1 text-sm text-gray-600">
                    For user: <span className="font-medium">{selectedUserName}</span>
                  </p>
                )}
              </header>

              <p className="mt-7 rounded-3xl bg-[#F5F5F5] px-3 py-2 text-center font-medium text-[#5E6366]">
                Details
              </p>

              <section className="grid grid-cols-2 gap-5 py-7">
                <div>
                  <div>Plan name</div>
                  <div className="font-medium text-black text-lg">
                    {selectedPlanName ?? "-"}
                  </div>
                </div>
                <div>
                  <div>Price</div>
                  <div className="font-medium text-black text-lg">
                    {selectedPlanPriceLabel ?? "-"}
                  </div>
                </div>
                <div>
                  <div>Get data Access</div>
                  <div className="font-medium text-black text-lg">
                    {snapshot?.getDataAccess ? "Yes" : "No"}
                  </div>
                </div>
                <div>
                  <div>Type of campaign</div>
                  <div className="font-medium text-black text-lg">
                    {snapshot?.campaignType === "political"
                      ? "Political"
                      : "non-Political"}
                  </div>
                </div>
              </section>

              <p className="rounded-3xl bg-red-50 px-3 py-2 text-center text-xs font-medium text-red-700">
                Important Notice:
              </p>

              <div className="my-7 flex items-start gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-teal-600"
                  {...register("agree", {
                    validate: (v: boolean) =>
                      !!v || "You must agree before proceeding",
                  })}
                />
                <p className="text-xs">
                  By proceeding, you acknowledge that all campaign information
                  submitted prior to creation is final. The campaign will be
                  created for the selected user. Campaign features, availability,
                  and access are governed by the selected plan and are subject to
                  the platform&apos;s Terms of Service.
                </p>
              </div>

              {errors?.agree && (
                <p className="mt-1 text-xs text-red-600">{errors.agree.message}</p>
              )}

              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-3xl border border-gray-300 px-4 py-3 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!agree || isCreating}
                  onClick={onCreate}
                  className={cn(
                    "flex-1 rounded-3xl px-4 py-3 text-sm font-semibold text-black",
                    agree
                      ? "bg-white hover:bg-[#29d8d8]"
                      : "bg-gray-500 cursor-not-allowed",
                  )}
                >
                  {isCreating ? "Creating..." : "Create Campaign"}
                </button>
              </div>
            </section>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
