import { useEffect, useState } from 'react';
import { mockAdmissions, mockClasses, mockPayments, mockStudents, mockWithdrawals } from './mockData';
import { Admission, AppSettings, Class, GraduationEvent, Payment, PaymentMethod, Student, Withdrawal } from '../types';

const STUDENTS_KEY = 'ikko:students';
const PAYMENTS_KEY = 'ikko:payments';
const CLASSES_KEY = 'ikko:classes';
const ADMISSIONS_KEY = 'ikko:admissions';
const WITHDRAWALS_KEY = 'ikko:withdrawals';
const GRADUATIONS_KEY = 'ikko:graduations';
const SETTINGS_KEY = 'ikko:settings';
const STORE_EVENT = 'ikko:data-changed';

type StudentInput = Omit<Student, 'id'> & { id?: string };
type ClassInput = Omit<Class, 'id' | 'studentCount'> & { id?: string };
type PaymentInput = Omit<Payment, 'id' | 'status'> & {
  id?: string;
  status?: Payment['status'];
};
type AdmissionInput = Omit<Admission, 'id'> & { id?: string };
type WithdrawalInput = Omit<Withdrawal, 'id' | 'studentName' | 'pendingPayments'> & {
  id?: string;
  studentName?: string;
  pendingPayments?: number;
};
type GraduationInput = Omit<GraduationEvent, 'id'> & { id?: string };

export const defaultSettings: AppSettings = {
  schoolName: 'Escola de Taiko',
  phone: '(11) 99999-9999',
  email: 'contato@escolataiko.com',
  address: 'São Paulo, SP',
  adminName: 'Usuário Admin',
  defaultMonthlyFee: 250,
  defaultDueDay: 10,
  lateFeePercentage: 2,
  withdrawalFine: 50,
};

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const stored = window.localStorage.getItem(key);
    return stored ? JSON.parse(stored) as T : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event(STORE_EVENT));
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function dueDateFor(month: string, dueDay: number) {
  const safeDay = Math.min(Math.max(Number(dueDay) || 1, 1), 28);
  return `${month}-${String(safeDay).padStart(2, '0')}`;
}

export function getStudents() {
  return readJson<Student[]>(STUDENTS_KEY, mockStudents);
}

export function getPayments() {
  return readJson<Payment[]>(PAYMENTS_KEY, mockPayments);
}

export function getClasses() {
  return readJson<Class[]>(CLASSES_KEY, mockClasses);
}

export function getAdmissions() {
  return readJson<Admission[]>(ADMISSIONS_KEY, mockAdmissions);
}

export function getWithdrawals() {
  return readJson<Withdrawal[]>(WITHDRAWALS_KEY, mockWithdrawals);
}

export function getGraduations() {
  return readJson<GraduationEvent[]>(GRADUATIONS_KEY, []);
}

export function getSettings() {
  return readJson<AppSettings>(SETTINGS_KEY, defaultSettings);
}

export function saveSettings(input: AppSettings) {
  const settings: AppSettings = {
    schoolName: input.schoolName.trim() || defaultSettings.schoolName,
    phone: input.phone.trim(),
    email: input.email.trim(),
    address: input.address.trim(),
    adminName: input.adminName.trim() || defaultSettings.adminName,
    defaultMonthlyFee: Number(input.defaultMonthlyFee) || defaultSettings.defaultMonthlyFee,
    defaultDueDay: Math.min(Math.max(Number(input.defaultDueDay) || defaultSettings.defaultDueDay, 1), 31),
    lateFeePercentage: Math.max(Number(input.lateFeePercentage) || 0, 0),
    withdrawalFine: Math.max(Number(input.withdrawalFine) || 0, 0),
  };

  writeJson(SETTINGS_KEY, settings);
  return settings;
}

