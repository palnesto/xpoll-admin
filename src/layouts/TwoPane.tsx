import { ReactNode, useRef, useState, useEffect } from "react";

type TwoPaneProps = {
  left: ReactNode;
  right?: ReactNode;
  isRightOpen: boolean;
  rightWidth?: string;
  className?: string;
  leftClassName?: string;
  rightClassName?: string;
};

export default function TwoPane({
  left,
  right,
  isRightOpen,
  rightWidth = "33.3333%",
  className = "",
  leftClassName = "",
  rightClassName = "",
}: TwoPaneProps) {
  const rightRef = useRef<HTMLDivElement | null>(null);
  const [rightDivWidth, setRightDivWidth] = useState<number>(0);

  useEffect(() => {
    if (!rightRef.current) return;

    const updateWidth = () => {
      if (rightRef.current) {
        setRightDivWidth(rightRef.current.offsetWidth);
      }
    };

    updateWidth(); // initial measure

    const observer = new ResizeObserver(updateWidth);
    observer.observe(rightRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      className={`flex w-full gap-5 transition-all duration-500 ${className}`}
    >
      {/* Left: auto expands when right is closed */}
      <div className={`flex-1 transition-all duration-500 ${leftClassName}`}>
        {left}
      </div>

      {/* Right wrapper (always mounted, animates width) */}
      <div
        ref={rightRef}
        className={`relative overflow-hidden transition-all duration-500 ml-10 ${rightClassName}`}
        style={{
          flex: isRightOpen ? `0 0 ${rightWidth}` : "0 0 0px",
        }}
      >
        <div
          style={{
            width: isRightOpen ? rightDivWidth : 0,
            transition: "width",
            transitionDuration: isRightOpen ? "0s" : "0.5s",
          }}
          className="fixed top-[14dvh] right-[4dvw] h-[84dvh] max-w-[84dvh] overflow-y-auto rounded-xl bg-zinc-900 py-4"
        >
          {isRightOpen && right}
        </div>
      </div>
    </div>
  );
}
