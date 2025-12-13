import React from "react";

export default function MessageBubble({ role, text }) {
  return (
    <div className={`bubble ${role}`}>
      <p>{text}</p>
    </div>
  );
}
