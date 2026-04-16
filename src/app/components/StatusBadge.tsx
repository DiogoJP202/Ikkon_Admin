import { StudentStatus, PaymentStatus } from '../types';

interface StatusBadgeProps {
  status: StudentStatus | PaymentStatus | string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const getStatusClasses = () => {
    switch (status) {
      case 'Active':
      case 'Ativo':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Inactive':
      case 'Inativo':
      case 'Withdrawn':
      case 'Desligado':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'Pending':
      case 'Pendente':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Overdue':
      case 'Atrasado':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Paid':
      case 'Pago':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Trial':
      case 'Aula Experimental':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Registration':
      case 'Matrícula':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Contract':
      case 'Contrato':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'Payment':
      case 'Pagamento':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Completed':
      case 'Concluído':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const translateStatus = (status: string) => {
    const translations: Record<string, string> = {
      'Active': 'Ativo',
      'Inactive': 'Inativo',
      'Pending': 'Pendente',
      'Overdue': 'Atrasado',
      'Paid': 'Pago',
      'Withdrawn': 'Desligado',
      'Trial': 'Aula Experimental',
      'Registration': 'Matrícula',
      'Contract': 'Contrato',
      'Payment': 'Pagamento',
      'Completed': 'Concluído',
    };
    return translations[status] || status;
  };

  return (
    <span className={`px-2 py-1 rounded text-xs border ${getStatusClasses()}`}>
      {translateStatus(status)}
    </span>
  );
}