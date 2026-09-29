"use client";

import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { Banknote, CarTaxiFront, FileSignature, LoaderCircle, Sparkles, TrainFront } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LangToggle } from "@/components/lang-toggle";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/client/api";
import { useApp } from "@/lib/client/store";
import { useT, type DictKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const SLIDES: { icon: typeof TrainFront; accent: typeof TrainFront; title: DictKey; body: DictKey }[] = [
  { icon: TrainFront, accent: CarTaxiFront, title: "welcome.1.title", body: "welcome.1.body" },
  { icon: Banknote, accent: CarTaxiFront, title: "welcome.2.title", body: "welcome.2.body" },
  { icon: FileSignature, accent: Sparkles, title: "welcome.3.title", body: "welcome.3.body" },
];

/**
 * Functions of `custom`, so a slide that is already leaving still gets the latest direction from
 * AnimatePresence (a plain `exit` object would keep the direction it was rendered with).
 */
const slideVariants = {
  enter: (direction: number) => ({ x: direction >= 0 ? 280 : -280, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction >= 0 ? -280 : 280, opacity: 0 }),
};

export default function WelcomeScreen() {
  const t = useT();
  const router = useRouter();
  const setUserId = useApp((s) => s.setUserId);
  const resetFlow = useApp((s) => s.resetFlow);
  const [[index, direction], setIndex] = useState<[number, number]>([0, 0]);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(false);

  const go = (next: number) => {
    if (next < 0 || next >= SLIDES.length) return;
    setIndex([next, next > index ? 1 : -1]);
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60 || info.velocity.x < -400) go(index + 1);
    else if (info.offset.x > 60 || info.velocity.x > 400) go(index - 1);
  };

  const startDemo = async () => {
    setStarting(true);
    setError(false);
    try {
      const { userId } = await api.startDemo();
      resetFlow();
      setUserId(userId);
      useApp.getState().setLocation("t-centralen");
      router.push("/app/home");
    } catch {
      setError(true);
      setStarting(false);
    }
  };

  const slide = SLIDES[index];
  const last = index === SLIDES.length - 1;

  return (
    <div className="flex flex-1 flex-col px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
      <div className="flex items-center justify-between">
        <span className="text-xl font-bold tracking-tight text-primary">{t("app.name")}</span>
        <LangToggle />
      </div>

      <section
        aria-roledescription="carousel"
        aria-label={t("app.tagline")}
        className="relative flex flex-1 items-center overflow-hidden"
      >
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={index}
            custom={direction}
            role="group"
            aria-roledescription="slide"
            aria-label={t("welcome.slide", { n: index + 1, total: SLIDES.length })}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.6}
            onDragEnd={onDragEnd}
            className="flex w-full cursor-grab flex-col gap-6 active:cursor-grabbing"
          >
            <div className="relative mx-auto flex size-40 items-center justify-center rounded-[2.5rem] bg-primary-soft">
              <slide.icon className="size-20 text-primary" strokeWidth={1.5} aria-hidden />
              <div className="absolute -bottom-3 -right-3 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
                <slide.accent className="size-7" aria-hidden />
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <h1 className="text-3xl font-bold leading-tight tracking-tight">{t(slide.title)}</h1>
              <p className="text-lg text-muted-foreground">{t(slide.body)}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </section>

      <div className="mb-6 flex justify-center gap-2">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => go(i)}
            aria-label={t("welcome.slide", { n: i + 1, total: SLIDES.length })}
            aria-current={i === index}
            className="flex size-6 items-center justify-center"
          >
            <span className={cn("h-2 rounded-full transition-all", i === index ? "w-6 bg-primary" : "w-2 bg-input")} />
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {last ? (
          <Button size="lg" onClick={() => router.push("/app/onboarding/bankid")}>
            {t("welcome.getStarted")}
          </Button>
        ) : (
          <Button size="lg" onClick={() => go(index + 1)}>
            {t("welcome.next")}
          </Button>
        )}
        <Button variant="outline" size="lg" onClick={startDemo} disabled={starting}>
          {starting ? <LoaderCircle className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}
          {t("demo.start")}
        </Button>
        <p className={cn("text-center text-xs", error ? "text-danger" : "text-muted-foreground")} role={error ? "alert" : undefined}>
          {error ? t("common.error") : t("demo.startHint")}
        </p>
      </div>
    </div>
  );
}
