import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { registerPersistenceDebugHelpers } from "./persistence/persistenceClient";
import "./styles.css";

registerPersistenceDebugHelpers();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