export function saveStudent(input: StudentInput) {
  const students = getStudents();
  const student: Student = {
    ...input,
    id: input.id || createId('student'),
    monthlyFee: Number(input.monthlyFee) || 0,
    dueDay: Number(input.dueDay) || 1,
    discount: input.discount ? Number(input.discount) : undefined,
  };

  const exists = students.some((item) => item.id === student.id);
  const nextStudents = exists
    ? students.map((item) => item.id === student.id ? student : item)
    : [student, ...students];

  writeJson(STUDENTS_KEY, nextStudents);

  if (!exists) {
    const month = currentMonth();
    const amount = student.discount
      ? student.monthlyFee * (1 - student.discount / 100)
      : student.monthlyFee;

    writeJson(PAYMENTS_KEY, [
      {
        id: createId('payment'),
        studentId: student.id,
        studentName: student.name,
        class: student.class,
        month,
        amount: Math.round(amount * 100) / 100,
        dueDate: dueDateFor(month, student.dueDay),
        status: 'Pending',
      },
      ...getPayments(),
    ]);
  } else {
    const payments = getPayments().map((payment) => (
      payment.studentId === student.id
        ? { ...payment, studentName: student.name, class: student.class }
        : payment
    ));
    writeJson(PAYMENTS_KEY, payments);
  }

  return student;
}

export function deactivateStudent(studentId: string) {
  writeJson(
    STUDENTS_KEY,
    getStudents().map((student) => (
      student.id === studentId ? { ...student, status: 'Inactive' } : student
    )),
  );
}

export function getOrCreateCurrentPayment(student: Student) {
  const payments = getPayments();
  const month = currentMonth();
  const existing = payments.find((payment) => (
    payment.studentId === student.id &&
    payment.month === month &&
    payment.status !== 'Paid'
  ));

  if (existing) {
    return existing;
  }

  const amount = student.discount
    ? student.monthlyFee * (1 - student.discount / 100)
    : student.monthlyFee;

  const payment: Payment = {
    id: createId('payment'),
    studentId: student.id,
    studentName: student.name,
    class: student.class,
    month,
    amount: Math.round(amount * 100) / 100,
    dueDate: dueDateFor(month, student.dueDay),
    status: 'Pending',
  };

  writeJson(PAYMENTS_KEY, [payment, ...payments]);
  return payment;
}

export function registerPayment(
  paymentId: string,
  data: {
    amount?: number;
    paymentDate: string;
    paymentMethod: PaymentMethod;
    notes?: string;
  },
) {
  writeJson(
    PAYMENTS_KEY,
    getPayments().map((payment) => (
      payment.id === paymentId
        ? {
            ...payment,
            amount: Number(data.amount) || payment.amount,
            status: 'Paid',
            paymentDate: data.paymentDate,
            paymentMethod: data.paymentMethod,
            notes: data.notes,
          }
        : payment
    )),
  );
}

export function savePayment(input: PaymentInput) {
  const payments = getPayments();
  const payment: Payment = {
    ...input,
    id: input.id || createId('payment'),
    amount: Number(input.amount) || 0,
    status: input.status || 'Pending',
    notes: input.notes?.trim() || undefined,
  };

  const exists = payments.some((item) => item.id === payment.id);
  writeJson(
    PAYMENTS_KEY,
    exists
      ? payments.map((item) => item.id === payment.id ? payment : item)
      : [payment, ...payments],
  );

  return payment;
}

export function reopenPayment(paymentId: string) {
  writeJson(
    PAYMENTS_KEY,
    getPayments().map((payment) => (
      payment.id === paymentId
        ? {
            ...payment,
            status: 'Pending',
            paymentDate: undefined,
            paymentMethod: undefined,
          }
        : payment
    )),
  );
}

export function deletePayment(paymentId: string) {
  writeJson(
    PAYMENTS_KEY,
    getPayments().filter((payment) => payment.id !== paymentId),
  );
}

export function updateOverduePayments(today = new Date().toISOString().slice(0, 10)) {
  const payments = getPayments();
  let changed = false;

  const nextPayments = payments.map((payment) => {
    if (payment.status === 'Pending' && payment.dueDate < today) {
      changed = true;
      return { ...payment, status: 'Overdue' as const };
    }

    if (payment.status === 'Overdue' && payment.dueDate >= today) {
      changed = true;
      return { ...payment, status: 'Pending' as const };
    }

    return payment;
  });

  if (changed) {
    writeJson(PAYMENTS_KEY, nextPayments);
  }
}

