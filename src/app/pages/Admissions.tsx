import { useState } from 'react';
import { CheckCircle2, Circle, Edit, Plus, Search, Trash2 } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { Button } from '../components/ui/button';
import {
  completeAdmission,
  deleteAdmission,
  saveAdmission,
  useSchoolData,
} from '../data/store';
import { Admission } from '../types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

type AdmissionStatus = Admission['status'];
type AdmissionSource = NonNullable<Admission['source']>;

type AdmissionFormData = {
  studentName: string;
  phone: string;
  email: string;
  source: AdmissionSource;
  status: AdmissionStatus;
  trialDate: string;
  registrationDate: string;
  contractDate: string;
  firstPaymentDate: string;
  integrationDate: string;
  notes: string;
};

type CompleteFormData = {
  className: string;
  monthlyFee: string;
  dueDay: string;
};

const today = () => new Date().toISOString().slice(0, 10);

const steps: Array<{ status: AdmissionStatus; label: string; field: keyof AdmissionFormData }> = [
  { status: 'Trial', label: 'Aula Experimental', field: 'trialDate' },
  { status: 'Registration', label: 'Matrícula', field: 'registrationDate' },
  { status: 'Contract', label: 'Contrato', field: 'contractDate' },
  { status: 'Payment', label: 'Primeiro Pagamento', field: 'firstPaymentDate' },
  { status: 'Completed', label: 'Integração', field: 'integrationDate' },
];

const sources: AdmissionSource[] = ['Indicação', 'Instagram', 'WhatsApp', 'Site', 'Evento', 'Outro'];

const emptyForm = (): AdmissionFormData => ({
  studentName: '',
  phone: '',
  email: '',
  source: 'WhatsApp',
  status: 'Trial',
  trialDate: today(),
  registrationDate: '',
  contractDate: '',
  firstPaymentDate: '',
  integrationDate: '',
  notes: '',
});

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

function formatPhone(value: string) {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }

  return digits
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
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

