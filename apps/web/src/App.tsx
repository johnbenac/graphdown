import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";
import ImportRoute from "./routes/ImportRoute";
import DatasetRoute from "./routes/DatasetRoute";
import ExportRoute from "./routes/ExportRoute";
import { DatasetProvider } from "./state/DatasetContext";

export const appRoutes = [
  {
    path: "/",
    element: <Navigate to="/import" replace />,
  },
  {
    path: "/import",
    element: <ImportRoute />,
  },
  {
    path: "/datasets",
    element: <DatasetRoute />,
  },
  {
    path: "/export",
    element: <ExportRoute />,
  },
];

const baseUrl = import.meta.env.BASE_URL;
const basename = baseUrl === "/" ? "/" : baseUrl.replace(/\/$/, "");
const router = createBrowserRouter(appRoutes, { basename });

export default function App() {
  return (
    <DatasetProvider>
      <RouterProvider router={router} />
    </DatasetProvider>
  );
}
