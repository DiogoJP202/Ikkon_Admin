interface KPICardProps {
  title: string;
  value: string | number;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export function KPICard({ title, value, variant = 'default' }: KPICardProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'danger':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-white';
    }
  };

  return (
    <div className={`p-4 border rounded ${getVariantClasses()}`}>
      <div className="text-sm text-gray-600">{title}</div>
      <div className="text-2xl mt-1">{value}</div>
    </div>
  );
}
