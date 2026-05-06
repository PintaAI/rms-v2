"use client";

import React, { useRef, useState } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { cn } from "@/lib/utils";
import {
  RiMoonLine,
  RiSearchLine,
  RiMicLine,
  RiVolumeUpLine,
  RiVolumeDownLine,
  RiVolumeMuteLine,
  RiArrowUpSLine,
  RiArrowDownSLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
} from "@remixicon/react";
import Image from "next/image";

export const MacbookScroll = ({
  src,
  showGradient,
  title,
  badge,
}: {
  src?: string;
  showGradient?: boolean;
  title?: string | React.ReactNode;
  badge?: React.ReactNode;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const [isMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);

  const scaleX = useTransform(
    scrollYProgress,
    [0, 0.3],
    [1.2, isMobile ? 1 : 1.5]
  );
  const scaleY = useTransform(
    scrollYProgress,
    [0, 0.3],
    [0.6, isMobile ? 1 : 1.5]
  );
  const translate = useTransform(scrollYProgress, [0, 1], [0, 1500]);
  const rotate = useTransform(scrollYProgress, [0.1, 0.12, 0.3], [-28, -28, 0]);
  const textTransform = useTransform(scrollYProgress, [0, 0.3], [0, 100]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  return (
    <div
      ref={ref}
      className="flex min-h-[200vh] shrink-0 scale-[0.35] transform flex-col items-center justify-start py-0 [perspective:800px] sm:scale-50 md:scale-100 md:py-80"
    >
      <motion.h2
        style={{
          translateY: textTransform,
          opacity: textOpacity,
        }}
        className="mb-20 text-center text-3xl font-bold text-neutral-800 dark:text-white"
      >
        {title || (
          <span>
            This Macbook is built with Tailwindcss. <br /> No kidding.
          </span>
        )}
      </motion.h2>
      <Lid
        src={src}
        scaleX={scaleX}
        scaleY={scaleY}
        rotate={rotate}
        translate={translate}
      />
      <div className="relative -z-10 h-[22rem] w-[32rem] overflow-hidden rounded-2xl bg-gray-200 dark:bg-[#272729]">
        <div className="relative h-10 w-full">
          <div className="absolute inset-x-0 mx-auto h-4 w-[80%] bg-[#050505]" />
        </div>
        <div className="relative flex">
          <div className="mx-auto h-full w-[10%] overflow-hidden">
            <SpeakerGrid />
          </div>
          <div className="mx-auto h-full w-[80%]">
            <Keypad />
          </div>
          <div className="mx-auto h-full w-[10%] overflow-hidden">
            <SpeakerGrid />
          </div>
        </div>
        <Trackpad />
        <div className="absolute inset-x-0 bottom-0 mx-auto h-2 w-20 rounded-tl-3xl rounded-tr-3xl bg-gradient-to-t from-[#272729] to-[#050505]" />
        {showGradient && (
          <div className="absolute inset-x-0 bottom-0 z-50 h-40 w-full bg-gradient-to-t from-white via-white to-transparent dark:from-black dark:via-black" />
        )}
        {badge && <div className="absolute bottom-4 left-4">{badge}</div>}
      </div>
    </div>
  );
};

export const Lid = ({
  scaleX,
  scaleY,
  rotate,
  translate,
  src,
}: {
  scaleX: MotionValue<number>;
  scaleY: MotionValue<number>;
  rotate: MotionValue<number>;
  translate: MotionValue<number>;
  src?: string;
}) => (
  <div className="relative [perspective:800px]">
    <div
      style={{
        transform: "perspective(800px) rotateX(-25deg) translateZ(0px)",
        transformOrigin: "bottom",
        transformStyle: "preserve-3d",
      }}
      className="relative h-[12rem] w-[32rem] rounded-2xl bg-[#010101] p-2"
    >
      <div
        style={{
          boxShadow: "0px 2px 0px 2px #171717 inset",
        }}
        className="absolute inset-0 flex items-center justify-center rounded-lg bg-[#010101]"
      >
        <span className="text-xs font-semibold tracking-widest text-neutral-600">RMS</span>
      </div>
    </div>
    <motion.div
      style={{
        scaleX: scaleX,
        scaleY: scaleY,
        rotateX: rotate,
        translateY: translate,
        transformStyle: "preserve-3d",
        transformOrigin: "top",
      }}
      className="absolute inset-0 h-96 w-[32rem] rounded-2xl bg-[#010101] p-2"
    >
      <div className="absolute inset-0 rounded-lg bg-[#272729]" />
      {src ? (
        <Image
          src={src}
          alt="RMS Dashboard"
          fill
          priority
          sizes="(max-width: 768px) 80vw, 512px"
          className="rounded-lg object-cover object-left-top"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460]">
          <DashboardPlaceholder />
        </div>
      )}
    </motion.div>
  </div>
);

function DashboardPlaceholder() {
  return (
    <div className="flex h-full w-full flex-col gap-2 p-4 pt-6">
      <div className="flex items-center justify-between">
        <div className="h-5 w-24 rounded bg-white/10" />
        <div className="h-5 w-16 rounded-full bg-white/10" />
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-white/5 p-3">
          <div className="h-3 w-12 rounded bg-white/10" />
          <div className="mt-2 h-6 w-16 rounded bg-white/20" />
        </div>
        <div className="rounded-xl bg-white/5 p-3">
          <div className="h-3 w-12 rounded bg-white/10" />
          <div className="mt-2 h-6 w-16 rounded bg-white/20" />
        </div>
        <div className="rounded-xl bg-white/5 p-3">
          <div className="h-3 w-12 rounded bg-white/10" />
          <div className="mt-2 h-6 w-16 rounded bg-white/20" />
        </div>
      </div>
      <div className="mt-2 flex flex-1 gap-2">
        <div className="flex-1 rounded-xl bg-white/5 p-3">
          <div className="h-3 w-16 rounded bg-white/10" />
          <div className="mt-3 flex flex-col gap-2">
            <div className="h-4 w-full rounded bg-white/10" />
            <div className="h-4 w-3/4 rounded bg-white/10" />
            <div className="h-4 w-5/6 rounded bg-white/10" />
          </div>
        </div>
        <div className="flex-1 rounded-xl bg-white/5 p-3">
          <div className="h-3 w-12 rounded bg-white/10" />
          <div className="mt-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full bg-emerald-500/30" />
              <div className="h-4 w-20 rounded bg-white/10" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full bg-amber-500/30" />
              <div className="h-4 w-16 rounded bg-white/10" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full bg-blue-500/30" />
              <div className="h-4 w-24 rounded bg-white/10" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const Trackpad = () => (
  <div
    className="mx-auto my-1 h-32 w-[40%] rounded-xl"
    style={{
      boxShadow: "0px 0px 1px 1px #00000020 inset",
    }}
  />
);

export const Keypad = () => (
  <div className="mx-1 h-full rounded-md bg-[#050505] p-1 [transform:translateZ(0)] [will-change:transform]">
    <div className="mb-[2px] flex w-full shrink-0 gap-[2px]">
      <KBtn className="w-10 items-end justify-start pb-[2px] pl-[4px]" childrenClassName="items-start">esc</KBtn>
      <KBtn><span className="mt-1 inline-block">F1</span></KBtn>
      <KBtn><span className="mt-1 inline-block">F2</span></KBtn>
      <KBtn><span className="mt-1 inline-block">F3</span></KBtn>
      <KBtn><span className="mt-1 inline-block">F4</span></KBtn>
      <KBtn><span className="mt-1 inline-block">F5</span></KBtn>
      <KBtn><RiMoonLine className="h-[6px] w-[6px]" /><span className="mt-1 inline-block">F6</span></KBtn>
      <KBtn><span className="mt-1 inline-block">F7</span></KBtn>
      <KBtn><span className="mt-1 inline-block">F8</span></KBtn>
      <KBtn><span className="mt-1 inline-block">F9</span></KBtn>
      <KBtn><span className="mt-1 inline-block">F10</span></KBtn>
      <KBtn><span className="mt-1 inline-block">F11</span></KBtn>
      <KBtn><span className="mt-1 inline-block">F12</span></KBtn>
      <KBtn><div className="h-4 w-4 rounded-full bg-gradient-to-b from-neutral-900 from-20% via-black via-50% to-neutral-900 to-95% p-px"><div className="h-full w-full rounded-full bg-black" /></div></KBtn>
    </div>
    <div className="mb-[2px] flex w-full shrink-0 gap-[2px]">
      <KBtn><span className="block">~</span><span className="mt-1 block">`</span></KBtn>
      <KBtn><span className="block">!</span><span className="block">1</span></KBtn>
      <KBtn><span className="block">@</span><span className="block">2</span></KBtn>
      <KBtn><span className="block">#</span><span className="block">3</span></KBtn>
      <KBtn><span className="block">$</span><span className="block">4</span></KBtn>
      <KBtn><span className="block">%</span><span className="block">5</span></KBtn>
      <KBtn><span className="block">^</span><span className="block">6</span></KBtn>
      <KBtn><span className="block">&</span><span className="block">7</span></KBtn>
      <KBtn><span className="block">*</span><span className="block">8</span></KBtn>
      <KBtn><span className="block">(</span><span className="block">9</span></KBtn>
      <KBtn><span className="block">)</span><span className="block">0</span></KBtn>
      <KBtn><span className="block">&mdash;</span><span className="block">_</span></KBtn>
      <KBtn><span className="block">+</span><span className="block"> = </span></KBtn>
      <KBtn className="w-10 items-end justify-end pr-[4px] pb-[2px]" childrenClassName="items-end">delete</KBtn>
    </div>
    <div className="mb-[2px] flex w-full shrink-0 gap-[2px]">
      <KBtn className="w-10 items-end justify-start pb-[2px] pl-[4px]" childrenClassName="items-start">tab</KBtn>
      {["Q","W","E","R","T","Y","U","I","O","P"].map((k) => <KBtn key={k}><span className="block">{k}</span></KBtn>)}
      <KBtn><span className="block">{`{`}</span><span className="block">{`[`}</span></KBtn>
      <KBtn><span className="block">{`}`}</span><span className="block">{`]`}</span></KBtn>
      <KBtn><span className="block">|</span><span className="block">\</span></KBtn>
    </div>
    <div className="mb-[2px] flex w-full shrink-0 gap-[2px]">
      <KBtn className="w-[2.8rem] items-end justify-start pb-[2px] pl-[4px]" childrenClassName="items-start">caps lock</KBtn>
      {["A","S","D","F","G","H","J","K","L"].map((k) => <KBtn key={k}><span className="block">{k}</span></KBtn>)}
      <KBtn><span className="block">:</span><span className="block">;</span></KBtn>
      <KBtn><span className="block">&quot;</span><span className="block">&apos;</span></KBtn>
      <KBtn className="w-[2.85rem] items-end justify-end pr-[4px] pb-[2px]" childrenClassName="items-end">return</KBtn>
    </div>
    <div className="mb-[2px] flex w-full shrink-0 gap-[2px]">
      <KBtn className="w-[3.65rem] items-end justify-start pb-[2px] pl-[4px]" childrenClassName="items-start">shift</KBtn>
      {["Z","X","C","V","B","N","M"].map((k) => <KBtn key={k}><span className="block">{k}</span></KBtn>)}
      <KBtn><span className="block">&lt;</span><span className="block">,</span></KBtn>
      <KBtn><span className="block">&gt;</span><span className="block">.</span></KBtn>
      <KBtn><span className="block">?</span><span className="block">/</span></KBtn>
      <KBtn className="w-[3.65rem] items-end justify-end pr-[4px] pb-[2px]" childrenClassName="items-end">shift</KBtn>
    </div>
    <div className="mb-[2px] flex w-full shrink-0 gap-[2px]">
      <KBtn childrenClassName="h-full justify-between py-[4px]">
        <div className="flex w-full justify-end pr-1"><span className="block">fn</span></div>
        <div className="flex w-full justify-start pl-1"><RiSearchLine className="h-[6px] w-[6px]" /></div>
      </KBtn>
      <KBtn childrenClassName="h-full justify-between py-[4px]">
        <div className="flex w-full justify-end pr-1"><RiArrowUpSLine className="h-[6px] w-[6px]" /></div>
        <div className="flex w-full justify-start pl-1"><span className="block">control</span></div>
      </KBtn>
      <KBtn childrenClassName="h-full justify-between py-[4px]">
        <div className="flex w-full justify-end pr-1"><OptionKey className="h-[6px] w-[6px]" /></div>
        <div className="flex w-full justify-start pl-1"><span className="block">option</span></div>
      </KBtn>
      <KBtn className="w-8" childrenClassName="h-full justify-between py-[4px]">
        <div className="flex w-full justify-end pr-1"><CmdKey className="h-[6px] w-[6px]" /></div>
        <div className="flex w-full justify-start pl-1"><span className="block">cmd</span></div>
      </KBtn>
      <KBtn className="w-[8.2rem]" />
      <KBtn className="w-8" childrenClassName="h-full justify-between py-[4px]">
        <div className="flex w-full justify-start pl-1"><CmdKey className="h-[6px] w-[6px]" /></div>
        <div className="flex w-full justify-start pl-1"><span className="block">cmd</span></div>
      </KBtn>
      <KBtn childrenClassName="h-full justify-between py-[4px]">
        <div className="flex w-full justify-start pl-1"><OptionKey className="h-[6px] w-[6px]" /></div>
        <div className="flex w-full justify-start pl-1"><span className="block">option</span></div>
      </KBtn>
      <div className="mt-[2px] flex h-6 w-[4.9rem] flex-col items-center justify-end rounded-[4px] p-[0.5px]">
        <KBtn className="h-3 w-6"><RiArrowUpSLine className="h-[6px] w-[6px]" /></KBtn>
        <div className="flex">
          <KBtn className="h-3 w-6"><RiArrowLeftSLine className="h-[6px] w-[6px]" /></KBtn>
          <KBtn className="h-3 w-6"><RiArrowDownSLine className="h-[6px] w-[6px]" /></KBtn>
          <KBtn className="h-3 w-6"><RiArrowRightSLine className="h-[6px] w-[6px]" /></KBtn>
        </div>
      </div>
    </div>
  </div>
);

export const KBtn = ({
  className,
  children,
  childrenClassName,
  backlit = true,
}: {
  className?: string;
  children?: React.ReactNode;
  childrenClassName?: string;
  backlit?: boolean;
}) => (
  <div
    className={cn(
      "rounded-[4px] p-[0.5px] [transform:translateZ(0)] [will-change:transform]",
      backlit && "bg-white/[0.2] shadow-xl shadow-white"
    )}
  >
    <div
      className={cn(
        "flex h-6 w-6 items-center justify-center rounded-[3.5px] bg-[#0A090D]",
        className
      )}
      style={{
        boxShadow:
          "0px -0.5px 2px 0 #0D0D0F inset, -0.5px 0px 2px 0 #0D0D0F inset",
      }}
    >
      <div
        className={cn(
          "flex w-full flex-col items-center justify-center text-[5px] text-neutral-200",
          childrenClassName,
          backlit && "text-white"
        )}
      >
        {children}
      </div>
    </div>
  </div>
);

export const SpeakerGrid = () => (
  <div
    className="mt-2 flex h-40 gap-[2px] px-[0.5px]"
    style={{
      backgroundImage:
        "radial-gradient(circle, #08080A 0.5px, transparent 0.5px)",
      backgroundSize: "3px 3px",
    }}
  />
);

export const OptionKey = ({ className }: { className: string }) => (
  <svg
    fill="none"
    version="1.1"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 32 32"
    className={className}
  >
    <rect stroke="currentColor" strokeWidth={2} x="18" y="5" width="10" height="2" />
    <polygon stroke="currentColor" strokeWidth={2} points="10.6,5 4,5 4,7 9.4,7 18.4,27 28,27 28,25 19.6,25" />
    <rect width="32" height="32" stroke="none" />
  </svg>
);

const CmdKey = ({ className }: { className: string }) => (
  <svg
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 32 32"
    className={className}
  >
    <path
      d="M9.6 11.2C9.6 9.43269 11.0327 8 12.8 8C14.5673 8 16 9.43269 16 11.2V12.8H20.8V11.2C20.8 9.43269 22.2327 8 24 8C25.7673 8 27.2 9.43269 27.2 11.2C27.2 12.9673 25.7673 14.4 24 14.4H22.4V17.6H24C25.7673 17.6 27.2 19.0327 27.2 20.8C27.2 22.5673 25.7673 24 24 24C22.2327 24 20.8 22.5673 20.8 20.8V19.2H16V20.8C16 22.5673 14.5673 24 12.8 24C11.0327 24 9.6 22.5673 9.6 20.8C9.6 19.0327 11.0327 17.6 12.8 17.6H14.4V14.4H12.8C11.0327 14.4 9.6 12.9673 9.6 11.2Z"
      stroke="currentColor"
      strokeWidth={2}
    />
    <rect width="32" height="32" stroke="none" />
  </svg>
);
