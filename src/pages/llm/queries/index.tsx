import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { useApiMutation } from "@/hooks/useApiMutation";
import { LLMSideSheet } from "./[llmQueryId]";
import { endpoints } from "@/api/endpoints";
import { Textarea } from "@/components/ui/textarea";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import LightRays from "@/components/LightRays";
import StarBorder from "@/components/StarBorder";

// -------------------- Validation Schema --------------------
const querySchema = z.object({
  query: z
    .string()
    .trim()
    .min(5, "Query is too short")
    .max(1000, "Query is too long"),
});

type QueryForm = z.infer<typeof querySchema>;

// -------------------- Page --------------------
const LLMQueriesPage = () => {
  const navigate = useNavigate();

  const { register, handleSubmit, formState, reset } = useForm<QueryForm>({
    resolver: zodResolver(querySchema),
    defaultValues: { query: "" },
  });

  const { errors } = formState;

  const generateMutation = useApiMutation<
    QueryForm,
    { data: { llmQueryId: string } }
  >({
    route: endpoints.entities.llm.generate,
    method: "POST",
    onSuccess: (response) => {
      const llmQueryId = response?.data?.llmQueryId;
      if (llmQueryId) {
        reset(); // clear form after successful submit
        navigate(`/llm/queries/${llmQueryId}`);
      }
    },
  });

  const onSubmit = (data: QueryForm) => {
    generateMutation.mutate(data);
  };

  return (
    <div className="relative">
      <LLMSideSheet />
      <div className="p-4 grid place-items-center w-full h-full min-h-[90dvh] relative -translate-y-10">
        <div className="absolute w-full inset-0" id="tmk">
          <LightRays
            raysOrigin="top-center"
            raysColor="#00ffff"
            raysSpeed={1.5}
            lightSpread={0.8}
            rayLength={1.2}
            followMouse={true}
            mouseInfluence={0.1}
            noiseAmount={0.1}
            distortion={0.05}
            className="custom-rays"
          />
        </div>
        <div className="flex flex-col gap-16 w-full max-w-2xl z-50">
          <h1 className="self-center text-4xl font-bold">Generate LLM Query</h1>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-5 w-full"
          >
            <div className="flex flex-col gap-2">
              <StarBorder
                as="div"
                className="custom-class p-0"
                color="cyan"
                speed="5s"
              >
                <Textarea
                  style={{
                    borderWidth: 0,
                    outlineWidth: 0,
                  }}
                  placeholder="Type your LLM query..."
                  className="flex-1 min-h-32 bg-white/10 border-none outline-none"
                  {...register("query")}
                />
              </StarBorder>

              {errors.query && (
                <p className="text-red-500 text-sm">{errors.query.message}</p>
              )}
            </div>

            <Button
              className="w-fit self-end"
              type="submit"
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? "Generating..." : "Generate"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LLMQueriesPage;
