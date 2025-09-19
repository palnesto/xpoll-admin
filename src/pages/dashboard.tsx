import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/components/ui/select';
import aptos from "@/assets/aptos.png";
import xrp from "@/assets/xrp.png";
import sui from "@/assets/sui.png";
import xpoll from "@/assets/xpoll.png";
import toast from "react-hot-toast";
import { memo } from "react";

export const dashboardData = {
    userStats: [
        {
            label: "Total Users",
            value: "1,258",
        },
        {
            label: "U.S Citizens",
            value: "241",
        },
        {
            label: "Indians",
            value: "2,556",
        },
        {
            label: "Korea",
            value: "512",
        },
    ],
    pollStats: [
        { label: "Total Polls", value: "512", filter: true },
        { label: "Number of Currency", value: "4" },
        { label: "Trails", value: "512" },
    ],
    cryptoStats: [
        { name: "Total XXRP", value: "9,512", color: "bg-rose-300", img: xrp },
        { name: "Total Aptos", value: "11,642", color: "bg-rose-300", img: aptos },
        { name: "Total Sui", value: "13,071", color: "bg-rose-300", img: sui },
        { name: "Total Xpoll", value: "8,512", color: "bg-rose-300", img: xpoll },
    ],
    exchangeRequest: {
        count: "24 New Request",
    },
};

export const Dashboard = memo(function Dashboard() {
    const { userStats, pollStats, cryptoStats, exchangeRequest } = dashboardData;
    const handleViewMore = () => {
        toast("Feature coming soon!");
    }
    return (
        <section className="p-4 space-y-4 @container/main flex flex-1 flex-col">
            <h1 className="text-2xl font-semibold">XP Intelligence</h1>
            <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
                {userStats.map((data) => (
                    <SectionCards data={data} />
                ))}
            </div>
            <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
                {pollStats.map((data) => (
                    <SectionCards data={data} />
                ))}
            </div>
            <div className="flex justify-around items-center gap-6 py-6 overflow-x-auto">
                {cryptoStats.map((stat, index) => (
                    <CryptoStatCircle key={index} {...stat} />
                ))}
            </div>
            <Card className="p-6 mb-8 bg-primary/5 rounded-3xl">
                <div className="flex justify-between items-center">
                    <div>
                        <h4 className="font-semibold text-lg">Exchange Request</h4>
                        <p className="text-green-500 font-bold text-xl">{exchangeRequest.count}</p>
                    </div>
                    <Button onClick={handleViewMore} variant="default">View now</Button>
                </div>
            </Card>
        </section>
    );
});

export function SectionCards({ data }) {
    const { label, value, filter } = data;
    const cardClass = filter ? 'flex-1 md:col-span-2' : '';
    return (
        <Card className={`@container/card bg-primary/5 rounded-3xl flex flex-row items-start justify-between ${cardClass}`}>
            <CardHeader>
                <CardDescription className="text-muted-foreground text-lg w-64">{label}</CardDescription>
                <CardTitle className="text-xl font-semibold @[250px]/card:text-3xl">
                    {value}
                </CardTitle>
            </CardHeader>
            <CardFooter className="w-48">
                {filter && (
                    <Select >
                        <SelectTrigger>
                            <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                            All
                        </SelectContent>
                    </Select>
                )}
                </CardFooter>
        </Card>
    );
}

export const CryptoStatCircle = ({ name, value, color, img }) => (
    <section className="flex flex-col items-center text-center">
        <article className={`w-32 h-32 rounded-full flex items-center justify-center ${color} mb-4 shadow-inner`}>
            <picture className="w-24 h-24 bg-white rounded-full">
                <img src={img} alt="test" />
            </picture>
        </article>
        <p className="font-semibold">{name}</p>
        <p className="text-2xl font-bold">{value}</p>
    </section>
);