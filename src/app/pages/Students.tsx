import { useState } from 'react';
import { Link } from 'react-router';
import { MoreVertical, Plus, Search } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { Button } from '../components/ui/button';
import {
  deactivateStudent,
  getOrCreateCurrentPayment,
  registerPayment,
  useSchoolData,
} from '../data/store';
import { Payment, PaymentMethod, Student } from '../types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

export function Students() {
  const { students, payments } = useSchoolData();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [classFilter, setClassFilter] = useState('Todas');
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [paymentNotes, setPaymentNotes] = useState('');

  const filteredStudents = students.filter((student) => {
    const normalizedSearch = searchTerm.toLowerCase();
    const matchesSearch =
      student.name.toLowerCase().includes(normalizedSearch) ||
      student.phone.includes(searchTerm) ||
      student.cpf.includes(searchTerm);

    const matchesStatus = statusFilter === 'Todos' || student.status === statusFilter;
    const matchesClass = classFilter === 'Todas' || student.class === classFilter;

    return matchesSearch && matchesStatus && matchesClass;
  });

  const uniqueClasses = Array.from(new Set(students.map(s => s.class)));

  const getLastPayment = (studentId: string) => {
    const studentPayments = payments
      .filter(p => p.studentId === studentId && p.status === 'Paid')
      .sort((a, b) => new Date(b.paymentDate!).getTime() - new Date(a.paymentDate!).getTime());

    return studentPayments[0]?.paymentDate
      ? new Date(studentPayments[0].paymentDate).toLocaleDateString('pt-BR')
      : 'N/A';
  };

  const openPaymentModal = (student: Student) => {
    const payment = getOrCreateCurrentPayment(student);
    setOpenActionsId(null);
    setSelectedStudent(student);
    setSelectedPayment(payment);
    setPaymentAmount(String(payment.amount));
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setPaymentMethod('PIX');
    setPaymentNotes('');
  };

  const handleConfirmPayment = () => {
    if (!selectedPayment) {
      return;
    }

    registerPayment(selectedPayment.id, {
      amount: Number(paymentAmount),
      paymentDate,
      paymentMethod,
      notes: paymentNotes,
    });

    setSelectedPayment(null);
    setSelectedStudent(null);
  };

  const handleDeactivateStudent = (studentId: string) => {
    deactivateStudent(studentId);
    setOpenActionsId(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl">Alunos</h2>
        <Link to="/students/new">
          <Button className="bg-red-600 hover:bg-red-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Novo Aluno
          </Button>
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Nome, telefone, CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            >
              <option>Todos</option>
              <option>Active</option>
              <option>Inactive</option>
              <option>Pending</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Turma</label>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            >
              <option>Todas</option>
              {uniqueClasses.map(cls => (
                <option key={cls}>{cls}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-gray-600">Nome</th>
              <th className="text-left px-4 py-3 text-gray-600">Turma</th>
              <th className="text-left px-4 py-3 text-gray-600">Telefone</th>
              <th className="text-left px-4 py-3 text-gray-600">Data Início</th>
              <th className="text-left px-4 py-3 text-gray-600">Status</th>
              <th className="text-left px-4 py-3 text-gray-600">Mensalidade</th>
              <th className="text-left px-4 py-3 text-gray-600">Último Pagamento</th>
              <th className="text-left px-4 py-3 text-gray-600">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student) => (
              <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3">{student.name}</td>
                <td className="px-4 py-3">{student.class}</td>
                <td className="px-4 py-3">{student.phone}</td>
                <td className="px-4 py-3">{new Date(student.startDate).toLocaleDateString('pt-BR')}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={student.status} />
                </td>
                <td className="px-4 py-3">R$ {student.monthlyFee}</td>
                <td className="px-4 py-3">{getLastPayment(student.id)}</td>
                <td className="px-4 py-3 relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    aria-label={`Abrir ações de ${student.name}`}
                    aria-expanded={openActionsId === student.id}
                    onClick={() => setOpenActionsId(openActionsId === student.id ? null : student.id)}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>

                  {openActionsId === student.id && (
                    <div className="absolute right-4 top-10 z-50 w-48 rounded border border-gray-200 bg-white p-1 shadow-lg">
                      <Link
                        to={`/students/${student.id}`}
                        className="block rounded px-3 py-2 text-sm hover:bg-gray-100"
                        onClick={() => setOpenActionsId(null)}
                      >
                        Ver
                      </Link>
                      <Link
                        to={`/students/${student.id}/edit`}
                        className="block rounded px-3 py-2 text-sm hover:bg-gray-100"
                        onClick={() => setOpenActionsId(null)}
                      >
                        Editar
                      </Link>
                      <Link
                        to={`/students/${student.id}?tab=financial`}
                        className="block rounded px-3 py-2 text-sm hover:bg-gray-100"
                        onClick={() => setOpenActionsId(null)}
                      >
                        Financeiro
                      </Link>
                      <button
                        type="button"
                        className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-gray-100"
                        onClick={() => openPaymentModal(student)}
                      >
                        Registrar Pagamento
                      </button>
                      <button
                        type="button"
                        className="block w-full rounded px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => handleDeactivateStudent(student.id)}
                        disabled={student.status === 'Inactive'}
                      >
                        Desativar
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!selectedPayment} onOpenChange={(open) => !open && setSelectedPayment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Aluno</label>
              <input
                type="text"
                value={selectedStudent?.name || ''}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm bg-gray-50"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Mês</label>
                <input
                  type="text"
                  value={selectedPayment?.month || ''}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Valor Pago</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Data do Pagamento</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Método de Pagamento</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                >
                  <option value="PIX">PIX</option>
                  <option value="Cash">Dinheiro</option>
                  <option value="Credit Card">Cartão de Crédito</option>
                  <option value="Debit Card">Cartão de Débito</option>
                  <option value="Bank Transfer">Transferência Bancária</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Observações</label>
              <textarea
                rows={3}
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleConfirmPayment}>
                Confirmar Pagamento
              </Button>
              <Button variant="outline" onClick={() => setSelectedPayment(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
