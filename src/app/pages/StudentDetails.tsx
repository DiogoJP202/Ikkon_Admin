import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { ArrowLeft, Edit } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { StatusBadge } from '../components/StatusBadge';
import {
  deactivateStudent,
  getOrCreateCurrentPayment,
  registerPayment,
  useSchoolData,
} from '../data/store';
import { Payment, PaymentMethod } from '../types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

export function StudentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { students, payments } = useSchoolData();
  const student = students.find(s => s.id === id);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [paymentNotes, setPaymentNotes] = useState('');

  if (!student) {
    return <div>Aluno não encontrado</div>;
  }

  const studentPayments = payments
    .filter(p => p.studentId === id)
    .sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime());

  const openPaymentModal = () => {
    const payment = getOrCreateCurrentPayment(student);
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
  };

  return (
    <div className="max-w-6xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/students')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-2xl flex-1">{student.name}</h2>
        <Link to={`/students/${id}/edit`}>
          <Button variant="outline">
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>
        </Link>
        <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={openPaymentModal}>
          Registrar Pagamento
        </Button>
        <Button
          variant="outline"
          className="text-red-600"
          onClick={() => deactivateStudent(student.id)}
          disabled={student.status === 'Inactive'}
        >
          Desativar
        </Button>
      </div>

      <div className="bg-white border border-gray-200 rounded p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-600">Status</div>
            <div className="mt-1">
              <StatusBadge status={student.status} />
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Turma</div>
            <div className="mt-1">{student.class}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Nível</div>
            <div className="mt-1">{student.level || '-'}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Mensalidade</div>
            <div className="mt-1">R$ {student.monthlyFee}</div>
          </div>
        </div>
      </div>

      <Tabs defaultValue={searchParams.get('tab') || 'summary'} className="w-full">
        <TabsList>
          <TabsTrigger value="summary">Resumo</TabsTrigger>
          <TabsTrigger value="financial">Histórico Financeiro</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
          <TabsTrigger value="graduation">Graduação</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-200 rounded p-4">
              <h3 className="text-lg mb-4">Informações Pessoais</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-gray-600">Data de Nascimento</div>
                  <div>{student.birthDate ? new Date(student.birthDate).toLocaleDateString('pt-BR') : '-'}</div>
                </div>
                <div>
                  <div className="text-gray-600">CPF</div>
                  <div>{student.cpf || '-'}</div>
                </div>
                <div>
                  <div className="text-gray-600">Telefone</div>
                  <div>{student.phone || '-'}</div>
                </div>
                <div>
                  <div className="text-gray-600">E-mail</div>
                  <div>{student.email || '-'}</div>
                </div>
                <div>
                  <div className="text-gray-600">Endereço</div>
                  <div>{student.address || '-'}</div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded p-4">
              <h3 className="text-lg mb-4">Informações Acadêmicas</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-gray-600">Data de Início</div>
                  <div>{student.startDate ? new Date(student.startDate).toLocaleDateString('pt-BR') : '-'}</div>
                </div>
                <div>
                  <div className="text-gray-600">Dia de Vencimento</div>
                  <div>Dia {student.dueDay}</div>
                </div>
                {student.discount && (
                  <div>
                    <div className="text-gray-600">Desconto</div>
                    <div>{student.discount}%</div>
                  </div>
                )}
                {student.notes && (
                  <div>
                    <div className="text-gray-600">Observações</div>
                    <div>{student.notes}</div>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-sm mb-2">Checklist</h4>
                <div className="space-y-1 text-sm">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={student.checklist.contractSigned} readOnly className="w-4 h-4" />
                    <span>Contrato assinado</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={student.checklist.whatsappAdded} readOnly className="w-4 h-4" />
                    <span>Adicionado ao grupo do WhatsApp</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={student.checklist.driveAccess} readOnly className="w-4 h-4" />
                    <span>Acesso ao Drive concedido</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="financial" className="mt-4">
          <div className="bg-white border border-gray-200 rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-600">Mês</th>
                  <th className="text-left px-4 py-3 text-gray-600">Valor</th>
                  <th className="text-left px-4 py-3 text-gray-600">Vencimento</th>
                  <th className="text-left px-4 py-3 text-gray-600">Data Pagamento</th>
                  <th className="text-left px-4 py-3 text-gray-600">Método</th>
                  <th className="text-left px-4 py-3 text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {studentPayments.map((payment) => (
                  <tr key={payment.id} className="border-b border-gray-100">
                    <td className="px-4 py-3">{payment.month}</td>
                    <td className="px-4 py-3">R$ {payment.amount}</td>
                    <td className="px-4 py-3">{new Date(payment.dueDate).toLocaleDateString('pt-BR')}</td>
                    <td className="px-4 py-3">
                      {payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="px-4 py-3">{payment.paymentMethod || '-'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={payment.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <div className="bg-white border border-gray-200 rounded p-4">
            <div className="text-sm text-gray-500">Nenhum registro de histórico ainda.</div>
          </div>
        </TabsContent>

        <TabsContent value="graduation" className="mt-4">
          <div className="bg-white border border-gray-200 rounded p-4">
            <div className="text-sm text-gray-500">Nenhum registro de graduação ainda.</div>
          </div>
        </TabsContent>
      </Tabs>

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
                value={student.name}
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
