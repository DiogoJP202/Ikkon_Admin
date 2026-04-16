import { useMemo, useState } from 'react';
import { Eye, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { deleteClass, saveClass, useSchoolData } from '../data/store';
import { Class } from '../types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

type ClassFormData = {
  level: string;
  identifier: string;
  weekdays: string[];
  startTime: string;
  endTime: string;
  instructor: string;
};

const levels = [
  'Iniciante',
  'Intermediário',
  'Avançado',
  'Infantil',
  'Adulto',
  'Livre',
];

const weekdays = [
  { value: 'Segunda', short: 'Seg' },
  { value: 'Terça', short: 'Ter' },
  { value: 'Quarta', short: 'Qua' },
  { value: 'Quinta', short: 'Qui' },
  { value: 'Sexta', short: 'Sex' },
  { value: 'Sábado', short: 'Sáb' },
  { value: 'Domingo', short: 'Dom' },
];

const emptyForm: ClassFormData = {
  level: '',
  identifier: '',
  weekdays: [],
  startTime: '19:00',
  endTime: '20:00',
  instructor: '',
};

function joinWeekdays(selectedWeekdays: string[]) {
  if (selectedWeekdays.length === 0) {
    return '';
  }

  if (selectedWeekdays.length === 1) {
    return selectedWeekdays[0];
  }

  return `${selectedWeekdays.slice(0, -1).join(', ')} e ${selectedWeekdays[selectedWeekdays.length - 1]}`;
}

function buildClassName(formData: ClassFormData) {
  return `${formData.level} ${formData.identifier}`.trim();
}

function buildSchedule(formData: ClassFormData) {
  const selectedDays = joinWeekdays(formData.weekdays);
  if (!selectedDays || !formData.startTime || !formData.endTime) {
    return '';
  }

  return `${selectedDays}, ${formData.startTime}-${formData.endTime}`;
}

function parseClassName(name: string) {
  const matchingLevel = levels.find((level) => name.toLowerCase().startsWith(level.toLowerCase()));
  if (!matchingLevel) {
    return { level: '', identifier: name };
  }

  return {
    level: matchingLevel,
    identifier: name.slice(matchingLevel.length).trim(),
  };
}

function parseSchedule(schedule: string) {
  const [daysPart, timePart] = schedule.split(',').map((part) => part.trim());
  const parsedWeekdays = weekdays
    .filter((day) => daysPart?.includes(day.value))
    .map((day) => day.value);
  const [startTime, endTime] = (timePart || '').split('-').map((part) => part.trim());

  return {
    weekdays: parsedWeekdays,
    startTime: startTime || '19:00',
    endTime: endTime || '20:00',
  };
}

export function Classes() {
  const { classes, students } = useSchoolData();
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [viewingClass, setViewingClass] = useState<Class | null>(null);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [formData, setFormData] = useState<ClassFormData>(emptyForm);
  const [formError, setFormError] = useState('');

  const studentCountByClass = useMemo(() => {
    return students.reduce<Record<string, number>>((acc, student) => {
      if (student.status !== 'Inactive' && student.status !== 'Withdrawn') {
        acc[student.class] = (acc[student.class] || 0) + 1;
      }
      return acc;
    }, {});
  }, [students]);

  const instructors = useMemo(() => {
    return Array.from(new Set(classes.map((classItem) => classItem.instructor).filter(Boolean)));
  }, [classes]);

  const filteredClasses = classes.filter((classItem) => {
    const search = searchTerm.toLowerCase();
    return (
      classItem.name.toLowerCase().includes(search) ||
      classItem.schedule.toLowerCase().includes(search) ||
      classItem.instructor.toLowerCase().includes(search)
    );
  });

  const openNewClassForm = () => {
    setEditingClass(null);
    setFormData(emptyForm);
    setFormError('');
    setIsFormOpen(true);
  };

  const openEditClassForm = (classItem: Class) => {
    const parsedName = parseClassName(classItem.name);
    const parsedSchedule = parseSchedule(classItem.schedule);

    setEditingClass(classItem);
    setFormData({
      level: parsedName.level,
      identifier: parsedName.identifier,
      weekdays: parsedSchedule.weekdays,
      startTime: parsedSchedule.startTime,
      endTime: parsedSchedule.endTime,
      instructor: classItem.instructor,
    });
    setFormError('');
    setIsFormOpen(true);
  };

  const toggleWeekday = (weekday: string) => {
    const nextWeekdays = formData.weekdays.includes(weekday)
      ? formData.weekdays.filter((item) => item !== weekday)
      : [...formData.weekdays, weekday];

    setFormData({ ...formData, weekdays: nextWeekdays });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const name = buildClassName(formData);
    const schedule = buildSchedule(formData);

    if (!name || !schedule || !formData.instructor.trim()) {
      setFormError('Preencha nível, identificador, dias, horário e instrutor.');
      return;
    }

    if (formData.endTime <= formData.startTime) {
      setFormError('O horário de término precisa ser depois do início.');
      return;
    }

    const duplicatedName = classes.some((classItem) => (
      classItem.name.toLowerCase() === name.toLowerCase() &&
      classItem.id !== editingClass?.id
    ));

    if (duplicatedName) {
      setFormError('Já existe uma turma com esse nome.');
      return;
    }

    saveClass({
      id: editingClass?.id,
      name,
      schedule,
      instructor: formData.instructor,
    });

    setIsFormOpen(false);
    setEditingClass(null);
    setFormData(emptyForm);
  };

  const handleDeleteClass = (classItem: Class) => {
    const activeStudents = studentCountByClass[classItem.name] || 0;
    if (activeStudents > 0) {
      setViewingClass(classItem);
      return;
    }

    deleteClass(classItem.id);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl">Turmas</h2>
        <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={openNewClassForm}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Turma
        </Button>
      </div>

      <div className="bg-white border border-gray-200 rounded p-4 mb-4">
        <label className="block text-sm text-gray-600 mb-1">Buscar</label>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            placeholder="Turma, horário ou instrutor..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded text-sm"
          />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-gray-600">Nome da Turma</th>
              <th className="text-left px-4 py-3 text-gray-600">Horário</th>
              <th className="text-left px-4 py-3 text-gray-600">Instrutor</th>
              <th className="text-left px-4 py-3 text-gray-600">Alunos</th>
              <th className="text-left px-4 py-3 text-gray-600">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredClasses.map((classItem) => (
              <tr key={classItem.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3">{classItem.name}</td>
                <td className="px-4 py-3">{classItem.schedule}</td>
                <td className="px-4 py-3">{classItem.instructor}</td>
                <td className="px-4 py-3">{studentCountByClass[classItem.name] || 0}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setViewingClass(classItem)}>
                      <Eye className="w-4 h-4" />
                      Ver
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openEditClassForm(classItem)}>
                      <Pencil className="w-4 h-4" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600"
                      onClick={() => handleDeleteClass(classItem)}
                    >
                      <Trash2 className="w-4 h-4" />
                      Excluir
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredClasses.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={5}>
                  Nenhuma turma encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingClass ? 'Editar Turma' : 'Nova Turma'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Nível da Turma</label>
                <select
                  value={formData.level}
                  onChange={(event) => setFormData({ ...formData, level: event.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                >
                  <option value="">Selecione um nível</option>
                  {levels.map((level) => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Identificador</label>
                <input
                  type="text"
                  value={formData.identifier}
                  onChange={(event) => setFormData({ ...formData, identifier: event.target.value.toUpperCase() })}
                  placeholder="Ex: A, B, C, Infantil 1"
                  maxLength={20}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-2">Dias da Semana</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {weekdays.map((weekday) => (
                  <label
                    key={weekday.value}
                    className="flex items-center gap-2 rounded border border-gray-200 px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={formData.weekdays.includes(weekday.value)}
                      onChange={() => toggleWeekday(weekday.value)}
                      className="w-4 h-4"
                    />
                    <span>{weekday.short}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Início</label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(event) => setFormData({ ...formData, startTime: event.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Término</label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(event) => setFormData({ ...formData, endTime: event.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Instrutor</label>
              <input
                type="text"
                list="class-instructors"
                value={formData.instructor}
                onChange={(event) => setFormData({ ...formData, instructor: event.target.value })}
                placeholder="Ex: Sensei Takeshi"
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
              <datalist id="class-instructors">
                {instructors.map((instructor) => (
                  <option key={instructor} value={instructor} />
                ))}
              </datalist>
            </div>

            <div className="rounded border border-gray-200 bg-gray-50 p-3 text-sm">
              <div className="text-gray-600">Prévia</div>
              <div>{buildClassName(formData) || 'Nome da turma'}</div>
              <div>{buildSchedule(formData) || 'Horário da turma'}</div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white">
                {editingClass ? 'Salvar Alterações' : 'Criar Turma'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingClass} onOpenChange={(open) => !open && setViewingClass(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes da Turma</DialogTitle>
          </DialogHeader>
          {viewingClass && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">Nome</div>
                  <div>{viewingClass.name}</div>
                </div>
                <div>
                  <div className="text-gray-600">Instrutor</div>
                  <div>{viewingClass.instructor}</div>
                </div>
                <div>
                  <div className="text-gray-600">Horário</div>
                  <div>{viewingClass.schedule}</div>
                </div>
                <div>
                  <div className="text-gray-600">Alunos ativos</div>
                  <div>{studentCountByClass[viewingClass.name] || 0}</div>
                </div>
              </div>

              {(studentCountByClass[viewingClass.name] || 0) > 0 && (
                <div className="rounded border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                  Esta turma possui alunos ativos. Para excluir, mova ou desative os alunos primeiro.
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => openEditClassForm(viewingClass)}>
                  Editar
                </Button>
                <Button variant="outline" onClick={() => setViewingClass(null)}>
                  <X className="w-4 h-4" />
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
