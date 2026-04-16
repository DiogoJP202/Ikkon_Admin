import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { saveStudent, useSchoolData } from '../data/store';
import { StudentStatus } from '../types';

const today = () => new Date().toISOString().slice(0, 10);

const levels = [
  'Iniciante',
  'Intermediário',
  'Avançado',
  'Infantil',
  'Adulto',
];

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

function formatCpf(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
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

export function StudentForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = id && id !== 'new';
  const { students, classes, settings } = useSchoolData();
  const student = isEditMode ? students.find(s => s.id === id) : null;
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [formData, setFormData] = useState({
    name: student?.name || '',
    birthDate: student?.birthDate || '',
    cpf: student?.cpf ? formatCpf(student.cpf) : '',
    phone: student?.phone ? formatPhone(student.phone) : '',
    email: student?.email || '',
    address: student?.address || '',
    startDate: student?.startDate || today(),
    class: student?.class || '',
    status: student?.status || 'Active',
    level: student?.level || '',
    monthlyFee: student?.monthlyFee ? moneyToInput(student.monthlyFee) : moneyToInput(settings.defaultMonthlyFee),
    dueDay: student?.dueDay ? String(student.dueDay) : String(settings.defaultDueDay),
    discount: student?.discount ? String(student.discount) : '0',
    notes: student?.notes || '',
    contractSigned: student?.checklist.contractSigned || false,
    whatsappAdded: student?.checklist.whatsappAdded || false,
    driveAccess: student?.checklist.driveAccess || false,
  });

  const classOptions = classes.length > 0
    ? classes.map((classItem) => classItem.name)
    : Array.from(new Set(students.map((item) => item.class).filter(Boolean)));

  const updateField = (field: keyof typeof formData, value: string | boolean) => {
    setFormData({ ...formData, [field]: value });
    setErrorMessage('');
    setSuccessMessage('');
  };

  const validateForm = () => {
    if (formData.name.trim().length < 3) {
      return 'Informe um nome com pelo menos 3 caracteres.';
    }

    if (onlyDigits(formData.phone).length < 10) {
      return 'Informe um telefone com DDD.';
    }

    if (formData.cpf && onlyDigits(formData.cpf).length !== 11) {
      return 'CPF deve ter 11 dígitos.';
    }

    if (!formData.class) {
      return 'Selecione uma turma.';
    }

    if (parseDecimal(formData.monthlyFee) <= 0) {
      return 'Informe uma mensalidade válida.';
    }

    return '';
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    const savedStudent = saveStudent({
      id: student?.id,
      name: formData.name.trim(),
      birthDate: formData.birthDate,
      cpf: formData.cpf.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      address: formData.address.trim(),
      startDate: formData.startDate,
      class: formData.class,
      status: formData.status as StudentStatus,
      level: formData.level,
      monthlyFee: parseDecimal(formData.monthlyFee),
      dueDay: Number(formData.dueDay),
      discount: formData.discount ? Number(formData.discount) : undefined,
      notes: formData.notes.trim() || undefined,
      checklist: {
        contractSigned: formData.contractSigned,
        whatsappAdded: formData.whatsappAdded,
        driveAccess: formData.driveAccess,
      },
    });

    setSuccessMessage('Aluno salvo com sucesso.');
    setTimeout(() => navigate(`/students/${savedStudent.id}`), 250);
  };

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/students')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-2xl">
          {isEditMode ? 'Editar Aluno' : 'Novo Aluno'}
        </h2>
      </div>

      <form onSubmit={handleSubmit}>
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded p-3 mb-4 text-sm">
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 mb-4 text-sm">
            {errorMessage}
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded p-4 mb-4">
          <h3 className="text-lg mb-4">Dados Pessoais</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Nome Completo *</label>
              <input
                type="text"
                required
                minLength={3}
                autoComplete="name"
                placeholder="Ex: Carlos Silva"
                value={formData.name}
                onChange={(event) => updateField('name', event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Data de Nascimento</label>
              <input
                type="date"
                max={today()}
                value={formData.birthDate}
                onChange={(event) => updateField('birthDate', event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">CPF</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="000.000.000-00"
                maxLength={14}
                value={formData.cpf}
                onChange={(event) => updateField('cpf', formatCpf(event.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Telefone / WhatsApp *</label>
              <input
                type="tel"
                required
                inputMode="tel"
                autoComplete="tel"
                placeholder="(11) 99999-9999"
                maxLength={15}
                value={formData.phone}
                onChange={(event) => updateField('phone', formatPhone(event.target.value))}
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
                onChange={(event) => updateField('email', event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-600 mb-1">Endereço</label>
              <textarea
                rows={2}
                autoComplete="street-address"
                placeholder="Rua, número, bairro, cidade"
                value={formData.address}
                onChange={(event) => updateField('address', event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded p-4 mb-4">
          <h3 className="text-lg mb-4">Dados Acadêmicos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Data de Início *</label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(event) => updateField('startDate', event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Turma *</label>
              <select
                required
                value={formData.class}
                onChange={(event) => updateField('class', event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              >
                <option value="">Selecione uma turma</option>
                {classOptions.map((className) => (
                  <option key={className} value={className}>{className}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(event) => updateField('status', event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              >
                <option value="Active">Ativo</option>
                <option value="Pending">Pendente</option>
                <option value="Inactive">Inativo</option>
                <option value="Withdrawn">Desligado</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Nível / Faixa</label>
              <select
                value={formData.level}
                onChange={(event) => updateField('level', event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              >
                <option value="">Selecione um nível</option>
                {levels.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded p-4 mb-4">
          <h3 className="text-lg mb-4">Dados Financeiros</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Mensalidade *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">R$</span>
                <input
                  type="text"
                  required
                  inputMode="decimal"
                  placeholder="250,00"
                  value={formData.monthlyFee}
                  onChange={(event) => updateField('monthlyFee', event.target.value.replace(/[^\d,.]/g, ''))}
                  onBlur={() => updateField('monthlyFee', moneyToInput(formData.monthlyFee))}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Dia de Vencimento *</label>
              <select
                required
                value={formData.dueDay}
                onChange={(event) => updateField('dueDay', event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              >
                {Array.from({ length: 31 }, (_, index) => String(index + 1)).map((day) => (
                  <option key={day} value={day}>Dia {day}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm text-gray-600">Desconto</label>
                <span className="text-sm text-gray-700">{formData.discount || 0}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={formData.discount || '0'}
                onChange={(event) => updateField('discount', event.target.value)}
                className="w-full"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-600 mb-1">Observações</label>
              <textarea
                value={formData.notes}
                onChange={(event) => updateField('notes', event.target.value)}
                rows={3}
                placeholder="Informações médicas, restrições, acordos financeiros ou observações internas"
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded p-4 mb-4">
          <h3 className="text-lg mb-4">Checklist</h3>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.contractSigned}
                onChange={(event) => updateField('contractSigned', event.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Contrato assinado</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.whatsappAdded}
                onChange={(event) => updateField('whatsappAdded', event.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Adicionado ao grupo do WhatsApp</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.driveAccess}
                onChange={(event) => updateField('driveAccess', event.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Acesso ao Drive concedido</span>
            </label>
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white">
            {isEditMode ? 'Salvar Alterações' : 'Criar Aluno'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/students')}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
