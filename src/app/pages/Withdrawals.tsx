import { useState } from 'react';
import { Calculator, Edit, Plus, Search, Trash2 } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { Button } from '../components/ui/button';
import {
  calculateOpenPaymentAmount,
  completeWithdrawal,
  deleteWithdrawal,
  saveWithdrawal,
  useSchoolData,
} from '../data/store';
import { Withdrawal } from '../types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

type WithdrawalFormData = {
  studentId: string;
  requestDate: string;
  reasonType: string;
  customReason: string;
  fine: string;
  status: Withdrawal['status'];
};

const today = () => new Date().toISOString().slice(0, 10);

const reasonOptions = [
  'Mudança de cidade',
  'Horário incompatível',
  'Questões financeiras',
  'Saúde',
  'Pausa temporária',
  'Insatisfação',
  'Outro',
];

const emptyForm = (): WithdrawalFormData => ({
  studentId: '',
  requestDate: today(),
  reasonType: 'Pausa temporária',
  customReason: '',
  fine: '0',
  status: 'Pending',
});

function normalizeDecimal(value: string) {
  return value.replace(/[^\d,.-]/g, '').replace(',', '.');
}

function parseDecimal(value: string) {
  return Number(normalizeDecimal(value)) || 0;
}

function moneyToInput(value: number | string) {
  const numericValue = typeof value === 'number' ? value : parseDecimal(value);
  return numericValue ? String(numericValue).replace('.', ',') : '0';
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

function splitReason(reason: string) {
  if (reasonOptions.includes(reason)) {
    return { reasonType: reason, customReason: '' };
  }

  return { reasonType: 'Outro', customReason: reason };
}

export function Withdrawals() {
  const { withdrawals, students, payments, settings } = useSchoolData();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [showFormModal, setShowFormModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [editingWithdrawal, setEditingWithdrawal] = useState<Withdrawal | null>(null);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [formData, setFormData] = useState<WithdrawalFormData>(emptyForm());
  const [formError, setFormError] = useState('');

  const availableStudents = students.filter((student) => student.status !== 'Withdrawn');
  const selectedStudent = students.find((student) => student.id === formData.studentId);

  const filteredWithdrawals = withdrawals
    .filter((withdrawal) => {
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        withdrawal.studentName.toLowerCase().includes(search) ||
        withdrawal.reason.toLowerCase().includes(search);
      const matchesStatus = statusFilter === 'Todos' || withdrawal.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());

  const pendingPaymentsFor = (studentId: string) => {
    return payments.filter((payment) => payment.studentId === studentId && payment.status !== 'Paid');
  };

  const finalAmountFor = (withdrawal: Withdrawal) => {
    return calculateOpenPaymentAmount(withdrawal.studentId) + withdrawal.fine;
  };

  const selectedOpenPayments = selectedStudent ? pendingPaymentsFor(selectedStudent.id) : [];
  const selectedOpenAmount = selectedOpenPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const selectedFinalAmount = selectedOpenAmount + parseDecimal(formData.fine);

  const openNewWithdrawal = () => {
    setEditingWithdrawal(null);
    setFormData({ ...emptyForm(), fine: moneyToInput(settings.withdrawalFine) });
    setFormError('');
    setShowFormModal(true);
  };

  const openEditWithdrawal = (withdrawal: Withdrawal) => {
    const parsedReason = splitReason(withdrawal.reason);
    setEditingWithdrawal(withdrawal);
    setFormData({
      studentId: withdrawal.studentId,
      requestDate: withdrawal.requestDate,
      reasonType: parsedReason.reasonType,
      customReason: parsedReason.customReason,
      fine: moneyToInput(withdrawal.fine),
      status: withdrawal.status,
    });
    setFormError('');
    setShowFormModal(true);
  };

  const openSummary = (withdrawal: Withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setShowSummaryModal(true);
  };

  const resolvedReason = () => {
    return formData.reasonType === 'Outro'
      ? formData.customReason.trim()
      : formData.reasonType;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const student = students.find((item) => item.id === formData.studentId);
    const reason = resolvedReason();

    if (!student || !formData.requestDate || !reason) {
      setFormError('Selecione o aluno e informe data e motivo.');
      return;
    }

    saveWithdrawal({
      id: editingWithdrawal?.id,
      studentId: student.id,
      studentName: student.name,
      requestDate: formData.requestDate,
      reason,
      fine: parseDecimal(formData.fine),
      status: formData.status,
    });

    setShowFormModal(false);
    setEditingWithdrawal(null);
  };

  const handleComplete = (withdrawal: Withdrawal) => {
    completeWithdrawal(withdrawal.id);
    setShowSummaryModal(false);
    setSelectedWithdrawal(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl">Desligamentos</h2>
        <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={openNewWithdrawal}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Desligamento
        </Button>
      </div>

      <div className="bg-white border border-gray-200 rounded p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="search"
                placeholder="Aluno ou motivo..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            >
              <option>Todos</option>
              <option value="Pending">Pendente</option>
              <option value="Completed">Concluído</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredWithdrawals.map((withdrawal) => {
          const pendingPayments = pendingPaymentsFor(withdrawal.studentId);
          const pendingAmount = pendingPayments.reduce((sum, payment) => sum + payment.amount, 0);

          return (
            <div key={withdrawal.id} className="bg-white border border-gray-200 rounded p-4">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-lg">{withdrawal.studentName}</h3>
                  <div className="text-sm text-gray-600">
                    Data da Solicitação: {new Date(withdrawal.requestDate).toLocaleDateString('pt-BR')}
                  </div>
                </div>
                <StatusBadge status={withdrawal.status} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <div className="text-sm text-gray-600">Motivo</div>
                  <div className="mt-1">{withdrawal.reason}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Pagamentos Pendentes</div>
                  <div className="mt-1">{pendingPayments.length}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Valor em Aberto</div>
                  <div className="mt-1">{formatCurrency(pendingAmount)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Multa</div>
                  <div className="mt-1">{formatCurrency(withdrawal.fine)}</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => openSummary(withdrawal)}>
                  <Calculator className="w-4 h-4" />
                  Calcular Valor Final
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleComplete(withdrawal)} disabled={withdrawal.status === 'Completed'}>
                  Confirmar Desligamento
                </Button>
                <Button size="sm" variant="outline" onClick={() => openEditWithdrawal(withdrawal)}>
                  <Edit className="w-4 h-4" />
                  Editar
                </Button>
                <Button size="sm" variant="outline" className="text-red-600" onClick={() => deleteWithdrawal(withdrawal.id)}>
                  <Trash2 className="w-4 h-4" />
                  Excluir
                </Button>
              </div>
            </div>
          );
        })}

        {filteredWithdrawals.length === 0 && (
          <div className="bg-white border border-gray-200 rounded p-6 text-center text-sm text-gray-500">
            Nenhum desligamento encontrado.
          </div>
        )}
      </div>

      <Dialog open={showFormModal} onOpenChange={setShowFormModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingWithdrawal ? 'Editar Desligamento' : 'Novo Desligamento'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-sm text-gray-600 mb-1">Aluno</label>
              <select
                value={formData.studentId}
                onChange={(event) => setFormData({ ...formData, studentId: event.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              >
                <option value="">Selecione um aluno</option>
                {availableStudents.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name} - {student.class} - {student.status}
                  </option>
                ))}
              </select>
            </div>

            {selectedStudent && (
              <div className="rounded border border-gray-200 bg-gray-50 p-3 text-sm">
                <div>{selectedStudent.name}</div>
                <div className="text-gray-600">{selectedStudent.class} - {selectedStudent.phone || 'Sem telefone'}</div>
                <div className="mt-2 flex justify-between">
                  <span>Pagamentos em aberto</span>
                  <span>{selectedOpenPayments.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Valor em aberto</span>
                  <span>{formatCurrency(selectedOpenAmount)}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Data da Solicitação</label>
                <input
                  type="date"
                  max={today()}
                  value={formData.requestDate}
                  onChange={(event) => setFormData({ ...formData, requestDate: event.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Multa</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formData.fine}
                    onChange={(event) => setFormData({ ...formData, fine: event.target.value.replace(/[^\d,.]/g, '') })}
                    onBlur={() => setFormData({ ...formData, fine: moneyToInput(formData.fine) })}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(event) => setFormData({ ...formData, status: event.target.value as Withdrawal['status'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                >
                  <option value="Pending">Pendente</option>
                  <option value="Completed">Concluído</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Motivo</label>
                <select
                  value={formData.reasonType}
                  onChange={(event) => setFormData({ ...formData, reasonType: event.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                >
                  {reasonOptions.map((reason) => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
              </div>
            </div>

            {formData.reasonType === 'Outro' && (
              <div>
                <label className="block text-sm text-gray-600 mb-1">Descreva o motivo</label>
                <textarea
                  rows={3}
                  value={formData.customReason}
                  onChange={(event) => setFormData({ ...formData, customReason: event.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                />
              </div>
            )}

            <div className="rounded border border-gray-200 p-3 text-sm space-y-2">
              <div className="flex justify-between">
                <span>Pagamentos em aberto</span>
                <span>{formatCurrency(selectedOpenAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Multa</span>
                <span>{formatCurrency(parseDecimal(formData.fine))}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2">
                <span>Total previsto</span>
                <span>{formatCurrency(selectedFinalAmount)}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white">
                {editingWithdrawal ? 'Salvar Alterações' : 'Criar Desligamento'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowFormModal(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showSummaryModal} onOpenChange={setShowSummaryModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Valor Final do Desligamento</DialogTitle>
          </DialogHeader>
          {selectedWithdrawal && (
            <div className="space-y-4">
              <div className="text-sm">
                <div className="text-gray-600">Aluno</div>
                <div>{selectedWithdrawal.studentName}</div>
              </div>

              <div className="border border-gray-200 rounded overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-3 py-2 text-gray-600">Mês</th>
                      <th className="text-left px-3 py-2 text-gray-600">Vencimento</th>
                      <th className="text-left px-3 py-2 text-gray-600">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingPaymentsFor(selectedWithdrawal.studentId).map((payment) => (
                      <tr key={payment.id} className="border-b border-gray-100">
                        <td className="px-3 py-2">{payment.month}</td>
                        <td className="px-3 py-2">{new Date(payment.dueDate).toLocaleDateString('pt-BR')}</td>
                        <td className="px-3 py-2">{formatCurrency(payment.amount)}</td>
                      </tr>
                    ))}
                    {pendingPaymentsFor(selectedWithdrawal.studentId).length === 0 && (
                      <tr>
                        <td className="px-3 py-4 text-center text-gray-500" colSpan={3}>
                          Nenhum pagamento em aberto.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="rounded border border-gray-200 p-3 text-sm space-y-2">
                <div className="flex justify-between">
                  <span>Pagamentos em aberto</span>
                  <span>{formatCurrency(calculateOpenPaymentAmount(selectedWithdrawal.studentId))}</span>
                </div>
                <div className="flex justify-between">
                  <span>Multa</span>
                  <span>{formatCurrency(selectedWithdrawal.fine)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2 text-base">
                  <span>Total final</span>
                  <span>{formatCurrency(finalAmountFor(selectedWithdrawal))}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={() => handleComplete(selectedWithdrawal)} disabled={selectedWithdrawal.status === 'Completed'}>
                  Confirmar Desligamento
                </Button>
                <Button variant="outline" onClick={() => setShowSummaryModal(false)}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