export function saveClass(input: ClassInput) {
  const classes = getClasses();
  const existingClass = input.id ? classes.find((item) => item.id === input.id) : undefined;
  const classItem: Class = {
    id: input.id || createId('class'),
    name: input.name.trim(),
    schedule: input.schedule.trim(),
    instructor: input.instructor.trim(),
    studentCount: existingClass?.studentCount || 0,
  };

  const exists = classes.some((item) => item.id === classItem.id);
  writeJson(
    CLASSES_KEY,
    exists
      ? classes.map((item) => item.id === classItem.id ? classItem : item)
      : [classItem, ...classes],
  );

  if (existingClass && existingClass.name !== classItem.name) {
    writeJson(
      STUDENTS_KEY,
      getStudents().map((student) => (
        student.class === existingClass.name ? { ...student, class: classItem.name } : student
      )),
    );
    writeJson(
      PAYMENTS_KEY,
      getPayments().map((payment) => (
        payment.class === existingClass.name ? { ...payment, class: classItem.name } : payment
      )),
    );
  }

  return classItem;
}

export function deleteClass(classId: string) {
  writeJson(
    CLASSES_KEY,
    getClasses().filter((classItem) => classItem.id !== classId),
  );
}

export function saveAdmission(input: AdmissionInput) {
  const admissions = getAdmissions();
  const admission: Admission = {
    ...input,
    id: input.id || createId('admission'),
    studentName: input.studentName.trim(),
  };

  const exists = admissions.some((item) => item.id === admission.id);
  writeJson(
    ADMISSIONS_KEY,
    exists
      ? admissions.map((item) => item.id === admission.id ? admission : item)
      : [admission, ...admissions],
  );

  return admission;
}

export function deleteAdmission(admissionId: string) {
  writeJson(
    ADMISSIONS_KEY,
    getAdmissions().filter((admission) => admission.id !== admissionId),
  );
}

export function completeAdmission(admissionId: string, data: {
  className: string;
  monthlyFee: number;
  dueDay: number;
}) {
  const admissions = getAdmissions();
  const admission = admissions.find((item) => item.id === admissionId);

  if (!admission) {
    return null;
  }

  const completedAdmission: Admission = {
    ...admission,
    status: 'Completed',
    integrationDate: admission.integrationDate || new Date().toISOString().slice(0, 10),
  };

  writeJson(
    ADMISSIONS_KEY,
    admissions.map((item) => item.id === admissionId ? completedAdmission : item),
  );

  const existingStudent = getStudents().find((student) => (
    student.name.toLowerCase() === admission.studentName.toLowerCase()
  ));

  if (existingStudent) {
    return existingStudent;
  }

  return saveStudent({
    name: admission.studentName,
    birthDate: '',
    cpf: '',
    phone: admission.phone || '',
    email: admission.email || '',
    address: '',
    startDate: completedAdmission.integrationDate || new Date().toISOString().slice(0, 10),
    class: data.className,
    status: 'Active',
    level: '',
    monthlyFee: data.monthlyFee,
    dueDay: data.dueDay,
    notes: admission.notes,
    checklist: {
      contractSigned: Boolean(completedAdmission.contractDate),
      whatsappAdded: true,
      driveAccess: true,
    },
  });
}

export function countOpenPayments(studentId: string) {
  return getPayments().filter((payment) => (
    payment.studentId === studentId && payment.status !== 'Paid'
  )).length;
}

export function calculateOpenPaymentAmount(studentId: string) {
  return getPayments()
    .filter((payment) => payment.studentId === studentId && payment.status !== 'Paid')
    .reduce((sum, payment) => sum + payment.amount, 0);
}

