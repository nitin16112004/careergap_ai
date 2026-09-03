import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { AuthProvider } from "./components/auth/AuthProvider";
import { SessionHandler } from "./components/auth/SessionHandler";
import "./styles.css";
import "./mvp.css";
import "./ats-v1.css";
import "./rag-v1.css";
import "./reminder-v1.css";
import "./billing-v1.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SessionHandler>
          <App />
        </SessionHandler>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
