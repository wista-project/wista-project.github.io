import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { isAuthenticated } from '@/lib/storage';

const ProtectedRoute: React.FC = () => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
