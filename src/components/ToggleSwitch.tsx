import React from "react";

function ToggleSwitchInner({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="relative flex-shrink-0"
      style={{ width: 51, height: 31, borderRadius: 31 }}
    >
      <div
        className="absolute inset-0 rounded-full transition-colors duration-300"
        style={{ background: on ? "hsl(162 100% 33%)" : "hsl(0 0% 23%)" }}
      />
      <div
        className="absolute rounded-full bg-white"
        style={{
          top: 2,
          left: 2,
          width: 27,
          height: 27,
          boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
          transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          transform: on ? "translateX(20px)" : "translateX(0px)",
        }}
      />
    </button>
  );
}

const ToggleSwitch = React.memo(ToggleSwitchInner);
export default ToggleSwitch;
