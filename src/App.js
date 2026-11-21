import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import OwnerLayout from './layouts/OwnerLayout';
import LoginPage from './pages/auth/Login';
import RegisterPage from './pages/auth/Register';
import LandingPage from './pages/Landing';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/owner/Dashboard';
import Students from './pages/owner/Students.js';
import Batches from './pages/owner/Batches.js';
import Attendance from './pages/owner/Attendance';
import Fees from './pages/owner/Fees';
import Payroll from './pages/owner/Payroll';
import Enquiries from './pages/owner/Enquiries';
import Events from './pages/owner/Events';
import Teachers from './pages/owner/Teachers';
import Settings from './pages/owner/Settings';
import AcceptInvite from './pages/invite/AcceptInvite';
import TeacherLayout from './layouts/TeacherLayout';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import TeacherClasses from './pages/teacher/MyClasses';
import TeacherAttendance from './pages/teacher/Attendance';
import TeacherStudents from './pages/teacher/MyStudents';
import TeacherAssignments from './pages/teacher/Assignments';
import TeacherMaterials from './pages/teacher/StudyMaterial';
import TeacherMessages from './pages/teacher/Messages';
import TeacherTimetable from './pages/teacher/Timetable';
import TeacherProfile from './pages/teacher/Profile';
import StudentLayout from './layouts/StudentLayout';
import StudentDashboard from './pages/student/StudentDashboard';
import StudentClasses from './pages/student/MyClasses';
import StudentAttendance from './pages/student/Attendance';
import StudentAssignments from './pages/student/Assignments';
import StudentMaterials from './pages/student/StudyMaterials';
import StudentTimetable from './pages/student/Timetable';
import StudentResults from './pages/student/Results';
import StudentFees from './pages/student/Fees';
import StudentNotifications from './pages/student/Notifications';
import StudentMessages from './pages/student/Messages';
import StudentProfile from './pages/student/Profile';
import StudentSettings from './pages/student/Settings';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path='/login' element={<LoginPage />} />
          <Route path='/register' element={<RegisterPage />} />
          <Route path='/invite/:token' element={<AcceptInvite />} />
          <Route path='/teacher' element={<ProtectedRoute roles={['teacher', 'owner', 'admin']}><TeacherLayout /></ProtectedRoute>}>
            <Route index element={<TeacherDashboard />} />
            <Route path='dashboard' element={<TeacherDashboard />} />
            <Route path='classes' element={<TeacherClasses />} />
            <Route path='attendance' element={<TeacherAttendance />} />
            <Route path='students' element={<TeacherStudents />} />
            <Route path='assignments' element={<TeacherAssignments />} />
            <Route path='materials' element={<TeacherMaterials />} />
            <Route path='messages' element={<TeacherMessages />} />
            <Route path='timetable' element={<TeacherTimetable />} />
            <Route path='profile' element={<TeacherProfile />} />
          </Route>
        <Route path='/student' element={<ProtectedRoute roles={['student']}><StudentLayout /></ProtectedRoute>}>
          <Route index element={<StudentDashboard />} />
          <Route path='dashboard' element={<StudentDashboard />} />
          <Route path='classes' element={<StudentClasses />} />
          <Route path='attendance' element={<StudentAttendance />} />
          <Route path='assignments' element={<StudentAssignments />} />
          <Route path='materials' element={<StudentMaterials />} />
          <Route path='timetable' element={<StudentTimetable />} />
          <Route path='results' element={<StudentResults />} />
          <Route path='fees' element={<StudentFees />} />
          <Route path='notifications' element={<StudentNotifications />} />
          <Route path='messages' element={<StudentMessages />} />
          <Route path='profile' element={<StudentProfile />} />
          <Route path='settings' element={<StudentSettings />} />
        </Route>
          <Route path='/' element={<LandingPage />} />
          <Route
            path='/owner'
            element={
              <ProtectedRoute>
                <OwnerLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path='dashboard' element={<Dashboard />} />
            <Route path='students' element={<Students />} />
            <Route path='batches' element={<Batches />} />
            <Route path='attendance' element={<Attendance />} />
            <Route path='fees' element={<Fees />} />
            <Route path='payroll' element={<Payroll />} />
            <Route path='enquiries' element={<Enquiries />} />
            <Route path='events' element={<Events />} />
            <Route path='teachers' element={<Teachers />} />
            <Route path='settings' element={<Settings />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
