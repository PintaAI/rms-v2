"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface TourContextType {
  tourRunning: boolean;
  startTour: () => void;
  stopTour: () => void;
  restartTour: () => void;
}

const TourContext = createContext<TourContextType | null>(null);

const TOUR_COMPLETED_KEY = "tour_completed";

export function TourProvider({ children }: { children: ReactNode }) {
  const [tourRunning, setTourRunning] = useState(false);

  const startTour = useCallback(() => {
    setTourRunning(true);
  }, []);

  const stopTour = useCallback(() => {
    localStorage.setItem(TOUR_COMPLETED_KEY, "true");
    setTourRunning(false);
  }, []);

  const restartTour = useCallback(() => {
    localStorage.removeItem(TOUR_COMPLETED_KEY);
    setTourRunning(true);
  }, []);

  return (
    <TourContext.Provider value={{ tourRunning, startTour, stopTour, restartTour }}>
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error("useTour must be used within a TourProvider");
  }
  return context;
}