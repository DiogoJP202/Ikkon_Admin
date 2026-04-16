import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Button } from '../components/ui/button';
import { defaultSettings, saveSettings, useSchoolData } from '../data/store';
import { AppSettings } from '../types';

type SettingsForm = {
  schoolName: string;
  phone: string;
  email: string;
  address: string;
  adminName: string;
  defaultMonthlyFee: string;
  defaultDueDay: string;
  lateFeePercentage: string;
  withdrawalFine: string;
};

const currencyInputPattern = /[^\d,.]/g;

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

function formatPhone(value: string) {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function parseCurrency(value: string) {
  const normalized = value.replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parsePercentage(value: string) {
  const parsed = Number(value.replace(/[^\d,.]/g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function clampPercentage(value: string) {
  return String(Math.min(Math.max(parsePercentage(value), 0), 50));
}

function decimalToInput(value: number) {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function toForm(settings: AppSettings): SettingsForm {
  return {
    schoolName: settings.schoolName,
    phone: formatPhone(settings.phone),
    email: settings.email,
    address: settings.address,
    adminName: settings.adminName,
    defaultMonthlyFee: decimalToInput(settings.defaultMonthlyFee),
    defaultDueDay: String(settings.defaultDueDay),
    lateFeePercentage: String(settings.lateFeePercentage),
    withdrawalFine: decimalToInput(settings.withdrawalFine)
  };
}

function toSettings(form: SettingsForm): AppSettings {
  return {
    schoolName: form.schoolName.trim(),
    phone: formatPhone(form.phone),
    email: form.email.trim().toLowerCase(),
    address: form.address.trim(),
    adminName: form.adminName.trim(),
    defaultMonthlyFee: parseCurrency(form.defaultMonthlyFee),
    defaultDueDay: Number(form.defaultDueDay),
    lateFeePercentage: parsePercentage(form.lateFeePercentage),
    withdrawalFine: parseCurrency(form.withdrawalFine)
  };
}

function getValidationMessage(form: SettingsForm) {
  const phoneDigits = onlyDigits(form.phone);
  const monthlyFee = parseCurrency(form.defaultMonthlyFee);
  const dueDay = Number(form.defaultDueDay);
  const withdrawalFine = parseCurrency(form.withdrawalFine);

  if (form.schoolName.trim().length < 3) {
    return 'Informe o nome da escola com pelo menos 3 caracteres.';
  }

  if (form.adminName.trim().length < 3) {
    return 'Informe o nome do administrador com pelo menos 3 caracteres.';
  }

  if (form.phone && phoneDigits.length < 10) {
    return 'Informe um telefone com DDD.';
  }

  if (monthlyFee <= 0) {
    return 'Informe uma mensalidade padrão maior que zero.';
  }

  if (dueDay < 1 || dueDay > 31) {
    return 'Escolha um dia de vencimento válido.';
  }

  if (withdrawalFine < 0) {
    return 'A multa de desistência não pode ser negativa.';
  }

  return '';
}

export function Settings() {
  const { settings } = useSchoolData();
  const [formData, setFormData] = useState<SettingsForm>(() => toForm(settings));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const dueDays = useMemo(() => Array.from({ length: 31 }, (_, index) => index + 1), []);

  useEffect(() => {
    setFormData(toForm(settings));
  }, [settings]);

  function updateField(field: keyof SettingsForm, value: string) {
    setFormData((current) => ({
      ...current,
      [field]: value
    }));
    setSaved(false);
    setError('');
  }

  function updateCurrencyField(field: 'defaultMonthlyFee' | 'withdrawalFine', value: string) {
    updateField(field, value.replace(currencyInputPattern, ''));
  }

  function normalizeCurrencyField(field: 'defaultMonthlyFee' | 'withdrawalFine') {
    updateField(field, decimalToInput(parseCurrency(formData[field])));
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationMessage = getValidationMessage(formData);
    if (validationMessage) {
      setError(validationMessage);
      setSaved(false);
      return;
    }

    saveSettings(toSettings(formData));
    setSaved(true);
    setError('');
  };

  const handleReset = () => {
    saveSettings(defaultSettings);
    setFormData(toForm(defaultSettings));
    setSaved(true);
    setError('');
  };

  const lateFeeValue = parsePercentage(formData.lateFeePercentage);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Configurações</h2>
        <p className="text-gray-600 mt-2">Ajuste os dados da escola e os padrões usados nas outras áreas.</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
        <section className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Informações da Escola</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-1">
              <span className="block text-sm font-medium text-gray-700">Nome da escola</span>
              <input
                type="text"
                minLength={3}
                required
                autoComplete="organization"
                placeholder="Escola de Taiko"
                value={formData.schoolName}
                onChange={(event) => updateField('schoolName', event.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#C91F3B] focus:border-transparent outline-none"
              />
            </label>

            <label className="space-y-1">
              <span className="block text-sm font-medium text-gray-700">Telefone</span>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                maxLength={15}
                placeholder="(11) 99999-9999"
                value={formData.phone}
                onChange={(event) => updateField('phone', formatPhone(event.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#C91F3B] focus:border-transparent outline-none"
              />
            </label>

            <label className="space-y-1">
              <span className="block text-sm font-medium text-gray-700">E-mail</span>
              <input
                type="email"
                autoComplete="email"
                placeholder="contato@escola.com"
                value={formData.email}
                onChange={(event) => updateField('email', event.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#C91F3B] focus:border-transparent outline-none"
              />
            </label>

            <label className="space-y-1">
              <span className="block text-sm font-medium text-gray-700">Administrador</span>
              <input
                type="text"
                minLength={3}
                required
                autoComplete="name"
                placeholder="Nome do responsável"
                value={formData.adminName}
                onChange={(event) => updateField('adminName', event.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#C91F3B] focus:border-transparent outline-none"
              />
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="block text-sm font-medium text-gray-700">Endereço</span>
              <textarea
                rows={3}
                autoComplete="street-address"
                placeholder="Rua, número, bairro, cidade e estado"
                value={formData.address}
                onChange={(event) => updateField('address', event.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#C91F3B] focus:border-transparent outline-none resize-none"
              />
            </label>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Padrões Financeiros</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-1">
              <span className="block text-sm font-medium text-gray-700">Mensalidade padrão</span>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">R$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  placeholder="350,00"
                  value={formData.defaultMonthlyFee}
                  onChange={(event) => updateCurrencyField('defaultMonthlyFee', event.target.value)}
                  onBlur={() => normalizeCurrencyField('defaultMonthlyFee')}
                  className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 focus:ring-2 focus:ring-[#C91F3B] focus:border-transparent outline-none"
                />
              </div>
            </label>

            <label className="space-y-1">
              <span className="block text-sm font-medium text-gray-700">Dia de vencimento padrão</span>
              <select
                required
                value={formData.defaultDueDay}
                onChange={(event) => updateField('defaultDueDay', event.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#C91F3B] focus:border-transparent outline-none bg-white"
              >
                {dueDays.map((day) => (
                  <option key={day} value={day}>
                    Dia {day}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="block text-sm font-medium text-gray-700">Juros por atraso</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="50"
                    step="0.5"
                    value={formData.lateFeePercentage}
                    onChange={(event) => updateField('lateFeePercentage', event.target.value)}
                    onBlur={() => updateField('lateFeePercentage', clampPercentage(formData.lateFeePercentage))}
                    className="w-20 border border-gray-300 rounded-lg px-2 py-1 text-right text-sm focus:ring-2 focus:ring-[#C91F3B] focus:border-transparent outline-none"
                  />
                  <span className="text-sm text-gray-600">%</span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="0.5"
                value={lateFeeValue}
                onChange={(event) => updateField('lateFeePercentage', event.target.value)}
                className="w-full accent-[#C91F3B]"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
              </div>
            </label>

            <label className="space-y-1">
              <span className="block text-sm font-medium text-gray-700">Multa de desistência</span>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">R$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="150,00"
                  value={formData.withdrawalFine}
                  onChange={(event) => updateCurrencyField('withdrawalFine', event.target.value)}
                  onBlur={() => normalizeCurrencyField('withdrawalFine')}
                  className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 focus:ring-2 focus:ring-[#C91F3B] focus:border-transparent outline-none"
                />
              </div>
            </label>
          </div>
        </section>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {saved && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            Configurações salvas com sucesso.
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="submit" className="bg-[#C91F3B] hover:bg-[#A01830]">
            Salvar configurações
          </Button>
          <Button type="button" variant="outline" onClick={handleReset}>
            Restaurar padrões
          </Button>
        </div>
      </form>
    </div>
  );
}
