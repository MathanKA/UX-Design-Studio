import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HostApp } from "./app/HostApp";
import "./styles/host-global.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root was not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <HostApp />
    </BrowserRouter>
  </StrictMode>,
);
