import { useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Edit, Plus, Search, Trash2, XCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { StatusBadge } from '../components/StatusBadge';
import {
  cancelGraduation,
  completeGraduation,
  deleteGraduation,
  saveGraduation,
  useSchoolData,
} from '../data/store';
import { GraduationEvent } from '../types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

type GraduationFormData = {
  title: string;
  date: string;
  time: string;
  location: string;
  studentIds: string[];
  targetRank: string;
  instructor: string;
  fee: string;
  notes: string;
  status: GraduationEvent['status'];
};

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = (): GraduationFormData => ({
  title: '',
  date: today(),
  time: '19:00',
  location: '',
  studentIds: [],
  targetRank: '',
  instructor: '',
  fee: '0',
  notes: '',
  status: 'Scheduled',
});

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const statusLabel = (status: GraduationEvent['status']) => {
  const labels: Record<GraduationEvent['status'], string> = {
    Scheduled: 'Agendada',
    Completed: 'Concluída',
    Cancelled: 'Cancelada',
  };
  return labels[status];
};

export function Graduation() {
  const { graduations, students, classes } = useSchoolData();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [classFilter, setClassFilter] = useState('Todas');
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingGraduation, setEditingGraduation] = useState<GraduationEvent | null>(null);
  const [selectedGraduation, setSelectedGraduation] = useState<GraduationEvent | null>(null);
  const [formData, setFormData] = useState<GraduationFormData>(emptyForm());
  const [formError, setFormError] = useState('');

  const activeStudents = students.filter((student) => student.status === 'Active');
  const uniqueClasses = useMemo(() => {
    return Array.from(new Set([...classes.map(item => item.name), ...activeStudents.map(item => item.class)])).filter(Boolean);
  }, [classes, activeStudents]);

  const filteredGraduations = graduations
    .filter((graduation) => {
      const search = searchTerm.toLowerCase();
      const graduationStudents = students.filter(student => graduation.studentIds.includes(student.id));
      const matchesSearch =
        graduation.title.toLowerCase().includes(search) ||
        graduation.targetRank.toLowerCase().includes(search) ||
        graduation.instructor.toLowerCase().includes(search) ||
        graduationStudents.some(student => student.name.toLowerCase().includes(search));
      const matchesStatus = statusFilter === 'Todos' || graduation.status === statusFilter;
      const matchesClass = classFilter === 'Todas' || graduationStudents.some(student => student.class === classFilter);
      return matchesSearch && matchesStatus && matchesClass;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const nextGraduations = graduations.filter(item => item.status === 'Scheduled' && item.date >= today()).length;
  const completedGraduations = graduations.filter(item => item.status === 'Completed').length;
  const totalStudentsScheduled = graduations
    .filter(item => item.status === 'Scheduled')
    .reduce((sum, item) => sum + item.studentIds.length, 0);

  const studentsForGraduation = (graduation: GraduationEvent) => {
    return students.filter(student => graduation.studentIds.includes(student.id));
  };

  const openNewGraduation = () => {
    setEditingGraduation(null);
    setFormData(emptyForm());
    setFormError('');
    setShowFormModal(true);
  };

  const openEditGraduation = (graduation: GraduationEvent) => {
    setEditingGraduation(graduation);
    setFormData({
      title: graduation.title,
      date: graduation.date,
      time: graduation.time,
      location: graduation.location,
      studentIds: graduation.studentIds,
      targetRank: graduation.targetRank,
      instructor: graduation.instructor,
      fee: String(graduation.fee),
      notes: graduation.notes || '',
      status: graduation.status,
    });
    setFormError('');
    setShowFormModal(true);
  };

  const openDetails = (graduation: GraduationEvent) => {
    setSelectedGraduation(graduation);
    setShowDetailsModal(true);
  };

  const toggleStudent = (studentId: string) => {
    const nextStudentIds = formData.studentIds.includes(studentId)
      ? formData.studentIds.filter(id => id !== studentId)
      : [...formData.studentIds, studentId];

    setFormData({ ...formData, studentIds: nextStudentIds });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (
      !formData.title.trim() ||
      !formData.date ||
      !formData.time ||
      !formData.location.trim() ||
      !formData.targetRank.trim() ||
      !formData.instructor.trim() ||
      formData.studentIds.length === 0
    ) {
      setFormError('Preencha os dados do agendamento e selecione ao menos um aluno.');
      return;
    }

    saveGraduation({
      id: editingGraduation?.id,
      title: formData.title,
      date: formData.date,
      time: formData.time,
      location: formData.location,
      studentIds: formData.studentIds,
      targetRank: formData.targetRank,
      instructor: formData.instructor,
      fee: Number(formData.fee) || 0,
      notes: formData.notes,
      status: formData.status,
      result: editingGraduation?.result,
    });

    setShowFormModal(false);
    setEditingGraduation(null);
  };

  const handleComplete = (graduation: GraduationEvent, result: GraduationEvent['result']) => {
    completeGraduation(graduation.id, result);
    setShowDetailsModal(false);
    setSelectedGraduation(null);
  };

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h2 className="text-2xl">Graduação</h2>
        <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={openNewGraduation}>
          <Plus className="w-4 h-4 mr-2" />
          Agendar Graduação
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded p-4">
          <div className="text-sm text-gray-600">Próximas Graduações</div>
          <div className="text-2xl mt-1">{nextGraduations}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded p-4">
          <div className="text-sm text-gray-600">Alunos Agendados</div>
          <div className="text-2xl mt-1">{totalStudentsScheduled}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded p-4">
          <div className="text-sm text-gray-600">Graduações Concluídas</div>
          <div className="text-2xl mt-1">{completedGraduations}</div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Título, aluno, faixa ou instrutor..."
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
              <option value="Scheduled">Agendada</option>
              <option value="Completed">Concluída</option>
              <option value="Cancelled">Cancelada</option>
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
      </div>

      <div className="space-y-4">
        {filteredGraduations.map((graduation) => {
          const graduationStudents = studentsForGraduation(graduation);

          return (
            <div key={graduation.id} className="bg-white border border-gray-200 rounded p-4">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-red-600" />
                    <h3 className="text-lg">{graduation.title}</h3>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {new Date(graduation.date).toLocaleDateString('pt-BR')} às {graduation.time} - {graduation.location}
                  </div>
                </div>
                <StatusBadge status={statusLabel(graduation.status)} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <div className="text-sm text-gray-600">Faixa / Nível</div>
                  <div className="mt-1">{graduation.targetRank}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Instrutor</div>
                  <div className="mt-1">{graduation.instructor}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Alunos</div>
                  <div className="mt-1">{graduation.studentIds.length}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Taxa</div>
                  <div className="mt-1">{formatCurrency(graduation.fee)}</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {graduationStudents.slice(0, 6).map(student => (
                  <span key={student.id} className="rounded border border-gray-200 px-2 py-1 text-xs">
                    {student.name}
                  </span>
                ))}
                {graduationStudents.length > 6 && (
                  <span className="rounded border border-gray-200 px-2 py-1 text-xs">
                    +{graduationStudents.length - 6}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => openDetails(graduation)}>
                  Ver Detalhes
                </Button>
                <Button size="sm" variant="outline" onClick={() => openEditGraduation(graduation)}>
                  <Edit className="w-4 h-4" />
                  Editar
                </Button>
                <Button
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => handleComplete(graduation, 'Approved')}
                  disabled={graduation.status !== 'Scheduled'}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Aprovar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleComplete(graduation, 'Rejected')}
                  disabled={graduation.status !== 'Scheduled'}
                >
                  <XCircle className="w-4 h-4" />
                  Reprovar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => cancelGraduation(graduation.id)}
                  disabled={graduation.status !== 'Scheduled'}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600"
                  onClick={() => deleteGraduation(graduation.id)}
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir
                </Button>
              </div>
            </div>
          );
        })}

        {filteredGraduations.length === 0 && (
          <div className="bg-white border border-gray-200 rounded p-8 text-center text-gray-500">
            Nenhuma graduação agendada.
          </div>
        )}
      </div>

      <Dialog open={showFormModal} onOpenChange={setShowFormModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGraduation ? 'Editar Graduação' : 'Agendar Graduação'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-sm text-gray-600 mb-1">Título</label>
              <input
                type="text"
                value={formData.title}
                onChange={(event) => setFormData({ ...formData, title: event.target.value })}
                placeholder="Ex: Graduação 1º Semestre"
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Data</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(event) => setFormData({ ...formData, date: event.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Horário</label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(event) => setFormData({ ...formData, time: event.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Local</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(event) => setFormData({ ...formData, location: event.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Instrutor / Avaliador</label>
                <input
                  type="text"
                  value={formData.instructor}
                  onChange={(event) => setFormData({ ...formData, instructor: event.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Faixa / Nível Alvo</label>
                <input
                  type="text"
                  value={formData.targetRank}
                  onChange={(event) => setFormData({ ...formData, targetRank: event.target.value })}
                  placeholder="Ex: Intermediário"
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Taxa</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.fee}
                  onChange={(event) => setFormData({ ...formData, fee: event.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(event) => setFormData({ ...formData, status: event.target.value as GraduationEvent['status'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                >
                  <option value="Scheduled">Agendada</option>
                  <option value="Completed">Concluída</option>
                  <option value="Cancelled">Cancelada</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Alunos</label>
              <div className="max-h-48 overflow-y-auto rounded border border-gray-200 p-2">
                {activeStudents.map(student => (
                  <label key={student.id} className="flex items-center justify-between gap-3 rounded px-2 py-2 text-sm hover:bg-gray-50">
                    <span>
                      {student.name}
                      <span className="text-gray-500"> - {student.class} - {student.level || 'Sem nível'}</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={formData.studentIds.includes(student.id)}
                      onChange={() => toggleStudent(student.id)}
                      className="w-4 h-4"
                    />
                  </label>
                ))}
                {activeStudents.length === 0 && (
                  <div className="p-3 text-sm text-gray-500">Nenhum aluno ativo disponível.</div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Observações</label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(event) => setFormData({ ...formData, notes: event.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white">
                {editingGraduation ? 'Salvar Alterações' : 'Agendar Graduação'}
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
            <DialogTitle>Detalhes da Graduação</DialogTitle>
          </DialogHeader>
          {selectedGraduation && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">Título</div>
                  <div>{selectedGraduation.title}</div>
                </div>
                <div>
                  <div className="text-gray-600">Status</div>
                  <div>{statusLabel(selectedGraduation.status)}</div>
                </div>
                <div>
                  <div className="text-gray-600">Data e Horário</div>
                  <div>{new Date(selectedGraduation.date).toLocaleDateString('pt-BR')} às {selectedGraduation.time}</div>
                </div>
                <div>
                  <div className="text-gray-600">Local</div>
                  <div>{selectedGraduation.location}</div>
                </div>
                <div>
                  <div className="text-gray-600">Faixa / Nível</div>
                  <div>{selectedGraduation.targetRank}</div>
                </div>
                <div>
                  <div className="text-gray-600">Taxa</div>
                  <div>{formatCurrency(selectedGraduation.fee)}</div>
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-600 mb-2">Alunos</div>
                <div className="space-y-2">
                  {studentsForGraduation(selectedGraduation).map(student => (
                    <div key={student.id} className="rounded border border-gray-200 px-3 py-2 text-sm">
                      {student.name} - {student.class} - {student.level || 'Sem nível'}
                    </div>
                  ))}
                </div>
              </div>

              {selectedGraduation.notes && (
                <div className="text-sm">
                  <div className="text-gray-600">Observações</div>
                  <div>{selectedGraduation.notes}</div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => handleComplete(selectedGraduation, 'Approved')}
                  disabled={selectedGraduation.status !== 'Scheduled'}
                >
                  Aprovar Alunos
                </Button>
                <Button variant="outline" onClick={() => setShowDetailsModal(false)}>
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
