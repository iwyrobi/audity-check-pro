import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Debug: log the Supabase URL to verify correct env var
console.log("[ENV DEBUG] VITE_SUPABASE_URL =", import.meta.env.VITE_SUPABASE_URL);

createRoot(document.getElementById("root")!).render(<App />);
