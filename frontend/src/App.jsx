import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import PrivateRoute from './components/PrivateRoute'
import ToastContainer from './components/ToastContainer'
import ServerWakingBanner from './components/ServerWakingBanner'

import Home from './pages/Home'
import NotFound from './pages/NotFound'
import Login from './pages/auth/Login'
import Signup from './pages/auth/Signup'
import VerifyEmail from './pages/auth/VerifyEmail'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'

import AdminDashboard from './pages/admin/Dashboard'
import AdminPrograms from './pages/admin/Programs'
import AdminSessions from './pages/admin/Sessions'
import AdminUsers from './pages/admin/Users'
import AdminAttendance from './pages/admin/Attendance'
import AdminResources from './pages/admin/Resources'
import AdminAnalytics from './pages/admin/Analytics'

import MentorDashboard from './pages/mentor/Dashboard'
import MentorProfile from './pages/mentor/Profile'
import MentorSessions from './pages/mentor/Sessions'
import MentorCertificates from './pages/mentor/Certificates'
import MentorResources from './pages/mentor/Resources'
import MentorAnalytics from './pages/mentor/Analytics'

import MenteeDashboard from './pages/mentee/Dashboard'
import Programs from './pages/mentee/Programs'
import Enrollments from './pages/mentee/Enrollments'
import MySessions from './pages/mentee/Sessions'
import MyAttendance from './pages/mentee/Attendance'
import MyResources from './pages/mentee/Resources'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/login/:role" element={<Login />} />
          <Route path="/signup/:role" element={<Signup />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route path="/admin/dashboard" element={<PrivateRoute role="admin"><AdminDashboard /></PrivateRoute>} />
          <Route path="/admin/programs" element={<PrivateRoute role="admin"><AdminPrograms /></PrivateRoute>} />
          <Route path="/admin/sessions" element={<PrivateRoute role="admin"><AdminSessions /></PrivateRoute>} />
          <Route path="/admin/users" element={<PrivateRoute role="admin"><AdminUsers /></PrivateRoute>} />
          <Route path="/admin/attendance" element={<PrivateRoute role="admin"><AdminAttendance /></PrivateRoute>} />
          <Route path="/admin/resources" element={<PrivateRoute role="admin"><AdminResources /></PrivateRoute>} />
          <Route path="/admin/analytics" element={<PrivateRoute role="admin"><AdminAnalytics /></PrivateRoute>} />

          <Route path="/mentor/dashboard" element={<PrivateRoute role="mentor"><MentorDashboard /></PrivateRoute>} />
          <Route path="/mentor/profile" element={<PrivateRoute role="mentor"><MentorProfile /></PrivateRoute>} />
          <Route path="/mentor/sessions" element={<PrivateRoute role="mentor"><MentorSessions /></PrivateRoute>} />
          <Route path="/mentor/certificates" element={<PrivateRoute role="mentor"><MentorCertificates /></PrivateRoute>} />
          <Route path="/mentor/resources" element={<PrivateRoute role="mentor"><MentorResources /></PrivateRoute>} />
          <Route path="/mentor/analytics" element={<PrivateRoute role="mentor"><MentorAnalytics /></PrivateRoute>} />

          <Route path="/mentee/dashboard" element={<PrivateRoute role="mentee"><MenteeDashboard /></PrivateRoute>} />
          <Route path="/programs" element={<PrivateRoute role="mentee"><Programs /></PrivateRoute>} />
          <Route path="/mentee/enrollments" element={<PrivateRoute role="mentee"><Enrollments /></PrivateRoute>} />
          <Route path="/mentee/sessions" element={<PrivateRoute role="mentee"><MySessions /></PrivateRoute>} />
          <Route path="/mentee/attendance" element={<PrivateRoute role="mentee"><MyAttendance /></PrivateRoute>} />
          <Route path="/mentee/resources" element={<PrivateRoute role="mentee"><MyResources /></PrivateRoute>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
        <ToastContainer />
        <ServerWakingBanner />
      </AuthProvider>
    </BrowserRouter>
  )
}
