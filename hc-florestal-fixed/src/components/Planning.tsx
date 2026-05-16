import React, { useState, useMemo } from 'react';
import { Field, InputItem, ActivityDefinition, Planning, PlanningItem, ServiceOrder, DailyLog, ActivityCategory, ProductionCycle, CycleStep } from '../types';
import { Plus, Trash2, Clock, MapPin, CheckCircle2, X, Target, Calendar, TrendingUp, ChevronRight, AlertCircle, Edit3, Play, ListChecks, ArrowRight, ShieldCheck, Info, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { parseNumber } from '../constants';
import { toast } from 'sonner';

interface PlanningProps {
  fields: Field[];
  inputs: InputItem[];
  activityDefinitions: ActivityDefinition[];
  activityCategories: ActivityCategory[];
  plannings: Planning[];
  serviceOrders: ServiceOrder[];
  dailyLogs: DailyLog[];
  onAdd: (type: string, item: any) => Promise<string | null>;
  onDelete: (type: string, id: string) => void;
  onEdit: (type: string, item: any) => void;
  onStartOS?: (plan: Planning, fieldId: string) => void;
  productionCycles: ProductionCycle[];
  role?: 'admin' | 'manager' | 'operator';
}

const STANDARD_PROCEDURES = [
  { id: 'PP1', name: 'PP1 - Amostragem de Solo', category: 'pre_planting', unit: 'unit' as const, goal: 10, description: 'Obter amostras representativas para análise química e física.', estimatedDays: 2 },
  { id: 'PP2', name: 'PP2 - Cata de Resíduos', category: 'pre_planting', unit: 'unit' as const, goal: 5, description: 'Remover galhadas, tocos e restos de madeira.', estimatedDays: 3 },
  { id: 'PP3', name: 'PP3 - Combate à Formiga', category: 'ant_control', unit: 'kg' as const, goal: 1, description: 'Eliminar formigueiros antes do preparo do solo.', estimatedDays: 5 },
  { id: 'PP4', name: 'PP4 - Dessecação', category: 'spray', unit: 'L' as const, goal: 150, description: 'Eliminar toda a vegetação viva antes da subsolagem.', estimatedDays: 2 },
  { id: 'PP5', name: 'PP5 - Subsolagem + Adubação + Marcação', category: 'planting', unit: 'kg' as const, goal: 100, description: 'Romper camadas compactadas, adubar e marcar covas.', estimatedDays: 4 },
  { id: 'PP6', name: 'PP6 - 1ª Herbicida Pré-emergente', category: 'spray', unit: 'L' as const, goal: 200, description: 'Barreira química para impedir emergência de daninhas.', estimatedDays: 1 },
  { id: 'PP7', name: 'PP7 - Plantio Semi-mecanizado', category: 'planting', unit: 'unit' as const, goal: 1000, description: 'Estabelecer as mudas de eucalipto com irrigação imediata.', estimatedDays: 6 },
  { id: 'PP8', name: 'PP8 - Correção de Solo (Calcário + Gesso)', category: 'other', unit: 'kg' as const, goal: 2000, description: 'Corrigir acidez e fornecer cálcio e enxofre.', estimatedDays: 3 },
  { id: 'PP9', name: 'PP9 - Compostagem Pós-Plantio', category: 'other', unit: 'kg' as const, goal: 1500, description: 'Fornecer matéria orgânica e nutrientes de liberação lenta.', estimatedDays: 3 },
  { id: 'PP10', name: 'PP10 - Remonta (2ª Herbicida)', category: 'spray', unit: 'L' as const, goal: 200, description: 'Reforçar barreira herbicida após 30 dias.', estimatedDays: 2 },
  { id: 'PP11', name: 'PP11 - Herbicida Entrelinha', category: 'spray', unit: 'L' as const, goal: 150, description: 'Controlar daninhas nas entrelinhas após 90 dias.', estimatedDays: 3 },
];

export const PlanningComponent: React.FC<PlanningProps> = ({
  fields,
  inputs,
  activityDefinitions,
  activityCategories,
  plannings,
  serviceOrders,
  dailyLogs,
  productionCycles,
  onAdd,
  onDelete,
  onEdit,
  onStartOS,
  role
}) => {
  const [activeTab, setActiveTab] = useState<'plans' | 'cycles'>('plans');
  const [isAdding, setIsAdding] = useState(false);
  const [isCycleAdding, setIsCycleAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [activityId, setActivityId] = useState('');
  const [dailyGoal, setDailyGoal] = useState<string>('10'); // ha/day
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ id: string, name: string } | null>(null);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);

  const [cycleFields, setCycleFields] = useState<string[]>([]);
  const [selectedProcedures, setSelectedProcedures] = useState<string[]>(STANDARD_PROCEDURES.map(p => p.id));

  const canDelete = role === 'admin' || role === 'manager';

  const formatNumber = (num: number, decimals: number = 2) => {
    return num.toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    });
  };

  const handleEditClick = (plan: Planning) => {
    setEditingId(plan.id);
    setName(plan.name);
    setActivityId(plan.activityId);
    setDailyGoal(plan.dailyGoal.toString());
    setSelectedItems(plan.items.map(item => ({
      ...item,
      inputs: item.inputs.map(input => ({ ...input, dose: input.dose.toString() }))
    })));
    setIsAdding(true);
  };

  const handleDeleteClick = (id: string, name: string) => {
    if (!canDelete) return;
    setShowDeleteConfirm({ id, name });
  };

  const confirmDelete = () => {
    if (!showDeleteConfirm || !canDelete) return;
    onDelete('plannings', showDeleteConfirm.id);
    setShowDeleteConfirm(null);
  };

  const toggleField = (fieldId: string) => {
    if (selectedItems.find(item => item.fieldId === fieldId)) {
      setSelectedItems(selectedItems.filter(item => item.fieldId !== fieldId));
    } else {
      setSelectedItems([...selectedItems, { fieldId, inputs: [] }]);
    }
  };

  const addInputToField = (fieldId: string) => {
    setSelectedItems(selectedItems.map(item => {
      if (item.fieldId === fieldId) {
        return {
          ...item,
          inputs: [...item.inputs, { inputId: '', dose: '' }]
        };
      }
      return item;
    }));
  };

  const removeInputFromField = (fieldId: string, index: number) => {
    setSelectedItems(selectedItems.map(item => {
      if (item.fieldId === fieldId) {
        const newInputs = [...item.inputs];
        newInputs.splice(index, 1);
        return { ...item, inputs: newInputs };
      }
      return item;
    }));
  };

  const updateFieldInput = (fieldId: string, index: number, field: 'inputId' | 'dose', value: any) => {
    setSelectedItems(selectedItems.map(item => {
      if (item.fieldId === fieldId) {
        const newInputs = [...item.inputs];
        newInputs[index] = { ...newInputs[index], [field]: value };
        return { ...item, inputs: newInputs };
      }
      return item;
    }));
  };

  const copyInputsToAll = (sourceFieldId: string) => {
    const sourceItem = selectedItems.find(item => item.fieldId === sourceFieldId);
    if (!sourceItem || sourceItem.inputs.length === 0) {
      toast.error('Adicione pelo menos um insumo antes de copiar.');
      return;
    }

    const inputsToCopy = sourceItem.inputs.map((input: any) => ({
      inputId: input.inputId,
      dose: input.dose
    }));

    setSelectedItems(prev => prev.map(item => ({
      ...item,
      inputs: [...inputsToCopy]
    })));

    toast.success('Recomendação replicada para todos os talhões!');
  };

  const calculateTotalArea = () => {
    return selectedItems.reduce((sum, item) => {
      const field = fields.find(f => f.id === item.fieldId);
      return sum + (field?.area || 0);
    }, 0);
  };

  const calculateTotalInputs = () => {
    const totals: { [inputId: string]: number } = {};
    selectedItems.forEach(item => {
      const field = fields.find(f => f.id === item.fieldId);
      const area = field?.area || 0;
      item.inputs.forEach(input => {
        if (input.inputId) {
          const doseNum = parseNumber(input.dose);
          totals[input.inputId] = (totals[input.inputId] || 0) + (area * doseNum);
        }
      });
    });
    return totals;
  };

  const calculateEstimatedDays = () => {
    const totalArea = calculateTotalArea();
    const dg = parseNumber(dailyGoal);
    return dg > 0 ? Math.ceil(totalArea / dg) : 0;
  };

  const getFieldStatus = (fieldId: string, activityName: string, planningId: string, planCreatedAt: string) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field) return { progress: 0, realizedArea: 0, remainingArea: 0, status: 'not_started' as const };

    const matchingOS = serviceOrders.filter(os => 
      os.fieldId === fieldId && 
      os.activity === activityName &&
      os.status !== 'cancelled' &&
      (os.planningId === planningId || (!os.planningId && new Date(os.createdAt) >= new Date(planCreatedAt)))
    );

    if (matchingOS.some(os => os.status === 'completed')) {
      return { progress: 100, realizedArea: field.area, remainingArea: 0, status: 'completed' as const };
    }

    const totalApplied = matchingOS.reduce((sum, os) => {
      const logs = dailyLogs.filter(l => (l.osId || (l as any).os_id) === os.id);
      return sum + logs.reduce((s, l) => s + l.amount, 0);
    }, 0);

    const targetRate = matchingOS[0]?.targetRate || 1;
    const realizedArea = totalApplied / targetRate;
    const progress = Math.min(100, Math.round((realizedArea / field.area) * 100));
    const status = progress >= 100 ? 'completed' : (matchingOS.length > 0 ? 'in_progress' : 'not_started');
    
    return { 
      progress, 
      realizedArea: Math.min(field.area, realizedArea), 
      remainingArea: Math.max(0, field.area - realizedArea),
      status 
    };
  };

  const getPlanningProgress = (plan: Planning) => {
    const activity = activityDefinitions.find(a => a.id === plan.activityId);
    if (!activity) return { progress: 0, realizedArea: 0, totalArea: 0 };

    const totalArea = plan.items.reduce((sum, item) => {
      const field = fields.find(f => f.id === item.fieldId);
      return sum + (field?.area || 0);
    }, 0);

    const realizedArea = plan.items.reduce((sum, item) => {
      const field = fields.find(f => f.id === item.fieldId);
      if (!field) return sum;
      const status = getFieldStatus(item.fieldId, activity.name, plan.id, plan.createdAt);
      return sum + status.realizedArea;
    }, 0);

    return {
      progress: totalArea > 0 ? Math.round((realizedArea / totalArea) * 100) : 0,
      realizedArea,
      totalArea
    };
  };

  const handleSave = () => {
    if (!name || !activityId || selectedItems.length === 0) return;

    const parsedItems: PlanningItem[] = selectedItems.map(item => ({
      ...item,
      inputs: item.inputs.map((input: any) => ({
        ...input,
        dose: parseNumber(input.dose)
      }))
    }));

    if (editingId) {
      const updatedPlanning: Planning = {
        id: editingId,
        name,
        activityId,
        items: parsedItems,
        dailyGoal: parseNumber(dailyGoal),
        status: 'active',
        createdAt: plannings.find(p => p.id === editingId)?.createdAt || new Date().toISOString()
      };
      onEdit('plannings', updatedPlanning);
    } else {
      const newPlanning: Omit<Planning, 'id'> = {
        name,
        activityId,
        items: parsedItems,
        dailyGoal: parseNumber(dailyGoal),
        status: 'active',
        createdAt: new Date().toISOString()
      };
      onAdd('plannings', newPlanning);
    }
    
    setIsAdding(false);
    resetForm();
  };

  const handleSaveCycle = async () => {
    if (cycleFields.length === 0 || selectedProcedures.length === 0) return;

    const toastId = toast.loading('Criando ciclo de planejamento...');
    const cycleSteps: CycleStep[] = [];

    try {
      let currentOrder = 1;
      for (const procId of selectedProcedures) {
        const proc = STANDARD_PROCEDURES.find(p => p.id === procId);
        if (!proc) continue;

        let activityDef = activityDefinitions.find(a => a.name === proc.name);
        let activityId = activityDef?.id;
        
        if (!activityId) {
          const categoryId = activityCategories.find(c => c.name === proc.category || c.id === proc.category)?.id || 'other';
          const newDef = {
            name: proc.name,
            category: categoryId,
            unit: proc.unit,
            description: proc.description,
            dailyGoal: proc.goal
          };
          activityId = await onAdd('activityDefinitions', newDef) || '';
        }

        if (activityId) {
          const newPlanning: Omit<Planning, 'id'> = {
            name: `Ciclo: ${proc.name}`,
            activityId,
            items: cycleFields.map(fid => ({ fieldId: fid, inputs: [] })),
            dailyGoal: proc.goal,
            status: 'active',
            createdAt: new Date().toISOString()
          };
          const planningId = await onAdd('plannings', newPlanning);
          
          if (planningId) {
            cycleSteps.push({
              planningId,
              activityName: proc.name,
              order: currentOrder++,
              expectedDays: proc.estimatedDays,
              status: 'pending'
            });
          }
        }
      }

      if (cycleSteps.length > 0) {
        const fieldNames = cycleFields.map(id => fields.find(f => f.id === id)?.name).join(', ');
        const newCycle: Omit<ProductionCycle, 'id'> = {
          name: `Ciclo: ${fieldNames}`,
          fieldIds: cycleFields,
          steps: cycleSteps,
          status: 'active',
          createdAt: new Date().toISOString()
        };
        await onAdd('productionCycles', newCycle);
      }

      toast.success('Ciclo de planejamento criado com sucesso!', { id: toastId });
      setIsCycleAdding(false);
      setActiveTab('cycles');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao criar ciclo de planejamento.', { id: toastId });
    }
  };

  const toggleCycleField = (fieldId: string) => {
    if (cycleFields.includes(fieldId)) {
      setCycleFields(cycleFields.filter(id => id !== fieldId));
    } else {
      setCycleFields([...cycleFields, fieldId]);
    }
  };

  const toggleProcedure = (procId: string) => {
    if (selectedProcedures.includes(procId)) {
      setSelectedProcedures(selectedProcedures.filter(id => id !== procId));
    } else {
      setSelectedProcedures([...selectedProcedures, procId]);
    }
  };

  const resetForm = () => {
    setName('');
    setActivityId('');
    setDailyGoal('10');
    setSelectedItems([]);
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-headline font-bold text-on-background">Planejamento de Operações</h2>
          <div className="flex items-center gap-1 mt-1">
            <button 
              onClick={() => setActiveTab('plans')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${activeTab === 'plans' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
            >
              Lista de Planos
            </button>
            <button 
              onClick={() => setActiveTab('cycles')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${activeTab === 'cycles' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
            >
              Cronogramas (Ciclos)
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setCycleFields([]);
              setIsCycleAdding(true);
            }}
            className="flex items-center gap-2 bg-surface-container-highest text-on-surface px-4 py-2 rounded-xl font-bold border border-outline-variant/30 transition-all hover:bg-surface-variant active:scale-95"
          >
            <ListChecks size={20} />
            Ciclo Produtivo
          </button>
          <button
            onClick={() => {
              resetForm();
              setIsAdding(true);
            }}
            className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-xl font-bold shadow-lg shadow-primary/20 transition-transform active:scale-95"
          >
            <Plus size={20} />
            Novo Planejamento
          </button>
        </div>
      </div>

      {/* List of Plannings */}
      {activeTab === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plannings.map(plan => {
            const activity = activityDefinitions.find(a => a.id === plan.activityId);
            const { progress, realizedArea, totalArea } = getPlanningProgress(plan);
            
            const totals: { [inputId: string]: number } = {};
            plan.items.forEach(item => {
              const field = fields.find(f => f.id === item.fieldId);
              const area = field?.area || 0;
              item.inputs.forEach(input => {
                if (input.inputId) {
                  const d = parseNumber(input.dose);
                  totals[input.inputId] = (totals[input.inputId] || 0) + (area * d);
                }
              });
            });
            const dGoal = parseNumber(plan.dailyGoal);
            const estDays = dGoal > 0 ? Math.ceil(totalArea / dGoal) : 0;

            return (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                key={plan.id}
                className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/30 shadow-sm relative overflow-hidden"
              >
                {/* Progress Bar Background */}
                <div className="absolute bottom-0 left-0 h-1 bg-primary/10 w-full">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-primary"
                  />
                </div>

                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-on-surface">{plan.name}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        progress === 100 ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'
                      }`}>
                        {progress}% Concluído
                      </span>
                    </div>
                    <p className="text-sm text-on-surface-variant flex items-center gap-2">
                      {activity?.name} • <span className="font-bold text-primary/80">{plan.items.length} Talhões</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEditClick(plan)}
                      className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      title="Editar Planejamento"
                    >
                      <Edit3 size={18} />
                    </button>
                    {canDelete && (
                      <button
                        onClick={() => handleDeleteClick(plan.id, plan.name)}
                        className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors"
                        title="Excluir Planejamento"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/20">
                      <p className="text-[10px] uppercase font-bold text-on-surface-variant mb-1">Área Total</p>
                      <p className="text-sm font-bold text-primary">{formatNumber(totalArea, 1)} ha</p>
                    </div>
                    <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/20">
                      <p className="text-[10px] uppercase font-bold text-on-surface-variant mb-1">Realizado</p>
                      <p className="text-sm font-bold text-success">{formatNumber(realizedArea, 1)} ha</p>
                    </div>
                    <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/20">
                      <p className="text-[10px] uppercase font-bold text-on-surface-variant mb-1">Restante</p>
                      <p className="text-sm font-bold text-error">{formatNumber(Math.max(0, totalArea - realizedArea), 1)} ha</p>
                    </div>
                  </div>

                  <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/20">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-[10px] uppercase font-bold text-on-surface-variant flex items-center gap-2">
                        <MapPin size={12} className="text-primary" />
                        Talhões Selecionados
                      </p>
                      <button 
                        onClick={() => setExpandedPlanId(expandedPlanId === plan.id ? null : plan.id)}
                        className="text-[10px] font-bold text-primary hover:underline"
                      >
                        {expandedPlanId === plan.id ? 'Recolher' : 'Ver todos'}
                      </button>
                    </div>
                    <div className={`grid grid-cols-2 sm:grid-cols-3 gap-2 ${expandedPlanId === plan.id ? '' : 'max-h-24 overflow-hidden'}`}>
                      {plan.items.map(item => {
                        const field = fields.find(f => f.id === item.fieldId);
                        const status = getFieldStatus(item.fieldId, activity?.name || '', plan.id, plan.createdAt);
                        
                        let colorClass = 'bg-surface-container-high text-on-surface-variant border-outline-variant';
                        if (status.status === 'completed') colorClass = 'bg-success/10 text-success border-success/20';
                        if (status.status === 'in_progress') colorClass = 'bg-primary/10 text-primary border-primary/20';

                        return (
                          <div key={item.fieldId} className={`flex flex-col gap-1 p-2 rounded-xl border ${colorClass} min-w-[100px]`}>
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold truncate">{field?.name}</span>
                              <div className="flex items-center gap-1">
                                {status.status === 'completed' && <CheckCircle2 size={10} />}
                                {status.status !== 'completed' && onStartOS && (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onStartOS(plan, item.fieldId);
                                    }}
                                    className="p-1 hover:bg-black/5 rounded-lg transition-colors"
                                    title="Iniciar OS"
                                  >
                                    <Play className="w-2.5 h-2.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="flex justify-between items-center text-[9px] opacity-80">
                              <span>{formatNumber(status.realizedArea, 1)} ha</span>
                              <span className="font-black">-{formatNumber(status.remainingArea, 1)} ha</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/20">
                    <p className="text-[10px] uppercase font-bold text-on-surface-variant mb-2 flex items-center gap-2">
                      <AlertCircle size={12} className="text-secondary" />
                      Total de Insumos Necessários
                    </p>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {Object.entries(totals).length > 0 ? (
                        Object.entries(totals)
                          .sort(([idA], [idB]) => {
                            const nameA = inputs.find(i => i.id === idA)?.name || '';
                            const nameB = inputs.find(i => i.id === idB)?.name || '';
                            return nameA.localeCompare(nameB, 'pt-BR', { sensitivity: 'base' });
                          })
                          .map(([id, amount]) => {
                            const input = inputs.find(i => i.id === id);
                            return (
                              <div key={id} className="flex justify-between items-center text-sm border-b border-outline-variant/10 pb-1 last:border-0">
                                <span className="text-on-surface-variant font-medium truncate mr-2">{input?.name}</span>
                                <span className="font-bold text-secondary whitespace-nowrap bg-secondary/5 px-2 py-0.5 rounded-md">
                                  {formatNumber(amount, 1)} {input?.unit}
                                </span>
                              </div>
                            );
                          })
                      ) : (
                        <p className="text-xs text-on-surface-variant italic">Nenhum insumo planejado</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-on-surface-variant">
                  <div className="flex items-center gap-2">
                    <Clock size={16} />
                    <span>Est. {formatNumber(estDays, 0)} dias ({formatNumber(plan.dailyGoal, 1)} ha/dia)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={16} />
                    <span>{formatNumber(plan.items.length, 0)} talhões</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Production Cycles View */}
      {activeTab === 'cycles' && (
        <div className="space-y-8">
          {productionCycles.length === 0 ? (
            <div className="bg-surface-container-low p-12 rounded-[2rem] border border-dashed border-outline-variant text-center">
              <div className="w-16 h-16 bg-surface-container-highest rounded-2xl flex items-center justify-center mx-auto mb-4 text-on-surface-variant/40">
                <ListChecks size={32} />
              </div>
              <h3 className="text-lg font-bold text-on-surface mb-2">Nenhum Ciclo Produtivo</h3>
              <p className="text-on-surface-variant text-sm max-w-sm mx-auto">
                Use o botão "Ciclo Produtivo" acima para automatizar o planejamento de uma sequência completa de atividades.
              </p>
            </div>
          ) : (
            productionCycles.map(cycle => {
              const totalDays = cycle.steps.reduce((sum, s) => sum + s.expectedDays, 0);
              const createdAtDate = new Date(cycle.createdAt);
              
              return (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  key={cycle.id}
                  className="bg-surface-container-low rounded-[2rem] p-8 border border-outline-variant/30 shadow-sm"
                >
                  <div className="flex justify-between items-start mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-secondary text-on-secondary rounded-2xl flex items-center justify-center shadow-lg">
                        <TrendingUp size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-on-surface italic uppercase tracking-tight">{cycle.name}</h3>
                        <p className="text-xs text-on-surface-variant font-bold flex items-center gap-2">
                          <Calendar size={12} /> Iniciado em {new Date(cycle.createdAt).toLocaleDateString()} • {totalDays} dias estimados
                        </p>
                      </div>
                    </div>
                    {canDelete && (
                      <button 
                        onClick={() => onDelete('productionCycles', cycle.id)}
                        className="p-2 text-error hover:bg-error/10 rounded-xl transition-colors"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                  </div>

                  {/* Production Line Flow */}
                  <div className="relative overflow-x-auto pb-8 mask-fade-right">
                    <div className="flex gap-4 min-w-max px-2">
                      {cycle.steps.map((step, idx) => {
                        const plan = plannings.find(p => p.id === step.planningId);
                        const progressInfo = plan ? getPlanningProgress(plan) : { progress: 0 };
                        
                        // Delay Logic
                        let currentStepStartDate = new Date(createdAtDate);
                        for(let i = 0; i < idx; i++) {
                          currentStepStartDate.setDate(currentStepStartDate.getDate() + cycle.steps[i].expectedDays);
                        }
                        
                        const expectedEndDate = new Date(currentStepStartDate);
                        expectedEndDate.setDate(expectedEndDate.getDate() + step.expectedDays);
                        
                        const isOverdue = progressInfo.progress < 100 && new Date() > expectedEndDate;
                        const statusColor = progressInfo.progress === 100 ? 'border-success bg-success/5' : (isOverdue ? 'border-error bg-error/5' : 'border-primary bg-primary/5');

                        return (
                          <div key={step.planningId} className="flex items-center gap-4">
                            <div className={`relative w-64 p-5 rounded-3xl border-2 transition-all shrink-0 ${statusColor}`}>
                              <div className="flex justify-between items-start mb-3">
                                <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Step {idx + 1}</span>
                                {isOverdue && (
                                  <div className="flex items-center gap-1 text-[10px] font-black text-error animate-pulse">
                                    <AlertCircle size={12} /> ATRASADO
                                  </div>
                                )}
                                {progressInfo.progress === 100 && (
                                  <div className="text-success">
                                    <CheckCircle2 size={16} />
                                  </div>
                                )}
                              </div>
                              
                              <h4 className="font-bold text-on-surface text-sm mb-1 truncate">{step.activityName}</h4>
                              <div className="flex items-center justify-between text-[11px] text-on-surface-variant mb-4">
                                <span>{step.expectedDays} dias</span>
                                <span className="font-bold">{progressInfo.progress}%</span>
                              </div>

                              <div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${progressInfo.progress}%` }}
                                  className={`h-full ${progressInfo.progress === 100 ? 'bg-success' : (isOverdue ? 'bg-error' : 'bg-primary')}`}
                                />
                              </div>

                              <div className="mt-4 pt-4 border-t border-outline-variant/10 flex justify-between items-center text-[10px] font-bold text-on-surface-variant">
                                <span>Fim Est: {expectedEndDate.toLocaleDateString()}</span>
                                {plan && (
                                  <button 
                                    onClick={() => setExpandedPlanId(plan.id)}
                                    className="text-primary hover:underline"
                                  >
                                    Detalhes
                                  </button>
                                )}
                              </div>
                            </div>
                            
                            {idx < cycle.steps.length - 1 && (
                              <div className="text-outline-variant">
                                <ArrowRight size={24} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Delay Warning Helper */}
                  {cycle.steps.some((step, idx) => {
                    const plan = plannings.find(p => p.id === step.planningId);
                    const progress = plan ? getPlanningProgress(plan).progress : 0;
                    let ssd = new Date(createdAtDate);
                    for(let i = 0; i < idx; i++) ssd.setDate(ssd.getDate() + cycle.steps[i].expectedDays);
                    ssd.setDate(ssd.getDate() + step.expectedDays);
                    return progress < 100 && new Date() > ssd;
                  }) && (
                    <div className="mt-6 p-4 bg-error/10 border border-error/20 rounded-2xl flex items-start gap-3">
                      <div className="mt-0.5 text-error">
                        <AlertCircle size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-error uppercase italic">Alerta de Produção</h4>
                        <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
                          Detectamos atrasos em etapas críticas deste ciclo. Isso pode impactar o cronograma das atividades subsequentes como o plantio e a adubação. 
                          <span className="font-bold text-error ml-1">Sugestão:</span> Verifique a disponibilidade de equipes extras ou máquinas para compensar o rendimento nos próximos 5 dias.
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </div>
      )}

      {/* Cycle Multi-Planning Modal */}
      <AnimatePresence>
        {isCycleAdding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface-container-lowest w-full max-w-5xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col h-[85vh] border border-outline-variant/30"
            >
              <div className="p-8 border-b border-outline-variant/30 flex justify-between items-center bg-primary/5 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary text-on-primary rounded-2xl flex items-center justify-center shadow-lg">
                    <ListChecks size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-headline font-black text-on-surface italic">Ciclo de Produção Padrão</h3>
                    <p className="text-sm text-on-surface-variant font-medium">Planeje a sequência completa de procedimentos para múltiplos talhões</p>
                  </div>
                </div>
                <button onClick={() => setIsCycleAdding(false)} className="p-2 hover:bg-surface-variant rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 flex overflow-hidden">
                {/* Left: Procedure List */}
                <div className="w-1/2 p-8 overflow-y-auto border-r border-outline-variant/20 bg-surface-container-low/20">
                  <h4 className="text-sm font-black text-on-surface-variant uppercase tracking-widest mb-6 flex items-center gap-2">
                    <ShieldCheck size={16} className="text-primary" />
                    1. Revezar Sequência (PP1 a PP11)
                  </h4>
                  <div className="space-y-3">
                    {STANDARD_PROCEDURES.map((proc, idx) => (
                      <div 
                        key={proc.id} 
                        onClick={() => toggleProcedure(proc.id)}
                        className={`group p-4 rounded-2xl border transition-all cursor-pointer ${
                          selectedProcedures.includes(proc.id)
                            ? 'bg-primary/5 border-primary shadow-sm'
                            : 'bg-surface-container-lowest border-outline-variant/30 hover:border-primary/30'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                            selectedProcedures.includes(proc.id) ? 'bg-primary border-primary text-on-primary' : 'border-outline-variant'
                          }`}>
                            {selectedProcedures.includes(proc.id) && <CheckCircle2 size={14} />}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-sm text-on-surface">Step {idx + 1}: {proc.name}</span>
                              <span className="px-2 py-0.5 bg-surface-container-high rounded text-[9px] font-black uppercase text-on-surface-variant">{proc.goal} {proc.unit}/dia</span>
                            </div>
                            <p className="text-xs text-on-surface-variant leading-relaxed">{proc.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: Field Selection */}
                <div className="w-1/2 p-8 overflow-y-auto bg-surface-container-lowest">
                  <h4 className="text-sm font-black text-on-surface-variant uppercase tracking-widest mb-6 flex items-center gap-2">
                    <MapPin size={16} className="text-primary" />
                    2. Selecionar Talhões
                  </h4>
                  <div className="grid grid-cols-1 gap-3">
                    {fields.map(field => (
                      <div 
                        key={field.id}
                        onClick={() => toggleCycleField(field.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex justify-between items-center ${
                          cycleFields.includes(field.id)
                            ? 'bg-secondary/5 border-secondary shadow-sm'
                            : 'bg-surface-container-low/30 border-outline-variant/30 hover:border-secondary/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center transition-colors ${
                            cycleFields.includes(field.id) ? 'bg-secondary text-on-secondary' : 'text-on-surface-variant'
                          }`}>
                            <MapPin size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-on-surface">{field.name}</p>
                            <p className="text-[10px] font-medium text-on-surface-variant uppercase">{field.area} ha • {field.geneticMaterial}</p>
                          </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          cycleFields.includes(field.id) ? 'bg-secondary border-secondary text-white' : 'border-outline-variant'
                        }`}>
                          {cycleFields.includes(field.id) && <CheckCircle2 size={16} />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-outline-variant/30 bg-surface-container-low flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4 text-on-surface-variant">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase">Resumo</span>
                    <span className="text-lg font-black text-primary">
                      {selectedProcedures.length} Atividades <span className="text-sm font-medium text-on-surface-variant">em</span> {cycleFields.length} Talhões
                    </span>
                  </div>
                  <div className="h-8 w-px bg-outline-variant/20" />
                  <div className="flex items-center gap-1.5 text-xs font-bold text-secondary bg-secondary/5 px-3 py-1.5 rounded-full">
                    <Info size={14} /> Ciclo completo planejado
                  </div>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setIsCycleAdding(false)}
                    className="px-8 py-4 font-bold text-on-surface-variant hover:bg-surface-container-high rounded-2xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSaveCycle}
                    disabled={cycleFields.length === 0 || selectedProcedures.length === 0}
                    className="px-10 py-4 bg-primary text-on-primary rounded-2xl font-black shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center gap-3"
                  >
                    Planejar Ciclos <ArrowRight size={20} />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="bg-surface-container-lowest w-full max-w-6xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col h-[90vh] border border-outline-variant/30"
            >
              {/* Header */}
              <div className="p-6 md:p-8 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-low/50 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shrink-0">
                    <Calendar size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl md:text-2xl font-headline font-bold">
                      {editingId ? 'Editar Planejamento' : 'Planejamento Inteligente'}
                    </h3>
                    <p className="text-xs md:text-sm text-on-surface-variant">
                      {editingId ? 'Ajuste os detalhes da sua operação planejada' : 'Configure os detalhes da sua operação futura'}
                    </p>
                  </div>
                </div>
                <button onClick={() => setIsAdding(false)} className="p-2 md:p-3 hover:bg-surface-container-high rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-0">
                {/* Left Side: Config */}
                <div className="w-full md:w-80 p-6 md:p-8 border-r border-outline-variant/30 bg-surface-container-low/30 overflow-y-auto space-y-8 shrink-0">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-on-surface-variant px-1 flex items-center gap-2">
                        <Target size={12} /> Nome da Operação
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ex: Adubação Anual 2026"
                        className="w-full bg-surface-container-low border border-outline-variant/50 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-on-surface-variant px-1 flex items-center gap-2">
                        <TrendingUp size={12} /> Meta Diária (ha/dia)
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={dailyGoal}
                          onChange={(e) => setDailyGoal(e.target.value)}
                          className="w-full bg-surface-container-low border border-outline-variant/50 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-on-surface-variant">ha/dia</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-on-surface-variant px-1 flex items-center gap-2">
                        <Clock size={12} /> Atividade
                      </label>
                      <select
                        value={activityId}
                        onChange={(e) => setActivityId(e.target.value)}
                        className="w-full bg-surface-container-low border border-outline-variant/50 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none"
                      >
                        <option value="">Selecionar...</option>
                        {activityDefinitions.map(a => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Summary Mini Card */}
                  <div className="bg-primary/5 rounded-[24px] p-5 border border-primary/10 space-y-4">
                    <h4 className="text-[10px] font-bold uppercase text-primary tracking-wider">Resumo do Plano</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-on-surface-variant">Área Total</span>
                        <span className="text-sm font-bold text-on-surface">{formatNumber(calculateTotalArea(), 1)} ha</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-on-surface-variant">Duração Est.</span>
                        <span className="text-sm font-bold text-on-surface">{formatNumber(calculateEstimatedDays(), 0)} dias</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-on-surface-variant">Talhões</span>
                        <span className="text-sm font-bold text-on-surface">{formatNumber(selectedItems.length, 0)} selecionados</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side: Field Selection */}
                <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-surface-container-lowest">
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="text-lg font-bold flex items-center gap-2">
                      <MapPin size={20} className="text-primary" />
                      Seleção de Talhões e Insumos
                    </h4>
                    <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container-high px-3 py-1 rounded-full">
                      {fields.length} Talhões Disponíveis
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {fields.map(field => {
                      const isSelected = selectedItems.find(item => item.fieldId === field.id);
                      const activity = activityDefinitions.find(a => a.id === activityId);
                      
                      // Find last realization for this activity on this field
                      const lastOS = serviceOrders
                        .filter(os => os.fieldId === field.id && os.activity === activity?.name && os.status === 'completed')
                        .sort((a, b) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime())[0];

                      return (
                        <div 
                          key={field.id}
                          className={`group flex flex-col gap-4 p-5 rounded-[24px] border transition-all duration-300 ${
                            isSelected 
                              ? 'bg-primary/5 border-primary shadow-sm' 
                              : 'bg-surface-container-low border-outline-variant/30 hover:border-outline-variant/60'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <button 
                              onClick={() => toggleField(field.id)}
                              className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all shrink-0 ${
                                isSelected 
                                  ? 'bg-primary border-primary text-on-primary scale-110' 
                                  : 'border-outline-variant group-hover:border-primary/50'
                              }`}
                            >
                              {isSelected && <CheckCircle2 size={20} />}
                            </button>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-base text-on-surface truncate">{field.name}</p>
                                {lastOS && (
                                  <span className="text-[9px] bg-success/10 text-success px-2 py-0.5 rounded-full font-bold whitespace-nowrap">
                                    Realizado em {new Date(lastOS.completedAt || lastOS.createdAt).toLocaleDateString('pt-BR')}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-on-surface-variant font-medium">{formatNumber(field.area, 1)} ha • {field.geneticMaterial}</p>
                            </div>

                            {isSelected && (
                              <div className="flex items-center gap-2">
                                {isSelected.inputs.length > 0 && (
                                  <button
                                    onClick={() => copyInputsToAll(field.id)}
                                    className="text-[10px] font-bold text-secondary flex items-center gap-2 bg-secondary/10 hover:bg-secondary/20 px-4 py-2 rounded-xl transition-all active:scale-95 whitespace-nowrap"
                                    title="Replicar insumos deste talhão para todos os outros selecionados"
                                  >
                                    <Copy size={14} />
                                    Replicar
                                  </button>
                                )}
                                <button
                                  onClick={() => addInputToField(field.id)}
                                  className="text-[10px] font-bold text-primary flex items-center gap-2 bg-primary/10 hover:bg-primary/20 px-4 py-2 rounded-xl transition-all active:scale-95 whitespace-nowrap"
                                >
                                  <Plus size={14} />
                                  Novo Insumo
                                </button>
                              </div>
                            )}
                          </div>

                          {isSelected && (
                            <div className="pl-0 md:pl-12 space-y-3">
                              {isSelected.inputs.length === 0 ? (
                                <div className="flex items-center gap-2 text-[10px] text-on-surface-variant italic bg-surface-container-low/50 p-3 rounded-xl border border-dashed border-outline-variant/50">
                                  <AlertCircle size={14} />
                                  Nenhum insumo definido para este talhão
                                </div>
                              ) : (
                                isSelected.inputs.map((input, idx) => (
                                  <motion.div 
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    key={idx} 
                                    className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-surface-container-lowest p-3 rounded-2xl border border-outline-variant/20 shadow-sm"
                                  >
                                    <select
                                      value={input.inputId}
                                      onChange={(e) => updateFieldInput(field.id, idx, 'inputId', e.target.value)}
                                      className="flex-1 bg-surface-container-low/30 border-none rounded-lg px-3 py-2 text-sm focus:outline-none font-medium min-w-0"
                                    >
                                      <option value="">Selecionar Insumo...</option>
                                      {inputs.map(i => (
                                        <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                                      ))}
                                    </select>
                                    <div className="flex items-center gap-2 bg-surface-container-low px-3 py-2 rounded-xl shrink-0">
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        value={input.dose}
                                        onChange={(e) => updateFieldInput(field.id, idx, 'dose', e.target.value)}
                                        placeholder="0.0"
                                        className="w-16 bg-transparent border-none text-right font-bold text-sm focus:outline-none"
                                      />
                                      <span className="text-[10px] font-bold text-on-surface-variant uppercase">
                                        {inputs.find(i => i.id === input.inputId)?.unit || '-'}/ha
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-primary/5 px-3 py-2 rounded-xl border border-primary/10 shrink-0">
                                      <span className="text-[10px] font-bold text-primary uppercase">Total:</span>
                                      <span className="text-sm font-black text-primary">
                                        {formatNumber(parseNumber(input.dose) * field.area, 1)} {inputs.find(i => i.id === input.inputId)?.unit}
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => removeInputFromField(field.id, idx)}
                                      className="p-2 text-error hover:bg-error/10 rounded-xl transition-colors self-end sm:self-auto"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </motion.div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 md:p-8 bg-surface-container-low border-t border-outline-variant/30 flex flex-col md:flex-row gap-6 items-center shrink-0">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                  <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/20 shadow-sm col-span-1 sm:col-span-2 lg:col-span-4">
                    <p className="text-[10px] uppercase font-bold text-on-surface-variant mb-2 flex items-center gap-2">
                      <TrendingUp size={12} className="text-primary" />
                      Resumo de Insumos Necessários (Total do Planejamento)
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-2 max-h-24 overflow-y-auto">
                      {Object.entries(calculateTotalInputs()).length === 0 ? (
                        <p className="text-xs text-on-surface-variant italic">Nenhum insumo selecionado</p>
                      ) : (
                        Object.entries(calculateTotalInputs())
                          .sort(([idA], [idB]) => {
                            const nameA = inputs.find(i => i.id === idA)?.name || '';
                            const nameB = inputs.find(i => i.id === idB)?.name || '';
                            return nameA.localeCompare(nameB, 'pt-BR', { sensitivity: 'base' });
                          })
                          .map(([id, amount]) => {
                            const input = inputs.find(i => i.id === id);
                            return (
                              <div key={id} className="flex justify-between items-center text-[11px] border-b border-outline-variant/5 pb-1">
                                <span className="text-on-surface-variant font-medium truncate mr-2">{input?.name}</span>
                                <span className="font-bold text-primary whitespace-nowrap bg-primary/5 px-2 py-0.5 rounded-md">
                                  {formatNumber(amount, 1)} {input?.unit}
                                </span>
                              </div>
                            );
                          })
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 w-full md:w-auto shrink-0">
                  <button
                    onClick={() => setIsAdding(false)}
                    className="flex-1 md:px-8 py-4 rounded-2xl font-bold text-on-surface-variant border border-outline-variant hover:bg-surface-container-high transition-all text-sm"
                  >
                    Descartar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!name || !activityId || selectedItems.length === 0}
                    className="flex-[2] md:px-12 py-4 rounded-2xl font-bold bg-primary text-on-primary shadow-xl shadow-primary/30 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95 flex items-center justify-center gap-2 text-sm"
                  >
                    {editingId ? 'Salvar Alterações' : 'Confirmar Planejamento'} <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-[2.5rem] w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-error/10 text-error rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={40} />
              </div>
              <h3 className="text-2xl font-headline font-black text-on-surface mb-2">Confirmar Exclusão</h3>
              <p className="text-on-surface-variant font-medium mb-8">
                Tem certeza que deseja excluir o planejamento <span className="font-bold text-on-surface">"{showDeleteConfirm.name}"</span>? Esta ação não pode ser desfeita.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(null)}
                  className="py-4 font-black text-xs uppercase tracking-widest bg-surface-container text-on-surface rounded-2xl active:scale-95 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmDelete}
                  className="py-4 font-black text-xs uppercase tracking-widest bg-error text-on-error rounded-2xl shadow-lg shadow-error/20 active:scale-95 transition-all"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
