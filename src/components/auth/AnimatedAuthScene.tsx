import { useEffect, useRef } from "react";

export type AuthInteraction = {
  focus: "none" | "text" | "password";
  revealed: boolean;
  status: "idle" | "error" | "success";
};
export type AuthInteractionHandler = (change: Partial<AuthInteraction>) => void;

/** Decorative characters receive interaction states only, never field values. */
export default function AnimatedAuthScene({ interaction }: { interaction: AuthInteraction }) {
  const scene = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = scene.current;
    if (!element) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const track = (event: PointerEvent) => {
      if (motion.matches || event.pointerType !== "mouse") return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const bounds = element.getBoundingClientRect();
        if (!bounds.width) return;
        const x = Math.max(-1, Math.min(1, (event.clientX - bounds.left - bounds.width / 2) / 360));
        const y = Math.max(-1, Math.min(1, (event.clientY - bounds.top - bounds.height / 2) / 360));
        element.style.setProperty("--auth-look-x", `${x * 5}px`);
        element.style.setProperty("--auth-look-y", `${y * 5}px`);
        element.style.setProperty("--auth-lean", `${-x * 4}deg`);
      });
    };
    const reset = () => {
      cancelAnimationFrame(frame);
      element.style.removeProperty("--auth-look-x");
      element.style.removeProperty("--auth-look-y");
      element.style.removeProperty("--auth-lean");
    };
    window.addEventListener("pointermove", track, { passive: true });
    window.addEventListener("blur", reset);
    motion.addEventListener("change", reset);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", track);
      window.removeEventListener("blur", reset);
      motion.removeEventListener("change", reset);
    };
  }, []);
  const pose = interaction.status !== "idle" ? interaction.status : interaction.revealed ? "revealed" : interaction.focus === "password" ? "away" : interaction.focus === "text" ? "typing" : "idle";
  return <div ref={scene} className="auth-scene" data-pose={pose} aria-hidden="true">
    {(["purple", "black", "orange", "yellow"] as const).map(color => <div key={color} className={`auth-character auth-character-${color}`}>
      <div className="auth-face">
        <div className="auth-eyes">{[0, 1].map(eye => <span className="auth-eye" key={eye}><span className="auth-pupil" /></span>)}</div>
        {(color === "orange" || color === "yellow") && <span className="auth-mouth" />}
      </div>
    </div>)}
  </div>;
}
