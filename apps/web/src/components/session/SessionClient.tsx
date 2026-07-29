"use client";
// Active study session — timer, checklist, AI coach, active recall
// Reference: StudyAI.jsx → screen==="session"
import { useTimer } from "@/lib/hooks/useTimer";

export function SessionClient() {
  const timer = useTimer(45 * 60);

  return (
    <div className="p-6">
      {/* 
        TODO: implement focus mode overlay
        TODO: implement gradient SVG ring (url(#rg) gradient)
        TODO: keyboard shortcuts (Space, F, →, Esc)
        TODO: celebration overlay on complete
        Reference: StudyAI.jsx → screen==="session"
      */}
      <div className="text-4xl font-mono font-light text-txt">
        {timer.fmt(timer.seconds)}
      </div>
      <button onClick={timer.toggle} className="mt-4 px-6 py-3 bg-primary text-white rounded-xl">
        {timer.running ? "⏸ Pausar" : "▶ Iniciar"}
      </button>
    </div>
  );
}
