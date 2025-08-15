import React from "react";
import { useFortyHz } from "@/features/audio/useFortyHz";

export const FortyHzButton: React.FC = () => {
  const { isOn, toggle } = useFortyHz();

  return (
    <button
      onClick={toggle}
      aria-pressed={isOn}
      title="40 Hz overlay (plays over music)"
      className={[
        "w-11 h-11 rounded-xl inline-flex items-center justify-center",
        "border",
        // Off state
        !isOn && [
          "bg-gradient-to-r from-indigo-500/10 to-purple-500/10",
          "border-indigo-400/30",
          "text-indigo-300"
        ].join(" "),
        // On state — stronger purple feedback
        isOn && [
          "bg-gradient-to-r from-indigo-600/40 to-purple-600/40",
          "border-indigo-300",
          "text-indigo-50",
          "shadow-lg shadow-indigo-500/30",
          "ring-1 ring-inset ring-indigo-400/50"
        ].join(" "),
        "text-[13px] font-semibold tabular-nums",
        "transition-all duration-200",
        "hover:border-indigo-300/60 hover:shadow-lg hover:shadow-indigo-500/25",
        "focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
      ].join(" ")}
    >
      40
    </button>
  );
};
