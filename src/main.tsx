import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Debug: test Supabase connectivity on load
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
console.log("[BOOT] VITE_SUPABASE_URL =", supabaseUrl);
console.log("[BOOT] VITE_SUPABASE_PUBLISHABLE_KEY =", import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.substring(0, 30) + "...");

fetch(`${supabaseUrl}/rest/v1/`, {
  headers: {
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
  },
})
  .then((r) => console.log("[BOOT] Supabase reachable, status:", r.status))
  .catch((e) => console.error("[BOOT] Supabase UNREACHABLE:", e.message, e));

createRoot(document.getElementById("root")!).render(<App />);
