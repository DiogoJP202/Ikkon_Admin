import { useEffect, useMemo, useState } from 'react';
import { Edit, Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { KPICard } from '../components/KPICard';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  deletePayment,
  registerPayment,
  reopenPayment,
  savePayment,
  updateOverduePayments,
  useSchoolData,
} from '../data/store';
import { Payment, PaymentMethod, PaymentStatus } from '../types';

type ChargeFormData = {
  studentId: string;
  month: string;
  amount: string;
  dueDay: string;
  dueDate: string;
  status: PaymentStatus;
  notes: string;
};

const currentMonth = () => new Date().toISOString().slice(0, 7);
const today = () => new Date().toISOString().slice(0, 10);

function clampDueDay(day: number) {
  return Math.min(Math.max(day || 1, 1), 28);
}

function dueDateFromMonth(month: string, dueDay: string | number) {
  return `${month}-${String(clampDueDay(Number(dueDay))).padStart(2, '0')}`;
}

function normalizeDecimal(value: string) {
  return value.replace(/[^\d,.-]/g, '').replace(',', '.');
}

function parseDecimal(value: string) {
  return Number(normalizeDecimal(value)) || 0;
}

function moneyToInput(value: number | string) {
  const numericValue = typeof value === 'number' ? value : parseDecimal(value);
  return numericValue ? String(numericValue).replace('.', ',') : '';
}

const emptyChargeForm = (month = currentMonth(), dueDay = 10): ChargeFormData => ({
  studentId: '',
  month,
  amount: '',
  dueDay: String(clampDueDay(dueDay)),
  dueDate: dueDateFromMonth(month, dueDay),
  status: 'Pending',
  notes: '',
});

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const paymentMethodLabels: Record<PaymentMethod, string> = {
  PIX: 'PIX',
  Cash: 'Dinheiro',
  'Credit Card': 'Cartão de Crédito',
  'Debit Card': 'Cartão de Débito',
  'Bank Transfer': 'Transferência Bancária',
};

