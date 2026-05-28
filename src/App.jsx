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

function App() {
  return (
    <Router>
      <Routes>
        {/* Login principal */}
        <Route path="/" element={<Login />} />
        
        {/* Panel de Inicio */}
        <Route path="/home" element={<Home />} />
        
        {/* Panel de Control de Breaks */}
        <Route path="/break-control" element={<BreakControl />} />
        
        {/* Estaciones de Trabajo individuales */}
        <Route path="/system-1" element={<System1 />} />
        <Route path="/system-2" element={<System2 />} />
        <Route path="/system-3" element={<System3 />} />
        <Route path="/system-4" element={<System4 />} />

        {/* Redirecciones temporales para que no se rompa el Home */}
        <Route path="/groups" element={<Groups />} />

        {/* Noticias y Actualizaciones */}
        <Route path="/news" element={<News />} />

        {/* Registro de Empleados */}
        <Route path="/employees" element={<Employees />} />

        {/* Attendance data base */}
        <Route path="/attendance" element={<Attendance />} />

        {/* Accesos privados */}
        <Route path="/device-access" element={<DeviceAccess />} />
        
        
      </Routes>
    </Router>
  );
}

export default App;