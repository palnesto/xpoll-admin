import { Pie, PieChart } from "recharts"
import {
    ChartConfig,
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CryptoStatCircle, dashboardData } from "@/pages/dashboard";
import { MoveLeftIcon } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { TrendingUp } from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { memo } from "react";

export const description = "A pie chart with a legend"

const chartData = [
    { browser: "chrome", visitors: 275, fill: "var(--color-chrome)" },
    { browser: "safari", visitors: 200, fill: "var(--color-safari)" },
    { browser: "firefox", visitors: 187, fill: "var(--color-firefox)" },
    { browser: "edge", visitors: 173, fill: "var(--color-edge)" },
    { browser: "other", visitors: 90, fill: "var(--color-other)" },
]

const chartConfig = {
    visitors: {
        label: "Visitors",
    },
    chrome: {
        label: "U.S sentiment towards Bitcoin ",
        color: "#EC6B56",
    },
    safari: {
        label: "U.S sentiment towards Bitcoin ",
        color: "#F43F5E",
    },
    firefox: {
        label: "U.S sentiment towards Bitcoin ",
        color: "#FBBF24",
    },
    edge: {
        label: "U.S sentiment towards Bitcoin ",
        color: "#3B82F6",
    },
    other: {
        label: "U.S sentiment towards Bitcoin ",
        color: "#A855F7",
    },
} satisfies ChartConfig

export const description2 = "A stacked area chart"

const chartData2 = [
    { month: "January", desktop: 186, mobile: 80 },
    { month: "February", desktop: 305, mobile: 200 },
    { month: "March", desktop: 237, mobile: 120 },
    { month: "April", desktop: 73, mobile: 190 },
    { month: "May", desktop: 209, mobile: 130 },
    { month: "June", desktop: 214, mobile: 140 },
]

const chartConfig2 = {
    desktop: {
        label: "Desktop",
        color: "#EC6B56",
    },
    mobile: {
        label: "Mobile",
        color: "#FBBF24",
    },
} satisfies ChartConfig

export function ChartPieLegend() {
    return (
        <Card className="flex flex-col">
            <CardHeader className="items-center pb-0">
                <CardTitle>Pie Chart - Legend</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 pb-0">
                <ChartContainer
                    config={chartConfig}
                    className="mx-auto md:h-[400px] w-[500px] lg:w-[1000px]"
                >
                    <PieChart>
                        <Pie data={chartData} dataKey="visitors" />
                        <ChartLegend
                            content={<ChartLegendContent nameKey="browser" />}
                        />
                    </PieChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}

const ranksData = Array.from({ length: 7 }, (_, i) => ({
    id: `${i + 1}`,
    level: `${i + 1}`,
    score: '59'
}));

export const PollsRanks = () => {
    return (
        <article className="flex flex-row gap-4 overflow-x-auto">
            {ranksData.map(({ level, score }) => (
                <Card key={level} className={`@container/card bg-primary/5 rounded-3xl w-32`}>
                    <CardHeader>
                        <CardDescription className="text-muted-foreground text-lg w-64">Level- {level}</CardDescription>
                        <CardTitle className="text-xl font-semibold @[250px]/card:text-3xl">
                            {score}
                        </CardTitle>
                    </CardHeader>
                </Card>
            ))}
        </article>
    )
}


export function ChartAreaStacked() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Area Chart - Stacked</CardTitle>
                <CardDescription>
                    Showing total visitors for the last 6 months
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig2} className="mx-auto md:h-[400px] w-[500px] lg:w-[1000px]">
                    <AreaChart
                        accessibilityLayer
                        data={chartData2}
                        margin={{
                            left: 12,
                            right: 12,
                        }}
                    >
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="month"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            tickFormatter={(value) => value.slice(0, 3)}
                        />
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent indicator="dot" />}
                        />
                        <Area
                            dataKey="mobile"
                            type="natural"
                            fill="var(--color-mobile)"
                            fillOpacity={0.4}
                            stroke="var(--color-mobile)"
                            stackId="a"
                        />
                        <Area
                            dataKey="desktop"
                            type="natural"
                            fill="var(--color-desktop)"
                            fillOpacity={0.4}
                            stroke="var(--color-desktop)"
                            stackId="a"
                        />
                    </AreaChart>
                </ChartContainer>
            </CardContent>
            <CardFooter>
                <div className="flex w-full items-start gap-2 text-sm">
                    <div className="grid gap-2">
                        <div className="flex items-center gap-2 leading-none font-medium">
                            Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
                        </div>
                        <div className="text-muted-foreground flex items-center gap-2 leading-none">
                            January - June 2025
                        </div>
                    </div>
                </div>
            </CardFooter>
        </Card>
    )
}

const MemoIndividualPolls = () => {
    const location = useLocation()
    const navigate = useNavigate()
    const handleBack = () => {
        navigate(`/analytics/polls`)
    }
    const { cryptoStats } = dashboardData;
    const data = [
        {
            label: "Total Views",
            value: "2,241",
        },
        {
            label: "Total Participants",
            value: "59",
        },
        {
            label: "Rewards Claimed",
            value: "59",
        }
    ]
    const Header = () => {
        return (
            <div className="flex gap-4 items-center mb-4">
                <MoveLeftIcon onClick={handleBack} className="text-muted-foreground cursor-pointer" />
                <h1 className="text-xl font-bold">{location.state?.title}</h1>
            </div>
        )
    }
    return (
        <section className="p-6">
            <Header />
            <article className="grid grid-cols-1 gap-4 md:grid-cols-4">
                {data.map(({ label, value }) => (
                    <Card key={label} className={`@container/card bg-primary/5 rounded-3xl`}>
                        <CardHeader>
                            <CardDescription className="text-muted-foreground text-lg w-64">{label}</CardDescription>
                            <CardTitle className="text-xl font-semibold @[250px]/card:text-3xl">
                                {value}
                            </CardTitle>
                        </CardHeader>
                    </Card>
                ))}
            </article>
            <article className="my-4">
                <ChartPieLegend />
            </article>
            <div className="flex justify-around gap-6 py-6 overflow-x-auto">
                {cryptoStats.map((stat, index) => (
                    <CryptoStatCircle key={index} {...stat} />
                ))}
            </div>
            <div className="space-y-4">
                <PollsRanks />
            </div>
            <div className="my-4">
                <ChartAreaStacked />
            </div>
        </section>
    )
}

const IndividualPolls = memo(MemoIndividualPolls)
export default IndividualPolls
