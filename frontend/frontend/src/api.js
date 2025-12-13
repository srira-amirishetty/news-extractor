import axios from "axios";

const API_URL = "http://localhost:3000"; // your backend

// Create axios instance (recommended)
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export async function createSession() {
  console.log("create session client trigger");
  const res = await api.post("/session");
  console.log(res.data)
  return res.data;
}

export async function sendMessage(sessionId, message) {
    console.log({sessionId,message})
  const res = await api.post(`/session/${sessionId}/chat`, {
    message,
  });
  return res.data;
}

export async function getHistory(sessionId) {
  const res = await api.get(`/session/${sessionId}/history`);
  return res.data;
}

export async function resetSession(sessionId) {
  const res = await api.post(`/session/${sessionId}/reset`);
  return res.data;
}
