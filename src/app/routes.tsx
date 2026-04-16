import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Students } from './pages/Students';
import { StudentForm } from './pages/StudentForm';
import { StudentDetails } from './pages/StudentDetails';
import { Financial } from './pages/Financial';
import { Classes } from './pages/Classes';
import { Admissions } from './pages/Admissions';
import { Withdrawals } from './pages/Withdrawals';
import { Graduation } from './pages/Graduation';
import { Settings } from './pages/Settings';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout><Dashboard /></Layout>,
  },
  {
    path: '/students',
    element: <Layout><Students /></Layout>,
  },
  {
    path: '/students/new',
    element: <Layout><StudentForm /></Layout>,
  },
  {
    path: '/students/:id',
    element: <Layout><StudentDetails /></Layout>,
  },
  {
    path: '/students/:id/edit',
    element: <Layout><StudentForm /></Layout>,
  },
  {
    path: '/classes',
    element: <Layout><Classes /></Layout>,
  },
  {
    path: '/financial',
    element: <Layout><Financial /></Layout>,
  },
  {
    path: '/admissions',
    element: <Layout><Admissions /></Layout>,
  },
  {
    path: '/withdrawals',
    element: <Layout><Withdrawals /></Layout>,
  },
  {
    path: '/graduation',
    element: <Layout><Graduation /></Layout>,
  },
  {
    path: '/settings',
    element: <Layout><Settings /></Layout>,
  },
]);