export function Admissions() {
  const { admissions, classes, settings } = useSchoolData();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [editingAdmission, setEditingAdmission] = useState<Admission | null>(null);
  const [selectedAdmission, setSelectedAdmission] = useState<Admission | null>(null);
  const [formData, setFormData] = useState<AdmissionFormData>(emptyForm());
  const [completeForm, setCompleteForm] = useState<CompleteFormData>({
    className: classes[0]?.name || '',
    monthlyFee: moneyToInput(settings.defaultMonthlyFee),
    dueDay: String(settings.defaultDueDay),
  });
  const [formError, setFormError] = useState('');

  const filteredAdmissions = admissions
    .filter((admission) => {
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        admission.studentName.toLowerCase().includes(search) ||
        (admission.phone || '').includes(searchTerm) ||
        (admission.email || '').toLowerCase().includes(search);
      const matchesStatus = statusFilter === 'Todos' || admission.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => steps.findIndex(step => step.status === b.status) - steps.findIndex(step => step.status === a.status));

  const getStepStatus = (admission: Admission, step: AdmissionStatus) => {
    const currentIndex = steps.findIndex(item => item.status === admission.status);
    const stepIndex = steps.findIndex(item => item.status === step);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'pending';
  };

  const dateForStep = (admission: Admission, step: AdmissionStatus) => {
    const dateByStatus: Record<AdmissionStatus, string | undefined> = {
      Trial: admission.trialDate,
      Registration: admission.registrationDate,
      Contract: admission.contractDate,
      Payment: admission.firstPaymentDate,
      Completed: admission.integrationDate,
    };

    return dateByStatus[step];
  };

  const updateForm = (field: keyof AdmissionFormData, value: string) => {
    setFormData({ ...formData, [field]: value });
    setFormError('');
  };

  const openNewAdmission = () => {
    setEditingAdmission(null);
    setFormData(emptyForm());
    setFormError('');
    setShowFormModal(true);
  };

  const openEditAdmission = (admission: Admission) => {
    setEditingAdmission(admission);
    setFormData({
      studentName: admission.studentName,
      phone: admission.phone ? formatPhone(admission.phone) : '',
      email: admission.email || '',
      source: admission.source || 'WhatsApp',
      status: admission.status,
      trialDate: admission.trialDate || '',
      registrationDate: admission.registrationDate || '',
      contractDate: admission.contractDate || '',
      firstPaymentDate: admission.firstPaymentDate || '',
      integrationDate: admission.integrationDate || '',
      notes: admission.notes || '',
    });
    setFormError('');
    setShowFormModal(true);
  };

  const openDetails = (admission: Admission) => {
    setSelectedAdmission(admission);
    setShowDetailsModal(true);
  };

  const openCompleteAdmission = (admission: Admission) => {
    setSelectedAdmission(admission);
    setCompleteForm({
      className: classes[0]?.name || '',
      monthlyFee: moneyToInput(settings.defaultMonthlyFee),
      dueDay: String(settings.defaultDueDay),
    });
    setFormError('');
    setShowCompleteModal(true);
  };

  const normalizedAdmission = (data: AdmissionFormData): Omit<Admission, 'id'> => {
    return {
      studentName: data.studentName.trim(),
      phone: data.phone.trim() || undefined,
      email: data.email.trim() || undefined,
      source: data.source,
      notes: data.notes.trim() || undefined,
      status: data.status,
      trialDate: data.trialDate || undefined,
      registrationDate: data.registrationDate || undefined,
      contractDate: data.contractDate || undefined,
      firstPaymentDate: data.firstPaymentDate || undefined,
      integrationDate: data.integrationDate || undefined,
    };
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (formData.studentName.trim().length < 3) {
      setFormError('Informe um nome com pelo menos 3 caracteres.');
      return;
    }

    if (formData.phone && onlyDigits(formData.phone).length < 10) {
      setFormError('Informe um telefone com DDD ou deixe o campo vazio.');
      return;
    }

    saveAdmission({
      id: editingAdmission?.id,
      ...normalizedAdmission(formData),
    });

    setShowFormModal(false);
    setEditingAdmission(null);
  };

  const moveAdmission = (admission: Admission, direction: 'next' | 'previous') => {
    const currentIndex = steps.findIndex(step => step.status === admission.status);
    const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    const nextStep = steps[nextIndex];

    if (!nextStep) {
      return;
    }

    const datePatch = !dateForStep(admission, nextStep.status)
      ? { [nextStep.field]: today() }
      : {};

    saveAdmission({
      ...admission,
      ...datePatch,
      status: nextStep.status,
    });
  };

  const handleCompleteAdmission = () => {
    if (!selectedAdmission) {
      return;
    }

    if (!completeForm.className || parseDecimal(completeForm.monthlyFee) <= 0 || Number(completeForm.dueDay) <= 0) {
      setFormError('Informe turma, mensalidade e dia de vencimento.');
      return;
    }

    completeAdmission(selectedAdmission.id, {
      className: completeForm.className,
      monthlyFee: parseDecimal(completeForm.monthlyFee),
      dueDay: Number(completeForm.dueDay),
    });

    setShowCompleteModal(false);
    setSelectedAdmission(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl">Admissões</h2>
        <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={openNewAdmission}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Admissão
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
                placeholder="Nome, telefone ou e-mail..."
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
              {steps.map(step => (
                <option key={step.status} value={step.status}>{step.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredAdmissions.map((admission) => (
          <div key={admission.id} className="bg-white border border-gray-200 rounded p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg">{admission.studentName}</h3>
                <div className="text-sm text-gray-600">
                  {[admission.phone, admission.email, admission.source].filter(Boolean).join(' - ')}
                </div>
              </div>
              <StatusBadge status={admission.status} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {steps.map((step) => {
                const status = getStepStatus(admission, step.status);
                const date = dateForStep(admission, step.status);

                return (
                  <div key={step.status} className="border border-gray-200 rounded p-3">
                    <div className="flex items-center gap-2 mb-2">
                      {status === 'completed' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : status === 'current' ? (
                        <Circle className="w-5 h-5 text-blue-600 fill-blue-600" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-300" />
                      )}
                      <span className="text-sm">{step.label}</span>
                    </div>
                    <div className="text-xs text-gray-500 ml-7">
                      {date ? new Date(date).toLocaleDateString('pt-BR') : 'Sem data'}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              <Button size="sm" variant="outline" onClick={() => moveAdmission(admission, 'previous')} disabled={admission.status === 'Trial'}>
                Voltar Etapa
              </Button>
              <Button size="sm" variant="outline" onClick={() => moveAdmission(admission, 'next')} disabled={admission.status === 'Completed'}>
                Avançar Etapa
              </Button>
              <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => openCompleteAdmission(admission)} disabled={admission.status === 'Completed'}>
                Concluir e Criar Aluno
              </Button>
              <Button size="sm" variant="outline" onClick={() => openDetails(admission)}>
                Ver Detalhes
              </Button>
              <Button size="sm" variant="outline" onClick={() => openEditAdmission(admission)}>
                <Edit className="w-4 h-4" />
                Editar
              </Button>
              <Button size="sm" variant="outline" className="text-red-600" onClick={() => deleteAdmission(admission.id)}>
                <Trash2 className="w-4 h-4" />
                Excluir
              </Button>
            </div>
          </div>
        ))}

        {filteredAdmissions.length === 0 && (
          <div className="bg-white border border-gray-200 rounded p-6 text-center text-sm text-gray-500">
            Nenhuma admissão encontrada.
          </div>
        )}
      </div>

      <Dialog open={showFormModal} onOpenChange={setShowFormModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAdmission ? 'Editar Admissão' : 'Nova Admissão'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-sm text-gray-600 mb-1">Nome do Aluno</label>
              <input
                type="text"
                minLength={3}
                autoComplete="name"
                placeholder="Ex: Lucas Martins"
                value={formData.studentName}
                onChange={(event) => updateForm('studentName', event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Telefone / WhatsApp</label>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="(11) 99999-9999"
                  maxLength={15}
                  value={formData.phone}
                  onChange={(event) => updateForm('phone', formatPhone(event.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">E-mail</label>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="aluno@email.com"
                  value={formData.email}
                  onChange={(event) => updateForm('email', event.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Origem do Contato</label>
                <select
                  value={formData.source}
                  onChange={(event) => updateForm('source', event.target.value as AdmissionSource)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                >
                  {sources.map(source => (
                    <option key={source} value={source}>{source}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Etapa Atual</label>
                <select
                  value={formData.status}
                  onChange={(event) => {
                    const status = event.target.value as AdmissionStatus;
                    const step = steps.find(item => item.status === status);
                    setFormData({
                      ...formData,
                      status,
                      ...(step && !formData[step.field] ? { [step.field]: today() } : {}),
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                >
                  {steps.map(step => (
                    <option key={step.status} value={step.status}>{step.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {steps.map(step => (
                <div key={step.status}>
                  <label className="block text-sm text-gray-600 mb-1">{step.label}</label>
                  <input
                    type="date"
                    value={formData[step.field]}
                    onChange={(event) => updateForm(step.field, event.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Observações</label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(event) => updateForm('notes', event.target.value)}
                placeholder="Interesse, disponibilidade, histórico ou detalhes da negociação"
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white">
                {editingAdmission ? 'Salvar Alterações' : 'Criar Admissão'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowFormModal(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes da Admissão</DialogTitle>
          </DialogHeader>
          {selectedAdmission && (
            <div className="space-y-4 text-sm">
              <div>
                <div className="text-gray-600">Aluno</div>
                <div>{selectedAdmission.studentName}</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-gray-600">Telefone</div>
                  <div>{selectedAdmission.phone || '-'}</div>
                </div>
                <div>
                  <div className="text-gray-600">E-mail</div>
                  <div>{selectedAdmission.email || '-'}</div>
                </div>
                <div>
                  <div className="text-gray-600">Origem</div>
                  <div>{selectedAdmission.source || '-'}</div>
                </div>
                <div>
                  <div className="text-gray-600">Status</div>
                  <div className="mt-1"><StatusBadge status={selectedAdmission.status} /></div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {steps.map(step => {
                  const date = dateForStep(selectedAdmission, step.status);
                  return (
                    <div key={step.status}>
                      <div className="text-gray-600">{step.label}</div>
                      <div>{date ? new Date(date).toLocaleDateString('pt-BR') : '-'}</div>
                    </div>
                  );
                })}
              </div>
              {selectedAdmission.notes && (
                <div>
                  <div className="text-gray-600">Observações</div>
                  <div>{selectedAdmission.notes}</div>
                </div>
              )}
              <Button variant="outline" onClick={() => setShowDetailsModal(false)}>
                Fechar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showCompleteModal} onOpenChange={setShowCompleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Concluir Admissão</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {formError && (
              <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {formError}
              </div>
            )}
            <div className="text-sm">
              Criar aluno ativo para <strong>{selectedAdmission?.studentName}</strong>.
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Turma</label>
              <select
                value={completeForm.className}
                onChange={(event) => setCompleteForm({ ...completeForm, className: event.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              >
                <option value="">Selecione uma turma</option>
                {classes.map(classItem => (
                  <option key={classItem.id} value={classItem.name}>{classItem.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Mensalidade</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={completeForm.monthlyFee}
                    onChange={(event) => setCompleteForm({ ...completeForm, monthlyFee: event.target.value.replace(/[^\d,.]/g, '') })}
                    onBlur={() => setCompleteForm({ ...completeForm, monthlyFee: moneyToInput(completeForm.monthlyFee) })}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Dia de Vencimento</label>
                <select
                  value={completeForm.dueDay}
                  onChange={(event) => setCompleteForm({ ...completeForm, dueDay: event.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                >
                  {Array.from({ length: 31 }, (_, index) => String(index + 1)).map(day => (
                    <option key={day} value={day}>Dia {day}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleCompleteAdmission}>
                Concluir e Criar Aluno
              </Button>
              <Button variant="outline" onClick={() => setShowCompleteModal(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
