import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useApiQuery } from "@/hooks/useApiQuery";
import { Progress } from "@/components/ui/progress";
import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { convertToProperCase } from "@/utils/formatter";
import dayjs from "dayjs";
import { Loader2 } from "lucide-react";
import { endpoints } from "@/api/endpoints";
import { ImageCarousel } from "@/components/image";
import { RichTextPreview } from "@/components/editor/preview";

const BlogDetailsPage = () => {
  const { id } = useParams();
  const { data } = useApiQuery(endpoints.entities.blogs.getById(id as string));
  console.log("detaails data", data);
  const blogData = useMemo(() => {
    return data?.data?.data.blog ?? null;
  }, [data]);
  console.log("blogData", blogData, data);
  if (!blogData) {
    return (
      <div className="flex gap-2">
        Loading... <Loader2 className="animate-spin" />
      </div>
    );
  }
  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <section className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">{blogData?.title}</h1>
        <p className="text-muted-foreground text-sm">
          {dayjs(blogData?.createdAt)?.format("MMM DD YYYY, HH:mm")}
        </p>
      </section>

      {/* User details if exists */}

      <ImageCarousel images={blogData?.imageUrls} />

      {/* Option Distribution */}
      <section className="space-y-4">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Option Distribution</CardTitle>
            <CardDescription>{blogData?.pollStatement}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {blogData?.responses?.map(
                ({
                  type,
                  count,
                  percentage,
                }: {
                  type: string;
                  count: number;
                  percentage: string;
                }) => (
                  <div
                    key={`${type}-${count}-${percentage}`}
                    className="space-y-1"
                  >
                    <div className="flex justify-between items-center">
                      <span>{convertToProperCase(type)}</span>
                      <span className="text-muted-foreground">{`${percentage}%`}</span>
                    </div>
                    <Progress value={parseFloat(percentage)} />
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Content */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Content</h2>
        <RichTextPreview content={blogData?.content} />
      </section>

      {/* Stats Section */}
      {/* <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Coins Assigned"
          value={total_coins_assigned}
          Icon={HandCoins}
          // iconClassname="text-yellow-500"
        />
        <StatsCard
          title="Coins Rewarded per Poll"
          value={coins_rewarded_per_poll}
          Icon={Coins}
          // iconClassname="text-yellow-500"
        />
        <StatsCard
          title="Energy Reduced per Poll"
          value={energy_reduced_per_poll}
          Icon={Zap}
          // iconClassname="text-green-500"
        />
        <StatsCard
          title="Total Interactions"
          value={analysis?.interactions?.tillNow ?? "N/A"}
        />
      </section> */}
    </div>
  );
};

export default BlogDetailsPage;
