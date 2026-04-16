import { KPICard } from '../components/KPICard';
import { StatusBadge } from '../components/StatusBadge';
import { mockStudents, mockPayments } from '../data/mockData';

export function Dashboard() {
  const activeStudents = mockStudents.filter(s => s.status === 'Active').length;
  
  const pendingPayments = mockPayments.filter(p => p.status === 'Pending');
  const overduePayments = mockPayments.filter(p => p.status === 'Overdue');
  
  // Calculate revenue for current month (April 2026)
  const currentMonthRevenue = mockPayments
    .filter(p => p.month === '2026-04' && p.status === 'Paid')
    .reduce((sum, p) => sum + p.amount, 0);

  // Get upcoming payments (pending in April)
  const upcomingPayments = mockPayments
    .filter(p => p.month === '2026-04' && p.status === 'Pending')
    .slice(0, 5);

  // Get overdue students
  const overdueStudents = overduePayments.slice(0, 5);

  return (
    <div>
      <h2 className="text-2xl mb-6">Painel</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <KPICard title="Alunos Ativos" value={activeStudents} variant="success" />
        <KPICard title="Pagamentos Pendentes" value={pendingPayments.length} variant="warning" />
        <KPICard title="Pagamentos Atrasados" value={overduePayments.length} variant="danger" />
        <KPICard title="Receita do Mês" value={`R$ ${currentMonthRevenue}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Payments */}
        <div className="bg-white border border-gray-200 rounded p-4">
          <h3 className="text-lg mb-4">Próximos Pagamentos</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 text-gray-600">Aluno</th>
                <th className="text-left py-2 text-gray-600">Turma</th>
                <th className="text-left py-2 text-gray-600">Vencimento</th>
                <th className="text-left py-2 text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {upcomingPayments.map((payment) => (
                <tr key={payment.id} className="border-b border-gray-100">
                  <td className="py-2">{payment.studentName}</td>
                  <td className="py-2">{payment.class}</td>
                  <td className="py-2">{new Date(payment.dueDate).toLocaleDateString('pt-BR')}</td>
                  <td className="py-2">
                    <StatusBadge status={payment.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Overdue Students */}
        <div className="bg-white border border-gray-200 rounded p-4">
          <h3 className="text-lg mb-4">Alunos em Atraso</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 text-gray-600">Nome</th>
                <th className="text-left py-2 text-gray-600">Valor Devido</th>
                <th className="text-left py-2 text-gray-600">Último Vencimento</th>
              </tr>
            </thead>
            <tbody>
              {overdueStudents.map((payment) => (
                <tr key={payment.id} className="border-b border-gray-100">
                  <td className="py-2">{payment.studentName}</td>
                  <td className="py-2">R$ {payment.amount}</td>
                  <td className="py-2">{new Date(payment.dueDate).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}