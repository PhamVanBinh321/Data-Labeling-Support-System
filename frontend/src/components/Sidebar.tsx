import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Briefcase, 
  Database, 
  Users, 
  Settings, 
  CheckSquare, 
  BarChart, 
  ListTodo,
  ShieldCheck
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const { activeRole } = useAuth();

  const renderNavItems = () => {
    switch (activeRole) {
      case 'manager':
        return (
          <>
            <NavLink to="/manager/projects" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
              <Briefcase size={20} />
              <span>Projects</span>
            </NavLink>
            <NavLink to="/manager/datasets" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
              <Database size={20} />
              <span>Datasets</span>
            </NavLink>
            <NavLink to="/manager/members" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
              <Users size={20} />
              <span>Members</span>
            </NavLink>
            <NavLink to="/manager/settings" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
              <Settings size={20} />
              <span>Settings</span>
            </NavLink>
          </>
        );
      case 'annotator':
        return (
          <>
            <NavLink to="/annotator/tasks" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
              <CheckSquare size={20} />
              <span>My Tasks</span>
            </NavLink>
            <NavLink to="/annotator/performance" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
              <BarChart size={20} />
              <span>Performance</span>
            </NavLink>
          </>
        );
      case 'reviewer':
        return (
          <>
            <NavLink to="/reviewer/queue" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
              <ListTodo size={20} />
              <span>Review Queue</span>
            </NavLink>
            <NavLink to="/reviewer/metrics" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
              <ShieldCheck size={20} />
              <span>Quality Metrics</span>
            </NavLink>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <Link to="/" className="sidebar-logo">
          <div className="logo-icon"></div>
          <span className="logo-text">AnnotatePro</span>
        </Link>
      </div>
      
      <nav className="sidebar-nav">
        {renderNavItems()}
      </nav>

    </aside>
  );
};

export default Sidebar;
