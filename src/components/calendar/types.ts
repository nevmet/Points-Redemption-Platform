export type CalendarEventLevel = "Danger" | "Success" | "Primary" | "Warning";

export interface CalendarEvent {
  id: string;
  title: string;
  start: string | Date;
  end?: string | Date;
  allDay?: boolean;
  extendedProps: {
    calendar: string;
    titleKey?: string;
  };
}

export interface CalendarViewOption {
  key: string;
  labelKey: string;
}

export interface EventFormData {
  title: string;
  start: string;
  end: string;
  level: string;
}

export const CALENDAR_EVENT_LEVELS: Record<CalendarEventLevel, string> = {
  Danger: "danger",
  Success: "success",
  Primary: "primary",
  Warning: "warning",
};

export const CALENDAR_VIEW_OPTIONS: CalendarViewOption[] = [
  { key: "multiMonthYear", labelKey: "calendar.views.year" },
  { key: "dayGridMonth", labelKey: "calendar.views.month" },
  { key: "timeGridWeek", labelKey: "calendar.views.week" },
  { key: "timeGridDay", labelKey: "calendar.views.day" },
];

