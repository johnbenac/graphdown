import { Navigate, Route, Routes } from "react-router-dom";
import DatasetRoute from "./routes/DatasetRoute";
import ImportRoute from "./routes/ImportRoute";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/import" replace />} />
      <Route path="/import" element={<ImportRoute />} />
      <Route path="/datasets" element={<DatasetRoute />} />
      <Route path="*" element={<Navigate to="/import" replace />} />
    </Routes>
  );
};

export default App;
