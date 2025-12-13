import React, { useState } from "react";

export default function InputBox({ onSend }) {
  const [msg, setMsg] = useState("");

  const send = () => {
    if (msg.trim().length === 0) return;
    onSend(msg);
    setMsg("");
  };

  return (
    <div className="input-box">
      <input
        value={msg}
        placeholder="Ask something..."
        onChange={(e) => setMsg(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && send()}
      />

      <button onClick={send}>Send</button>
    </div>
  );
}
