import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { preloadCriticalResources } from "./lib/preloader";

// Start preloading critical resources
preloadCriticalResources();

createRoot(document.getElementById("root")!).render(<App />);
