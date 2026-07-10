import { BrowserRouter, HashRouter, Routes, Route } from 'react-router-dom';
import Login from './views/Login';
import Home from './views/Home';
import System1 from './views/System1';
import System2 from './views/System2';
import System3 from './views/System3';
import System4 from './views/System4';
import Groups from './views/Groups';
import Employees from './views/Employees';
import Attendance from './views/Attendance';
import DeviceAccess from './views/DeviceAccess';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';
import Workability from './pages/Workability';
import WorkabilityAdmin from './pages/WorkabilityAdmin';

const Router = window.location.protocol === 'file:' ? HashRouter : BrowserRouter;

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route path="/system-1" element={<System1 />} />
        <Route path="/system-2" element={<System2 />} />
        <Route path="/system-3" element={<System3 />} />
        <Route path="/system-4" element={<System4 />} />
        <Route path="/workability" element={<Workability />} />
       

        <Route
          path="/home"
          element={
            <ProtectedAdminRoute>
              <Home />
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/groups"
          element={
            <ProtectedAdminRoute>
              <Groups />
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/employees"
          element={
            <ProtectedAdminRoute>
              <Employees />
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/attendance"
          element={
            <ProtectedAdminRoute>
              <Attendance />
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/device-access"
          element={
            <ProtectedAdminRoute>
              <DeviceAccess />
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/workability-admin"
          element={
            <ProtectedAdminRoute>
              <WorkabilityAdmin />
            </ProtectedAdminRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;