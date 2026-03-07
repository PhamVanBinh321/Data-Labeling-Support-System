import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import AuthLayout from './layouts/AuthLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import RoleSelectionPage from './pages/RoleSelectionPage';
import DashboardLayout from './layouts/DashboardLayout';
import ManagerProjects from './pages/manager/ManagerProjects';
import AnnotatorTasks from './pages/annotator/AnnotatorTasks';
import LabelingWorkspace from './pages/annotator/LabelingWorkspace';
import ReviewerQueue from './pages/reviewer/ReviewerQueue';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navigate } from 'react-router-dom';

// Simple wrapper for protected routes outside of DashboardLayout
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            
            {/* Auth Routes */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>
            
            {/* Role Selection Route */}
            <Route path="/role-selection" element={<RoleSelectionPage />} />

            {/* Labeling Workspace (Full Width, No Sidebar) */}
            <Route path="/workspace/:taskId" element={
              <ProtectedRoute>
                <LabelingWorkspace />
              </ProtectedRoute>
            } />

            {/* Dashboard Layout & Protected Routes */}
            <Route element={<DashboardLayout />}>
              <Route path="/manager/*" element={<ManagerProjects />} />
              <Route path="/annotator/*" element={<AnnotatorTasks />} />
              <Route path="/reviewer/*" element={<ReviewerQueue />} />
            </Route>

          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
