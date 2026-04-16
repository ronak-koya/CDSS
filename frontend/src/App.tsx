import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LogoProvider } from './contexts/LogoContext';
import ProtectedRoute, { PatientPortalRoute } from './components/ProtectedRoute';
import Layout from './components/Layout';
import PortalLayout from './components/PortalLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PatientsPage from './pages/PatientsPage';
import PatientProfilePage from './pages/PatientProfilePage';
import DiagnosisPage from './pages/DiagnosisPage';
import AlertsPage from './pages/AlertsPage';
import RegisterPatientPage from './pages/RegisterPatientPage';
import AdminPage from './pages/AdminPage';
import AppointmentsPage from './pages/AppointmentsPage';
import MySchedulePage from './pages/MySchedulePage';
import VideoCallsPage from './pages/VideoCallsPage';
import VideoCallPage from './pages/VideoCallPage';
import PortalDashboard from './pages/portal/PortalDashboard';
import PortalAppointments from './pages/portal/PortalAppointments';
import PortalMedications from './pages/portal/PortalMedications';
import PortalResults from './pages/portal/PortalResults';
import PortalProfile from './pages/portal/PortalProfile';

export default function App() {
  return (
    <ThemeProvider>
    <LogoProvider>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Full-screen video call room — no sidebar, accessible to both staff and patients */}
          <Route
            path="/call/:id"
            element={
              <ProtectedRoute>
                <VideoCallPage />
              </ProtectedRoute>
            }
          />

          {/* Staff app */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="patients" element={<PatientsPage />} />
            <Route path="patients/new" element={<RegisterPatientPage />} />
            <Route path="patients/:id" element={<PatientProfilePage />} />
            <Route path="diagnosis" element={<DiagnosisPage />} />
            <Route path="alerts" element={<AlertsPage />} />
            <Route path="admin" element={<AdminPage />} />
            <Route path="appointments" element={<AppointmentsPage />} />
            <Route path="my-schedule" element={<MySchedulePage />} />
            <Route path="video-calls" element={<VideoCallsPage />} />
          </Route>

          {/* Patient portal */}
          <Route
            path="/portal"
            element={
              <PatientPortalRoute>
                <PortalLayout />
              </PatientPortalRoute>
            }
          >
            <Route index element={<PortalDashboard />} />
            <Route path="appointments" element={<PortalAppointments />} />
            <Route path="medications" element={<PortalMedications />} />
            <Route path="results" element={<PortalResults />} />
            <Route path="profile" element={<PortalProfile />} />
            <Route path="video-calls" element={<VideoCallsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </LogoProvider>
    </ThemeProvider>
  );
}
