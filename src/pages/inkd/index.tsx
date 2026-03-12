import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router";
import xpollSVG from "@/assets/xpoll-svg.svg";
import bg from "@/assets/inkdbg.mp4";
import ink from "@/assets/ink.png"
import { SignalCard } from "@/components/inkd/list-card";
import { inkdSignals } from "@/utils/mock-inkd";

export default function Inkd() {
    const navigate = useNavigate();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const bgVideoRef = useRef<HTMLVideoElement | null>(null);
    const heroVideoRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsDrawerOpen(true);
        }, 300);

        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        bgVideoRef.current?.play().catch(() => { });
        heroVideoRef.current?.play().catch(() => { });
    }, []);

    return (
        <div className="relative h-screen w-full overflow-hidden bg-white">
            {/* Background plain screen */}
            <div className="absolute inset-0 z-0 flex items-center justify-center bg-white">
                <img
                    src={ink}
                    className="h-24 w-24 object-contain opacity-90"
                />
            </div>

            {/* Rising fullscreen drawer */}
            <div
                className={`absolute inset-x-0 bottom-0 z-10 h-screen rounded-t-[32px] bg-white shadow-2xl transition-transform duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] ${isDrawerOpen ? "translate-y-0" : "translate-y-[88%]"
                    }`}
            >
                <div className="relative h-full w-full overflow-y-auto rounded-t-[32px]">
                    <div className="relative min-h-screen bg-white">
                        {/* hero */}
                        <section className="relative z-10 px-1 pt-1">
                            <div className="relative min-h-[760px] overflow-hidden rounded-[30px] bg-[#f0f4f9]">
                                {/* nav */}
                                <header className="relative z-20 flex items-start justify-between px-5 pt-4 md:px-6 md:pt-5">
                                    <section className="flex flex-col gap-2">
                                        <button
                                            onClick={() => navigate(-1)}
                                            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/70 text-black backdrop-blur-md"
                                        >
                                            <ArrowLeft size={18} />
                                        </button>

                                        <img
                                            src={xpollSVG}
                                            alt="XPOLL"
                                            className="h-[54px] w-[42px] object-contain"
                                        />
                                    </section>

                                    <button className="rounded-full bg-white px-[26px] py-[10px] text-[20px] font-normal text-black">
                                        + Add new Signal AI
                                    </button>
                                </header>

                                {/* hero video plane */}
                                <div className="pointer-events-none absolute left-1/2 top-[-118px] z-[1] h-[812px] w-[1493px] -translate-x-1/2 overflow-hidden">
                                    <video
                                        ref={heroVideoRef}
                                        src={bg}
                                        autoPlay
                                        playsInline
                                        muted
                                        loop
                                        className="absolute inset-0 h-full w-full object-cover"
                                    />

                                    {/* side + top fade masks */}
                                    <div className="absolute inset-0 bg-[linear-gradient(90deg,#f0f4f9_8%,rgba(240,244,249,0)_22%),linear-gradient(-90deg,#f0f4f9_8%,rgba(240,244,249,0)_22%),linear-gradient(180deg,#f0f4f9_0%,rgba(240,244,249,0.32)_18%,rgba(240,244,249,0)_34%),linear-gradient(0deg,#f0f4f9_0%,rgba(240,244,249,0)_22%)]" />
                                </div>

                                {/* left purple light */}
                                <div className="pointer-events-none absolute left-[14%] top-[210px] z-[2] h-[420px] w-[420px] mix-blend-screen opacity-[0.72]">
                                    <div className="h-full w-full rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,rgba(177,108,255,0.85)_0%,rgba(177,108,255,0.32)_38%,rgba(177,108,255,0)_100%)] blur-[52px]" />
                                </div>

                                {/* right blue light */}
                                <div className="pointer-events-none absolute right-[12%] top-[230px] z-[2] h-[500px] w-[500px] mix-blend-screen opacity-[0.76]">
                                    <div className="h-full w-full rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,rgba(0,132,240,0.8)_0%,rgba(0,132,240,0.28)_40%,rgba(0,132,240,0)_100%)] blur-[58px]" />
                                </div>

                                {/* soft global wash */}
                                <div className="pointer-events-none absolute inset-0 z-[3] bg-[linear-gradient(180deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.06)_28%,rgba(255,255,255,0.02)_52%,rgba(255,255,255,0)_100%)]" />

                                {/* hero foreground */}
                                <div className="relative z-[5] flex min-h-[760px] flex-col items-center px-4 pb-6 pt-[347px]">
                                    <h1 className="mb-[18px] text-[43px] font-semibold leading-none tracking-[0.12em] text-black">
                                        INKD
                                    </h1>

                                    {/* input higher so slate top line remains visible */}
                                    <div className="w-full max-w-[766.978px]">
                                        <div className="rounded-[85px] border border-white/55 bg-[rgba(255,255,255,0.18)] px-[22px] py-[14px] shadow-[0_0_0_1px_rgba(255,255,255,0.16),0_10px_34px_rgba(114,125,213,0.14)] backdrop-blur-[18px]">
                                            <div className="flex items-center gap-[10px]">
                                                <div className="flex h-[25px] w-[21px] items-center justify-center text-[14px] text-[#727dd5]">
                                                    ✦
                                                </div>

                                                <input
                                                    placeholder="Ask INKD anything or type @ to command your shoal..."
                                                    className="min-w-0 flex-1 bg-transparent text-[15.464px] text-[rgba(0,0,0,0.45)] outline-none placeholder:text-[rgba(0,0,0,0.45)]"
                                                />

                                                <button className="flex h-[44px] w-[73px] items-center justify-center rounded-[999px] bg-[#727dd5] text-white shadow-[0_8px_20px_rgba(114,125,213,0.22)]">
                                                    ↑
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* chips */}
                                    <div className="mt-[34px] flex w-full max-w-[671.436px] flex-wrap items-start justify-center gap-x-[10.11px] gap-y-[10px] px-[26px]">
                                        {inkdSignals.slice(0, 6).map((item, index) => (
                                            <span
                                                key={`${item.slug}-${index}`}
                                                className="rounded-[211.179px] bg-[rgba(114,125,213,0.14)] px-[26.542px] py-[7.282px] text-[14.564px] text-[rgba(35,40,80,0.44)] backdrop-blur-[8px]"
                                            >
                                                {item.title}
                                            </span>
                                        ))}
                                    </div>

                                    {/* footer text inside hero */}
                                    <div className="mt-auto flex w-full items-end justify-between">
                                        <div className="text-[20.135px] font-bold uppercase text-black">
                                            XPOLL’S AI STUDIO
                                        </div>
                                        <div className="text-[20.135px] font-bold uppercase text-black">
                                            SCRAPE + DRAFT + PUBLISH
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* lower section */}
                        <div className="relative z-10 px-6 pb-14 pt-8 md:px-8">
                            <div className="text-center">
                                <h2 className="text-[26px] font-light tracking-[0.35em] text-[#7e7e7e]">
                                    YOUR{" "}
                                    <span className="font-semibold text-black">
                                        AI INTELLIGENCE
                                    </span>{" "}
                                    SHOAL
                                </h2>
                                <p className="mt-2 text-sm tracking-[0.2em] text-[#8c8c8c]">
                                    6 coins deployed
                                </p>
                            </div>

                            <div className="mt-12 grid w-full grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                                {inkdSignals.map((signal) => (
                                    <SignalCard key={signal.id} signal={signal} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}