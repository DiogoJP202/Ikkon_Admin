import { Link, useLocation } from 'react-router';
import {
  Award,
  DollarSign,
  GraduationCap,
  LayoutDashboard,
  Settings,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react';
import { useSchoolData } from '../data/store';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { settings } = useSchoolData();

  const menuItems = [
    { path: '/', label: 'Painel', icon: LayoutDashboard },
    { path: '/students', label: 'Alunos', icon: Users },
    { path: '/classes', label: 'Turmas', icon: GraduationCap },
    { path: '/financial', label: 'Financeiro', icon: DollarSign },
    { path: '/admissions', label: 'Admissões', icon: UserPlus },
    { path: '/withdrawals', label: 'Desligamentos', icon: UserMinus },
    { path: '/graduation', label: 'Graduação', icon: Award },
    { path: '/settings', label: 'Configurações', icon: Settings },
  ];

  const adminInitials = settings.adminName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-lg text-gray-900">{settings.schoolName}</h1>
          <div className="text-xs text-gray-500">Sistema de Gestão</div>
        </div>
        <nav className="p-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded mb-1 text-sm ${
                  isActive
                    ? 'bg-red-50 text-red-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {menuItems.find(item => item.path === location.pathname)?.label || 'Painel'}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-700">{settings.adminName}</div>
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-xs">
              {adminInitials || 'AD'}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
