import { useEffect, useRef } from "react";
import gsap from "gsap";

export function useGsapFadeUp(delay = 0) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ref.current,
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.6, delay, ease: "power3.out" }
      );
    });
    return () => ctx.revert();
  }, [delay]);
  return ref;
}

export function useGsapStagger(selector = ".gsap-card", delay = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const ctx = gsap.context(() => {
      const els = ref.current?.querySelectorAll(selector);
      if (els && els.length > 0) {
        gsap.fromTo(
          els,
          { opacity: 0, y: 20, scale: 0.97 },
          { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: delay, ease: "power2.out" }
        );
      }
    });
    return () => ctx.revert();
  }, [selector, delay]);
  return ref;
}

export function useGsapCounter(target: number, duration = 1.5) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const ctx = gsap.context(() => {
      const obj = { val: 0 };
      gsap.to(obj, {
        val: target,
        duration,
        ease: "power2.out",
        onUpdate: () => {
          if (ref.current) ref.current.textContent = Math.round(obj.val).toLocaleString();
        },
      });
    });
    return () => ctx.revert();
  }, [target, duration]);
  return ref;
}

export function useGsapAnimation(_type: string = "slideUp", delay = 0) {
  return useGsapFadeUp(delay);
}
