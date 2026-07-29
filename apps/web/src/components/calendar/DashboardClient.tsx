"use client";
// Main dashboard — calendar grid + AI panel
// Wraps the full prototype logic with real data from the local API
// TODO: replace INIT_DISCS with useCalendar() hook fetching from API

export function DashboardClient() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* 
        TODO: integrate useCalendar hook
        TODO: integrate useAI hook  
        TODO: connect CalendarGrid component
        Reference implementation: /mnt/user-data/outputs/StudyAI.jsx → screen==="dashboard" 
      */}
      <div className="p-4 text-sm text-muted">
        DashboardClient — conectar hooks e componentes do protótipo
      </div>
    </div>
  );
}