export function Financial() {
  const { payments, students, classes, settings } = useSchoolData();
  const [monthFilter, setMonthFilter] = useState(currentMonth());
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [classFilter, setClassFilter] = useState('Todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [editingCharge, setEditingCharge] = useState<Payment | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(today());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [chargeForm, setChargeForm] = useState<ChargeFormData>(emptyChargeForm(currentMonth(), settings.defaultDueDay));
  const [formError, setFormError] = useState('');

  useEffect(() => {
    updateOverduePayments();
  }, []);

  const activeStudents = students.filter(student => student.status !== 'Inactive' && student.status !== 'Withdrawn');

  const uniqueClasses = useMemo(() => {
    return Array.from(new Set([...classes.map(item => item.name), ...payments.map(item => item.class)])).filter(Boolean);
  }, [classes, payments]);

  const filteredPayments = payments
    .filter((payment) => {
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        payment.studentName.toLowerCase().includes(search) ||
        payment.class.toLowerCase().includes(search);
      const matchesMonth = !monthFilter || payment.month === monthFilter;
      const matchesStatus = statusFilter === 'Todos' || payment.status === statusFilter;
      const matchesClass = classFilter === 'Todas' || payment.class === classFilter;
      return matchesSearch && matchesMonth && matchesStatus && matchesClass;
    })
    .sort((a, b) => {
      if (a.status !== b.status) {
        const statusOrder: Record<PaymentStatus, number> = { Overdue: 0, Pending: 1, Paid: 2 };
        return statusOrder[a.status] - statusOrder[b.status];
      }
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

  const totalExpected = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const totalReceived = filteredPayments
    .filter(payment => payment.status === 'Paid')
    .reduce((sum, payment) => sum + payment.amount, 0);

  const amountToReceive = (payment: Payment) => {
    if (payment.status !== 'Overdue') {
      return payment.amount;
    }

    return payment.amount * (1 + settings.lateFeePercentage / 100);
  };

  const pendingTotal = filteredPayments
    .filter(payment => payment.status === 'Pending' || payment.status === 'Overdue')
    .reduce((sum, payment) => sum + amountToReceive(payment), 0);
  const overdue = filteredPayments.filter(payment => payment.status === 'Overdue').length;

  const openPaymentModal = (payment: Payment) => {
    setSelectedPayment(payment);
    setPaymentAmount(moneyToInput(payment.amount));
    setPaymentDate(payment.paymentDate || today());
    setPaymentMethod(payment.paymentMethod || 'PIX');
    setPaymentNotes(payment.notes || '');
    setFormError('');
    setShowPaymentModal(true);
  };

  const openNewChargeModal = () => {
    setEditingCharge(null);
    setChargeForm(emptyChargeForm(monthFilter || currentMonth(), settings.defaultDueDay));
    setFormError('');
    setShowChargeModal(true);
  };

  const openEditChargeModal = (payment: Payment) => {
    const student = students.find(item => item.id === payment.studentId);
    const dueDay = String(Number(payment.dueDate.slice(-2)) || settings.defaultDueDay);
    setEditingCharge(payment);
    setChargeForm({
      studentId: student?.id || payment.studentId,
      month: payment.month,
      amount: moneyToInput(payment.amount),
      dueDay,
      dueDate: payment.dueDate,
      status: payment.status,
      notes: payment.notes || '',
    });
    setFormError('');
    setShowChargeModal(true);
  };

  const handleStudentChange = (studentId: string) => {
    const student = students.find(item => item.id === studentId);
    const amount = student
      ? student.discount
        ? student.monthlyFee * (1 - student.discount / 100)
        : student.monthlyFee
      : 0;
    const dueDay = student ? String(clampDueDay(student.dueDay)) : chargeForm.dueDay;

    setChargeForm({
      ...chargeForm,
      studentId,
      amount: student ? moneyToInput(Math.round(amount * 100) / 100) : chargeForm.amount,
      dueDay,
      dueDate: dueDateFromMonth(chargeForm.month, dueDay),
    });
  };

  const handleMonthChange = (month: string) => {
    setChargeForm({
      ...chargeForm,
      month,
      dueDate: dueDateFromMonth(month, chargeForm.dueDay),
    });
  };

  const handleDueDayChange = (dueDay: string) => {
    setChargeForm({
      ...chargeForm,
      dueDay,
      dueDate: dueDateFromMonth(chargeForm.month, dueDay),
    });
  };

  const handleConfirmPayment = () => {
    if (!selectedPayment) {
      return;
    }

    if (!paymentDate || parseDecimal(paymentAmount) <= 0) {
      setFormError('Informe valor e data do pagamento.');
      return;
    }

    registerPayment(selectedPayment.id, {
      amount: parseDecimal(paymentAmount),
      paymentDate,
      paymentMethod,
      notes: paymentNotes,
    });

    setShowPaymentModal(false);
    setSelectedPayment(null);
  };

  const handleSaveCharge = (event: React.FormEvent) => {
    event.preventDefault();

    const student = students.find(item => item.id === chargeForm.studentId);
    if (!student || !chargeForm.month || !chargeForm.dueDate || parseDecimal(chargeForm.amount) <= 0) {
      setFormError('Selecione o aluno e informe mês, vencimento e valor.');
      return;
    }

    savePayment({
      id: editingCharge?.id,
      studentId: student.id,
      studentName: student.name,
      class: student.class,
      month: chargeForm.month,
      amount: parseDecimal(chargeForm.amount),
      dueDate: chargeForm.dueDate,
      status: chargeForm.status,
      paymentDate: editingCharge?.paymentDate,
      paymentMethod: editingCharge?.paymentMethod,
      notes: chargeForm.notes,
    });

    setShowChargeModal(false);
    setEditingCharge(null);
  };

  const resetFilters = () => {
    setMonthFilter(currentMonth());
    setStatusFilter('Todos');
    setClassFilter('Todas');
    setSearchTerm('');
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-2xl">Financeiro</h2>
        <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={openNewChargeModal}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Cobrança
        </Button>
      </div>

      <div className="bg-white border border-gray-200 rounded p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="search"
                placeholder="Aluno ou turma..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Mês</label>
            <input
              type="month"
              value={monthFilter}
              onChange={(event) => setMonthFilter(event.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            >
              <option>Todos</option>
              <option value="Paid">Pago</option>
              <option value="Pending">Pendente</option>
              <option value="Overdue">Atrasado</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Turma</label>
            <select
              value={classFilter}
              onChange={(event) => setClassFilter(event.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            >
              <option>Todas</option>
              {uniqueClasses.map(className => (
                <option key={className}>{className}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-3">
          <Button variant="outline" size="sm" onClick={resetFilters}>
            Limpar Filtros
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <KPICard title="Total Esperado" value={formatCurrency(totalExpected)} />
        <KPICard title="Total Recebido" value={formatCurrency(totalReceived)} variant="success" />
        <KPICard title="A Receber" value={formatCurrency(pendingTotal)} variant="warning" />
        <KPICard title="Atrasados" value={overdue} variant="danger" />
      </div>

      <div className="bg-white border border-gray-200 rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-gray-600">Aluno</th>
              <th className="text-left px-4 py-3 text-gray-600">Turma</th>
              <th className="text-left px-4 py-3 text-gray-600">Mês</th>
              <th className="text-left px-4 py-3 text-gray-600">Valor</th>
              <th className="text-left px-4 py-3 text-gray-600">Vencimento</th>
              <th className="text-left px-4 py-3 text-gray-600">Status</th>
              <th className="text-left px-4 py-3 text-gray-600">Pagamento</th>
              <th className="text-left px-4 py-3 text-gray-600">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayments.map((payment) => (
              <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3">{payment.studentName}</td>
                <td className="px-4 py-3">{payment.class}</td>
                <td className="px-4 py-3">{payment.month}</td>
                <td className="px-4 py-3">{formatCurrency(payment.amount)}</td>
                <td className="px-4 py-3">{new Date(payment.dueDate).toLocaleDateString('pt-BR')}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={payment.status} />
                </td>
                <td className="px-4 py-3">
                  {payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString('pt-BR') : '-'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => openPaymentModal(payment)}>
                      {payment.status === 'Paid' ? 'Editar Pgto' : 'Registrar'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openEditChargeModal(payment)}>
                      <Edit className="w-4 h-4" />
                      Cobrança
                    </Button>
                    {payment.status === 'Paid' && (
                      <Button size="sm" variant="outline" onClick={() => reopenPayment(payment.id)}>
                        <RotateCcw className="w-4 h-4" />
                        Reabrir
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600"
                      onClick={() => deletePayment(payment.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                      Excluir
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredPayments.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={8}>
                  Nenhuma cobrança encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedPayment?.status === 'Paid' ? 'Editar Pagamento' : 'Registrar Pagamento'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {formError && (
              <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {formError}
              </div>
            )}
            <div>
              <label className="block text-sm text-gray-600 mb-1">Aluno</label>
              <input
                type="text"
                value={selectedPayment?.studentName || ''}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm bg-gray-50"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Mês</label>
                <input
                  type="month"
                  value={selectedPayment?.month || ''}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Valor Pago</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="250,00"
                    value={paymentAmount}
                    onChange={(event) => setPaymentAmount(event.target.value.replace(/[^\d,.]/g, ''))}
                    onBlur={() => setPaymentAmount(moneyToInput(paymentAmount))}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Data do Pagamento</label>
                <input
                  type="date"
                  max={today()}
                  value={paymentDate}
                  onChange={(event) => setPaymentDate(event.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Método de Pagamento</label>
                <select
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                >
                  {Object.entries(paymentMethodLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Observações</label>
              <textarea
                rows={3}
                value={paymentNotes}
                onChange={(event) => setPaymentNotes(event.target.value)}
                placeholder="Comprovante, observações do pagamento ou acordo"
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleConfirmPayment}>
                Confirmar Pagamento
              </Button>
              <Button variant="outline" onClick={() => setShowPaymentModal(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showChargeModal} onOpenChange={setShowChargeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCharge ? 'Editar Cobrança' : 'Nova Cobrança'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveCharge} className="space-y-4">
            {formError && (
              <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {formError}
              </div>
            )}
            <div>
              <label className="block text-sm text-gray-600 mb-1">Aluno</label>
              <select
                value={chargeForm.studentId}
                onChange={(event) => handleStudentChange(event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              >
                <option value="">Selecione um aluno</option>
                {activeStudents.map(student => (
                  <option key={student.id} value={student.id}>
                    {student.name} - {student.class}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Mês</label>
                <input
                  type="month"
                  value={chargeForm.month}
                  onChange={(event) => handleMonthChange(event.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Dia de Vencimento</label>
                <select
                  value={chargeForm.dueDay}
                  onChange={(event) => handleDueDayChange(event.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                >
                  {Array.from({ length: 28 }, (_, index) => String(index + 1)).map((day) => (
                    <option key={day} value={day}>Dia {day}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Vencimento</label>
                <input
                  type="date"
                  value={chargeForm.dueDate}
                  onChange={(event) => setChargeForm({
                    ...chargeForm,
                    dueDate: event.target.value,
                    dueDay: String(Number(event.target.value.slice(-2)) || chargeForm.dueDay),
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Valor</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="250,00"
                    value={chargeForm.amount}
                    onChange={(event) => setChargeForm({ ...chargeForm, amount: event.target.value.replace(/[^\d,.]/g, '') })}
                    onBlur={() => setChargeForm({ ...chargeForm, amount: moneyToInput(chargeForm.amount) })}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Status</label>
                <select
                  value={chargeForm.status}
                  onChange={(event) => setChargeForm({ ...chargeForm, status: event.target.value as PaymentStatus })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                >
                  <option value="Pending">Pendente</option>
                  <option value="Overdue">Atrasado</option>
                  <option value="Paid">Pago</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Observações</label>
              <textarea
                rows={3}
                value={chargeForm.notes}
                onChange={(event) => setChargeForm({ ...chargeForm, notes: event.target.value })}
                placeholder="Observações da cobrança, acordo ou condição especial"
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white">
                {editingCharge ? 'Salvar Alterações' : 'Criar Cobrança'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowChargeModal(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