export function saveWithdrawal(input: WithdrawalInput) {
  const withdrawals = getWithdrawals();
  const student = getStudents().find((item) => item.id === input.studentId);
  const withdrawal: Withdrawal = {
    ...input,
    id: input.id || createId('withdrawal'),
    studentName: input.studentName || student?.name || '',
    pendingPayments: input.pendingPayments ?? countOpenPayments(input.studentId),
    fine: Number(input.fine) || 0,
  };

  const exists = withdrawals.some((item) => item.id === withdrawal.id);
  writeJson(
    WITHDRAWALS_KEY,
    exists
      ? withdrawals.map((item) => item.id === withdrawal.id ? withdrawal : item)
      : [withdrawal, ...withdrawals],
  );

  return withdrawal;
}

export function deleteWithdrawal(withdrawalId: string) {
  writeJson(
    WITHDRAWALS_KEY,
    getWithdrawals().filter((withdrawal) => withdrawal.id !== withdrawalId),
  );
}

export function completeWithdrawal(withdrawalId: string) {
  const withdrawals = getWithdrawals();
  const withdrawal = withdrawals.find((item) => item.id === withdrawalId);

  if (!withdrawal) {
    return;
  }

  writeJson(
    WITHDRAWALS_KEY,
    withdrawals.map((item) => (
      item.id === withdrawalId ? { ...item, status: 'Completed' } : item
    )),
  );

  writeJson(
    STUDENTS_KEY,
    getStudents().map((student) => (
      student.id === withdrawal.studentId ? { ...student, status: 'Withdrawn' } : student
    )),
  );
}

export function saveGraduation(input: GraduationInput) {
  const graduations = getGraduations();
  const graduation: GraduationEvent = {
    ...input,
    id: input.id || createId('graduation'),
    title: input.title.trim(),
    location: input.location.trim(),
    instructor: input.instructor.trim(),
    targetRank: input.targetRank.trim(),
    fee: Number(input.fee) || 0,
    notes: input.notes?.trim() || undefined,
  };

  const exists = graduations.some((item) => item.id === graduation.id);
  writeJson(
    GRADUATIONS_KEY,
    exists
      ? graduations.map((item) => item.id === graduation.id ? graduation : item)
      : [graduation, ...graduations],
  );

  return graduation;
}

export function deleteGraduation(graduationId: string) {
  writeJson(
    GRADUATIONS_KEY,
    getGraduations().filter((graduation) => graduation.id !== graduationId),
  );
}

export function cancelGraduation(graduationId: string) {
  writeJson(
    GRADUATIONS_KEY,
    getGraduations().map((graduation) => (
      graduation.id === graduationId
        ? { ...graduation, status: 'Cancelled' }
        : graduation
    )),
  );
}

export function completeGraduation(graduationId: string, result: GraduationEvent['result']) {
  const graduations = getGraduations();
  const graduation = graduations.find((item) => item.id === graduationId);

  if (!graduation) {
    return;
  }

  writeJson(
    GRADUATIONS_KEY,
    graduations.map((item) => (
      item.id === graduationId
        ? { ...item, status: 'Completed', result }
        : item
    )),
  );

  if (result === 'Approved') {
    writeJson(
      STUDENTS_KEY,
      getStudents().map((student) => (
        graduation.studentIds.includes(student.id)
          ? { ...student, level: graduation.targetRank }
          : student
      )),
    );
  }
}

export function useSchoolData() {
  const [students, setStudents] = useState(getStudents);
  const [payments, setPayments] = useState(getPayments);
  const [classes, setClasses] = useState(getClasses);
  const [admissions, setAdmissions] = useState(getAdmissions);
  const [withdrawals, setWithdrawals] = useState(getWithdrawals);
  const [graduations, setGraduations] = useState(getGraduations);
  const [settings, setSettings] = useState(getSettings);

  useEffect(() => {
    const refresh = () => {
      setStudents(getStudents());
      setPayments(getPayments());
      setClasses(getClasses());
      setAdmissions(getAdmissions());
      setWithdrawals(getWithdrawals());
      setGraduations(getGraduations());
      setSettings(getSettings());
    };

    window.addEventListener(STORE_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(STORE_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  return { students, payments, classes, admissions, withdrawals, graduations, settings };
}
