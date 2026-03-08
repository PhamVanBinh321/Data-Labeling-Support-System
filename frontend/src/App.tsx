import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import AuthLayout from './layouts/AuthLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import RoleSelectionPage from './pages/RoleSelectionPage';
import DashboardLayout from './layouts/DashboardLayout';
import ManagerProjects from './pages/manager/ManagerProjects';
import CreateProject from './pages/manager/CreateProject';
import ProjectDetails from './pages/manager/ProjectDetails';
import ManagerDatasets from './pages/manager/ManagerDatasets';
import ManagerMembers from './pages/manager/ManagerMembers';
import AnnotatorTasks from './pages/annotator/AnnotatorTasks';
import LabelingWorkspace from './pages/annotator/LabelingWorkspace';
import ReviewerQueue from './pages/reviewer/ReviewerQueue';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Simple wrapper for protected routes outside of DashboardLayout
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: { fontFamily: 'inherit', fontSize: '0.9rem', borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,0,0,.12)' },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
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
              <Route path="/manager/projects" element={<ManagerProjects />} />
              <Route path="/manager/projects/:projectId" element={<ProjectDetails />} />
              <Route path="/manager/create-project" element={<CreateProject />} />
              <Route path="/manager/datasets" element={<ManagerDatasets />} />
              <Route path="/manager/members" element={<ManagerMembers />} />
              <Route path="/manager" element={<ManagerProjects />} />
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
