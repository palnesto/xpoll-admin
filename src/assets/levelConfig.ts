import explorerImg from "@/assets/levels/explorer.png";
import settlerImg from "@/assets/levels/settler.png";
import participantImg from "@/assets/levels/participant.png";
import contributorImg from "@/assets/levels/contributor.png";
import advocateImg from "@/assets/levels/advocate.png";
import guardianImg from "@/assets/levels/guardian.png";
import builderImg from "@/assets/levels/builder.png";
import strategistImg from "@/assets/levels/strategist.png";
import visionaryImg from "@/assets/levels/visionary.png";
import legendImg from "@/assets/levels/legend.png";
import explorerBg from "@/assets/levels/bg1.png";
import settlerBg from "@/assets/levels/bg2.png";
import participantBg from "@/assets/levels/bg3.png";
import contributorBg from "@/assets/levels/bg4.png";
import advocateBg from "@/assets/levels/bg5.png";
import guardianBg from "@/assets/levels/bg6.png";
import builderBg from "@/assets/levels/bg7.png";
import strategistBg from "@/assets/levels/bg8.png";
import visionaryBg from "@/assets/levels/bg9.png";
import legendBg from "@/assets/levels/bg10.png";

export type Level = {
  id: number;
  title: string;
  points: number;
  image: string;
  bg: string;
  desc: string;
  isHidden?: boolean;
};

export const LEVELS: Level[] = [
  {
    id: 1,
    title: "Explorer",
    points: 0,
    image: explorerImg,
    bg: explorerBg,
    desc: "You’ve taken your first steps, setting out with curiosity to discover civic life.",
  },
  {
    id: 2,
    title: "Settler",
    points: 100,
    image: settlerImg,
    bg: settlerBg,
    desc: "You’re building roots, observing carefully, and laying down early foundations.",
  },
  {
    id: 3,
    title: "Participant",
    points: 200,
    image: participantImg,
    bg: participantBg,
    desc: "You’ve moved from watching to acting, casting your voice into the collective.",
  },
  {
    id: 4,
    title: "Contributor",
    points: 300,
    image: contributorImg,
    bg: contributorBg,
    desc: "You’re adding your own questions and ideas, helping shape the civic conversation.",
  },
  {
    id: 5,
    title: "Advocate",
    points: 400,
    image: advocateImg,
    bg: advocateBg,
    desc: "You’re speaking out with passion, rallying others and amplifying community voices.",
  },
  {
    id: 6,
    title: "Guardian",
    points: 500,
    image: guardianImg,
    bg: guardianBg,
    desc: "You stand firm for fairness, defending values and safeguarding the integrity of engagement",
  },
  {
    id: 7,
    title: "Builder",
    points: 600,
    image: builderImg,
    bg: builderBg,
    desc: "You’ve mastered the foundations and are now shaping bigger structures.",
  }, // current
  {
    id: 8,
    title: "Strategist",
    points: 700,
    image: strategistImg,
    bg: strategistBg,
    desc: "You’re thinking several moves ahead, guiding civic energy with foresight and precision.",
  },
  {
    id: 9,
    title: "Visionary",
    points: 800,
    image: visionaryImg,
    bg: visionaryBg,
    desc: "You’re inspiring others with vision, illuminating the path toward greater possibilities.",
  },
  {
    id: 10,
    title: "Legend",
    points: 900,
    image: legendImg,
    bg: legendBg,
    desc: "You’ve become a symbol of civic excellence, leaving a lasting legacy for others to follow.",
  },
  {
    id: 11,
    title: "Legend",
    points: 900,
    image: legendImg,
    bg: legendBg,
    desc: "You’ve become a symbol of civic excellence, leaving a lasting legacy for others to follow.",
    isHidden: true,
  },
];
