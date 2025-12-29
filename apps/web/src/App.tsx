import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";
import ImportRoute from "./routes/ImportRoute";
import DatasetRoute from "./routes/DatasetRoute";
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
];

const router = createBrowserRouter(appRoutes);

export default function App() {
  return (
    <DatasetProvider>
      <RouterProvider router={router} />
    </DatasetProvider>
  );
}
