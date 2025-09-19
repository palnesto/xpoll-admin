import { memo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { useNavigate } from "react-router-dom";

const MemoPolls = () => {
    const navigate = useNavigate();
    const mapData = [
        { id:'1', title: "What about Donald Trump", views: "1475 views", polls: '3212 Polls' },
        { id:'2', title: "What about Narendra Modi", views: "1475 views", polls: '3212 Polls' },
        { id:'3', title: "What about Donald Trump", views: "1475 views", polls: '3212 Polls' },
        { id:'4', title: "What about Donald Trump", views: "1475 views", polls: '3212 Polls' },
        { id:'5', title: "What about Donald Trump", views: "1475 views", polls: '3212 Polls' },
        { id:'6', title: "What about Donald Trump", views: "1475 views", polls: '3212 Polls' },
    ];

    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("All");

    const filteredData = mapData.filter(item =>
        item.title.toLowerCase().includes(search.toLowerCase()) &&
        (filter === "All" || item.views === filter)
    );

    const handleViewMore = (id: string, title: string) => {
        navigate(`/analytics/polls/${id}`, { state: { title } });
    }

    const Header = () => (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-bold">Statics</h1>
                <p className="text-muted-foreground">View detailed analytics of all the polls</p>
            </div>
            <div className="flex flex-col md:flex-row gap-2 md:gap-4">
                <Input
                    className="w-full md:w-[40dvw]"
                    placeholder="Search Polls..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <Select value={filter} onValueChange={setFilter}>
                    <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by Views" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="All">All</SelectItem>
                        <SelectItem value="Total Polls">Total Polls</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col gap-6 md:p-6 h-full">
            <Header />
            <div className="flex flex-col gap-4 max-h-[65vh] overflow-y-auto">
                {filteredData.map((data, idx) => (
                    <Card
                        key={idx}
                        className="@container/card bg-primary/5 rounded-3xl flex flex-row justify-between"
                    >
                        <CardHeader className="w-full">
                            <CardTitle className="text-xl font-semibold @[250px]/card:text-3xl">{data.title}</CardTitle>
                            <CardDescription className="text-muted-foreground text-lg">{data.views} | {data.polls}</CardDescription>
                        </CardHeader>
                        <CardFooter className="md:w-48">
                            <Button onClick={() => handleViewMore(data.id, data.title)} variant="outline" className="w-full md:h-12 rounded-2xl">
                                View More
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            {/* Pagination Footer */}
            <div className="fixed bottom-0 left-0 w-full bg-background flex justify-center py-4 shadow-md">
                <Pagination>
                    <PaginationPrevious>Prev</PaginationPrevious>
                    <PaginationLink href="#">1</PaginationLink>
                    <PaginationLink href="#">2</PaginationLink>
                    <PaginationLink href="#">3</PaginationLink>
                    <PaginationNext>Next</PaginationNext>
                </Pagination>
            </div>
        </div>
    );
};

const Polls = memo(MemoPolls)
export default Polls;
