import { useEffect, useRef } from "react";
import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
import { getRoleTour, hasSeenTour, markTourSeen, resetTourSeen } from "@/lib/tours";

/**
 * Runs the first-time guided tour for the current active role on
 * the dashboard route. Tours never auto-run twice; the user can
 * replay them from the Help menu via `startTour()`.
 */
export function GuidedTour() {
  const { activeRole, isMaintenance } = useAuth();
  const location = useLocation();
  const driverRef = useRef<Driver | null>(null);

  useEffect(() => {
    const role = activeRole ?? (isMaintenance ? "administrator" : undefined);
    if (!role) return;
    if (!location.pathname.startsWith("/dashboard") && location.pathname !== "/index") return;

    const tour = getRoleTour(role);
    if (!tour) return;
    if (hasSeenTour(tour.id)) return;

    const t = setTimeout(() => {
      const d = driver({
        showProgress: true,
        allowClose: true,
        smoothScroll: true,
        nextBtnText: "Next →",
        prevBtnText: "← Back",
        doneBtnText: "Got it",
        steps: tour.steps.map((s) => ({
          element: s.element,
          popover: {
            title: s.title,
            description: s.description,
            side: s.side,
          },
        })),
        onDestroyed: () => markTourSeen(tour.id),
      });
      driverRef.current = d;
      d.drive();
    }, 1200);

    return () => {
      clearTimeout(t);
      driverRef.current?.destroy();
    };
  }, [activeRole, isMaintenance, location.pathname]);

  return null;
}

/**
 * Imperatively start the tour for the active role. Used by the
 * Help menu "Replay tour" action.
 */
export function startTour(role: string) {
  const tour = getRoleTour(role);
  if (!tour) return;
  resetTourSeen(tour.id);
  const d = driver({
    showProgress: true,
    allowClose: true,
    smoothScroll: true,
    nextBtnText: "Next →",
    prevBtnText: "← Back",
    doneBtnText: "Got it",
    steps: tour.steps.map((s) => ({
      element: s.element,
      popover: { title: s.title, description: s.description, side: s.side },
    })),
    onDestroyed: () => markTourSeen(tour.id),
  });
  d.drive();
}