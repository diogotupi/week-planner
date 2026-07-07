import { createContext, useContext } from 'react';
import type { WeekViewMode } from '../types';
import { DEFAULT_USER_PREFERENCES } from '../types';

const PlannerSettingsContext = createContext<WeekViewMode>(
  DEFAULT_USER_PREFERENCES.weekViewMode,
);

export function PlannerSettingsProvider({
  weekViewMode,
  children,
}: {
  weekViewMode: WeekViewMode;
  children: React.ReactNode;
}) {
  return (
    <PlannerSettingsContext.Provider value={weekViewMode}>
      {children}
    </PlannerSettingsContext.Provider>
  );
}

export function useWeekViewMode() {
  return useContext(PlannerSettingsContext);
}
