import { BrowserRouter } from "react-router-dom";
import { UxDesignStudioApp } from "./UxDesignStudioApp";

/** Standalone entry composition: owns BrowserRouter. */
export function App() {
  return (
    <BrowserRouter>
      <UxDesignStudioApp mode="standalone" />
    </BrowserRouter>
  );
}
