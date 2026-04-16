// Types for the Taiko school management system

export type StudentStatus = 'Active' | 'Inactive' | 'Pending' | 'Withdrawn';
export type PaymentStatus = 'Paid' | 'Pending' | 'Overdue';
export type PaymentMethod = 'Cash' | 'Credit Card' | 'Debit Card' | 'Bank Transfer' | 'PIX';

export interface Student {
  id: string;
  name: string;
  birthDate: string;
  cpf: string;
  phone: string;
  email: string;
  address: string;
  startDate: string;
  class: string;
  status: StudentStatus;
  level: string;
  monthlyFee: number;
  dueDay: number;
  discount?: number;
  notes?: string;
  checklist: {
    contractSigned: boolean;
    whatsappAdded: boolean;
    driveAccess: boolean;
  };
}

export interface Payment {
  id: string;
  studentId: string;
  studentName: string;
  class: string;
  month: string;
  amount: number;
  dueDate: string;
  status: PaymentStatus;
  paymentDate?: string;
  paymentMethod?: PaymentMethod;
  notes?: string;
}

export interface Class {
  id: string;
  name: string;
  schedule: string;
  instructor: string;
  studentCount: number;
}

export interface Admission {
  id: string;
  studentName: string;
  phone?: string;
  email?: string;
  source?: 'Indicação' | 'Instagram' | 'WhatsApp' | 'Site' | 'Evento' | 'Outro';
  notes?: string;
  trialDate?: string;
  registrationDate?: string;
  contractDate?: string;
  firstPaymentDate?: string;
  integrationDate?: string;
  status: 'Trial' | 'Registration' | 'Contract' | 'Payment' | 'Completed';
}

export interface Withdrawal {
  id: string;
  studentId: string;
  studentName: string;
  requestDate: string;
  reason: string;
  pendingPayments: number;
  fine: number;
  status: 'Pending' | 'Completed';
}

export interface GraduationEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  studentIds: string[];
  targetRank: string;
  instructor: string;
  fee: number;
  notes?: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  result?: 'Approved' | 'Rejected';
}

export interface AppSettings {
  schoolName: string;
  phone: string;
  email: string;
  address: string;
  adminName: string;
  defaultMonthlyFee: number;
  defaultDueDay: number;
  lateFeePercentage: number;
  withdrawalFine: number;
}
