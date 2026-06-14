import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './views/Login';
import Home from './views/Home';
import BreakControl from './views/BreakControl';
import System1 from './views/System1';
import System2 from './views/System2';
import System3 from './views/System3';
import System4 from './views/System4';
import Groups from './views/Groups';
import News from './views/News';
import Employees from './views/Employees';
import Attendance from './views/Attendance';
import DeviceAccess from './views/DeviceAccess';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route path="/system-1" element={<System1 />} />
        <Route path="/system-2" element={<System2 />} />
        <Route path="/system-3" element={<System3 />} />
        <Route path="/system-4" element={<System4 />} />

        <Route
  path="/home"
  element={
    <ProtectedAdminRoute>
      <Home />
    </ProtectedAdminRoute>
  }
/>

<Route
  path="/break-control"
  element={
    <ProtectedAdminRoute>
      <BreakControl />
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
  path="/news"
  element={
    <ProtectedAdminRoute>
      <News />
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
      </Routes>
    </Router>
  );
}

export default App;