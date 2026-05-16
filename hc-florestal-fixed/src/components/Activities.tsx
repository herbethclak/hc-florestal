import React, { useState, useEffect, useRef } from 'react';
import { 
  ClipboardCheck, 
  Plus, 
  Calendar, 
  User, 
  MapPin, 
  TrendingUp, 
  CheckCircle2, 
  History, 
  AlertTriangle,
  ChevronRight,
  ArrowRight,
  Save,
  X,
  Edit2,
  Trash2,
  Download,
  Droplets,
  FlaskConical,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { ServiceOrder, DailyLog, Field, Operator, InputItem, ActivityDefinition, Machine, Implement, ProductionBonus } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseNumber } from '../constants';
import html2pdf from 'html2pdf.js';

interface ActivitiesProps {
  fields: Field[];
  operators: Operator[];
  inputs: InputItem[];
  serviceOrders: ServiceOrder[];
  dailyLogs: DailyLog[];
  activityDefinitions: ActivityDefinition[];
  machines: Machine[];
  implementsList: Implement[];
  onDeleteOS: (osId: string) => void;
  onAddLog: (log: any) => void;
  onUpdateLog: (log: any) => void;
  onDeleteLog: (logId: string) => void;
  onUpdateOS: (osId: string, data: any) => void;
  onUpdateMachine: (machineId: string, data: any) => void;
  onUpdateImplement: (implementId: string, data: any) => void;
  onUpdateOperator: (operatorId: string, data: any) => void;
  onUpdateField: (fieldId: string, data: any) => void;
  role?: 'admin' | 'manager' | 'operator';
}

export const Activities: React.FC<ActivitiesProps> = ({ 
  fields, 
  operators, 
  inputs, 
  serviceOrders, 
  dailyLogs: allLogs, 
  activityDefinitions, 
  machines, 
  implementsList, 
  onDeleteOS,
  onAddLog,
  onUpdateLog,
  onDeleteLog,
  onUpdateOS,
  onUpdateMachine,
  onUpdateImplement,
  onUpdateOperator,
  onUpdateField,
  role
}) => {
  const [selectedOS, setSelectedOS] = useState<ServiceOrder | null>(null);
  const [showLogForm, setShowLogForm] = useState(false);
  const [editingLog, setEditingLog] = useState<DailyLog | null>(null);
  const [newLogAmount, setNewLogAmount] = useState('');
  const [newLogDate, setNewLogDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [newLogHorimetroInicial, setNewLogHorimetroInicial] = useState('');
  const [newLogHorimetroFinal, setNewLogHorimetroFinal] = useState('');
  const [newLogPerformedArea, setNewLogPerformedArea] = useState('');
  const [newLogOperatorId, setNewLogOperatorId] = useState('');
  const [newLogHelpers, setNewLogHelpers] = useState<string[]>([]);
  const [helperInput, setHelperInput] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ type: 'os' | 'log', id: string, log?: DailyLog } | null>(null);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const activeOS = serviceOrders.filter(os => os.status === 'active');
  
  const filteredCompletedOS = serviceOrders
    .filter(os => os.status === 'completed' || os.status === 'cancelled')
    .filter(os => {
      if (!filterStartDate && !filterEndDate) return true;
      const completionDate = new Date(os.completedAt || os.createdAt);
      const start = filterStartDate ? new Date(filterStartDate + 'T00:00:00') : null;
      const end = filterEndDate ? new Date(filterEndDate + 'T23:59:59') : null;
      
      if (start && completionDate < start) return false;
      if (end && completionDate > end) return false;
      return true;
    })
    .sort((a, b) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime());

  const displayedCompletedOS = (!filterStartDate && !filterEndDate) 
    ? filteredCompletedOS.slice(0, 10) 
    : filteredCompletedOS;

  const currentLogs = selectedOS ? allLogs.filter(l => (l.osId || (l as any).os_id) === selectedOS.id).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) : [];

  const [isEditingOS, setIsEditingOS] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const osReportRef = useRef<HTMLDivElement>(null);
  const [editOSTotalPlanned, setEditOSTotalPlanned] = useState('');
  const [editOSTargetRate, setEditOSTargetRate] = useState('');

  const canDelete = role === 'admin' || role === 'manager';

  const handleOpenEditOS = () => {
    if (!selectedOS) return;
    setEditOSTotalPlanned(selectedOS.totalPlannedVolume.toString());
    setEditOSTargetRate(selectedOS.targetRate.toString());
    setIsEditingOS(true);
  };

  const handleSaveOSChanges = async () => {
    if (!selectedOS) return;
    const totalPlanned = parseNumber(editOSTotalPlanned);
    const targetRate = parseNumber(editOSTargetRate);

    if (isNaN(totalPlanned) || isNaN(targetRate)) return;

    try {
      onUpdateOS(selectedOS.id, {
        totalPlannedVolume: totalPlanned,
        targetRate: targetRate
      });
      setSelectedOS({ ...selectedOS, totalPlannedVolume: totalPlanned, targetRate: targetRate });
      setIsEditingOS(false);
    } catch (error) {
      console.error('Error updating OS:', error);
    }
  };

  const handleDownloadPDF = async () => {
    if (!selectedOS || !osReportRef.current) return;
    
    setIsGeneratingPDF(true);
    const loadingId = toast.loading('Gerando PDF...');
    
    const element = osReportRef.current;
    const opt = {
      margin: 5,
      filename: `OS_${selectedOS.fieldName || 'Forestry'}_${format(new Date(), 'yyyy-MM-dd')}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        logging: false,
        letterRendering: true,
        windowWidth: 800
      },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
      pagebreak: { mode: 'avoid-all' }
    };

    try {
      await html2pdf().set(opt).from(element).save();
      toast.success('PDF gerado com sucesso!', { id: loadingId });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar PDF.', { id: loadingId });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleDeleteOS = async (osId: string) => {
    if (!canDelete) return;
    setShowDeleteConfirm({ type: 'os', id: osId });
  };

  const syncFleetHours = async (machineId?: string, implementId?: string, logToIgnoreId?: string, pendingLog?: DailyLog, pendingOS?: ServiceOrder) => {
    const getNewMaxAndLocation = (id: string, isMachine: boolean) => {
      // Get all OS for this machine/implement
      let machineOS = [...serviceOrders.filter(os => isMachine ? os.machineId === id : os.implementId === id)];
      
      if (pendingOS && (isMachine ? pendingOS.machineId === id : pendingOS.implementId === id)) {
        const index = machineOS.findIndex(os => os.id === pendingOS.id);
        if (index > -1) {
          machineOS[index] = { ...machineOS[index], ...pendingOS };
        } else {
          machineOS.push(pendingOS);
        }
      }

      const activeOS = machineOS.filter(os => os.status === 'active');
      
      // Location logic: use the first active OS location, or 'Unidade' if none active
      let location = 'Unidade';
      if (activeOS.length > 0) {
        const field = fields.find(f => f.id === activeOS[0].fieldId);
        location = field?.name || 'Unidade';
      }

      // Get all logs for all OS of this machine/implement
      const osIds = machineOS.map(os => os.id);
      let logs = [...allLogs.filter(log => osIds.includes(log.osId || (log as any).os_id))];
      
      if (logToIgnoreId) {
        logs = logs.filter(l => l.id !== logToIgnoreId);
      }

      if (pendingLog) {
        const index = logs.findIndex(l => l.id === pendingLog.id);
        if (index > -1) logs[index] = { ...logs[index], ...pendingLog };
        else logs.push(pendingLog);
      }

      // Max hours: if no logs, we set to 0 (or could keep current, but 0 is safer for "log-driven" hours)
      const max = logs.length > 0 ? Math.max(0, ...logs.map(l => l.horimetroFinal || (l as any).horimetro_final || 0)) : 0;
      return { max, location };
    };

    if (machineId) {
      const { max, location } = getNewMaxAndLocation(machineId, true);
      onUpdateMachine(machineId, { hours: max, location });
    }
    if (implementId) {
      const { location } = getNewMaxAndLocation(implementId, false);
      onUpdateImplement(implementId, { location });
    }
  };

  const confirmDelete = async () => {
    if (!showDeleteConfirm || !canDelete) return;

    if (showDeleteConfirm.type === 'os') {
      onDeleteOS(showDeleteConfirm.id);
      setSelectedOS(null);
    } else if (showDeleteConfirm.type === 'log' && showDeleteConfirm.log) {
      const log = showDeleteConfirm.log;
      if (!selectedOS) return;

      try {
        // 1. Delete Daily Log
        onDeleteLog(log.id);

        // 2. Sync Hours (without the deleted log)
        await syncFleetHours(selectedOS.machineId, selectedOS.implementId, log.id);
      } catch (error) {
        console.error('Error deleting log:', error);
      }
    }
    setShowDeleteConfirm(null);
  };

  const getIsSimpleActivity = (activityName: string) => {
    const def = activityDefinitions.find(d => d.name === activityName);
    return !!def?.isSimpleActivity;
  };

  const handleAddLog = async () => {
    if (!selectedOS) return;
    const isSimple = getIsSimpleActivity(selectedOS.activity);
    
    if (!isSimple && !newLogAmount) {
      toast.error("Insira a quantidade aplicada.");
      return;
    }

    if (!newLogHorimetroInicial || !newLogHorimetroFinal) {
      toast.error("Insira os horímetros inicial e final.");
      return;
    }

    const amount = isSimple ? 0 : parseNumber(newLogAmount);
    const horimetroInicial = parseNumber(newLogHorimetroInicial);
    const horimetroFinal = parseNumber(newLogHorimetroFinal);
    const manualPerformedArea = parseNumber(newLogPerformedArea);
    
    const performedArea = manualPerformedArea > 0 ? manualPerformedArea : (isSimple ? 0 : (amount / (selectedOS.targetRate || 1)));

    if (isNaN(horimetroInicial) || isNaN(horimetroFinal)) {
      toast.error("Horímetros inválidos.");
      return;
    }

    if (horimetroFinal < horimetroInicial) {
      toast.error("O horímetro final não pode ser menor que o inicial.");
      return;
    }

    try {
      const logData: any = {
        osId: selectedOS.id,
        date: new Date(newLogDate + 'T12:00:00').toISOString(),
        amount: amount,
        operatorId: newLogOperatorId || selectedOS.operatorId,
        horimetroInicial: horimetroInicial,
        horimetroFinal: horimetroFinal,
        performedArea: performedArea,
        helpers: newLogHelpers
      };

      if (editingLog) {
        // 1. Update Daily Log
        const updatedLog = { ...editingLog, ...logData };
        onUpdateLog(updatedLog);
        logData.id = editingLog.id;
      } else {
        // 1. Add Daily Log
        const id = Math.random().toString(36).substr(2, 9);
        const newLog = { ...logData, id };
        onAddLog(newLog);
        logData.id = id;
      }

      // 2. Update Machine/Implement hour meter and location
      await syncFleetHours(selectedOS.machineId, selectedOS.implementId, undefined, logData);

      setNewLogAmount('');
      setNewLogHorimetroInicial('');
      setNewLogHorimetroFinal('');
      setNewLogPerformedArea('');
      setNewLogOperatorId('');
      setNewLogHelpers([]);
      setHelperInput('');
      setEditingLog(null);
      setShowLogForm(false);
    } catch (error) {
      console.error('Error saving log:', error);
    }
  };

  const handleEditLog = (log: DailyLog) => {
    setEditingLog(log);
    setNewLogAmount(log.amount.toString());
    setNewLogDate(format(new Date(log.date.split('T')[0] + 'T12:00:00'), 'yyyy-MM-dd'));
    setNewLogHorimetroInicial((log.horimetroInicial || (log as any).horimetro_inicial)?.toString() || '');
    setNewLogHorimetroFinal((log.horimetroFinal || (log as any).horimetro_final)?.toString() || '');
    setNewLogPerformedArea(log.performedArea?.toString() || '');
    setNewLogOperatorId(log.operatorId || selectedOS?.operatorId || '');
    setNewLogHelpers(log.helpers || []);
    setHelperInput('');
    setShowLogForm(true);
  };

  const handleDeleteLog = async (log: DailyLog) => {
    if (!selectedOS || !canDelete) return;
    setShowDeleteConfirm({ type: 'log', id: log.id, log });
  };

  const handleFinalizeOS = async () => {
    if (!selectedOS) return;

    const totalApplied = currentLogs.reduce((sum, log) => sum + log.amount, 0);
    const deviation = selectedOS.totalPlannedVolume > 0 ? ((totalApplied / selectedOS.totalPlannedVolume) - 1) * 100 : 0;

    // Find the date of the last log
    const latestLogDate = currentLogs.length > 0 
      ? [...currentLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date
      : new Date().toISOString();

    try {
      const updatedOS: ServiceOrder = {
        ...selectedOS,
        status: 'completed',
        completedAt: latestLogDate,
        totalApplied,
        deviation
      };

      // Calculate production bonus if applicable for EACH operator involved
      const activityDef = activityDefinitions.find(ad => ad.name === selectedOS.activity);
      const field = fields.find(f => f.id === selectedOS.fieldId);

      if (activityDef && activityDef.bonusValue && activityDef.bonusUnit && field) {
        // Group logs by operator
        const logsByOperator: Record<string, DailyLog[]> = {};
        currentLogs.forEach(log => {
          const opId = log.operatorId || selectedOS.operatorId;
          if (!logsByOperator[opId]) logsByOperator[opId] = [];
          logsByOperator[opId].push(log);
        });

        for (const [opId, logs] of Object.entries(logsByOperator)) {
          const operator = operators.find(o => o.id === opId);
          if (!operator) continue;

          let paidArea = 0;
          let performedArea = 0;
          const isSimple = !!activityDef.isSimpleActivity;
          
          const opTotalApplied = logs.reduce((sum, log) => sum + log.amount, 0);
          const opTotalHours = logs.reduce((sum, log) => sum + (log.horimetroFinal || 0) - (log.horimetroInicial || 0), 0);
          const opTotalPerformedArea = logs.reduce((sum, log) => sum + (log.performedArea || 0), 0);

          if (activityDef.bonusUnit === 'ha') {
            performedArea = opTotalPerformedArea || (isSimple ? 0 : (opTotalApplied / (selectedOS.targetRate || 1)));
            
            // Calculate total performed area of the entire OS to split field area proportionally
            const totalOSPerformedArea = currentLogs.reduce((sum, log) => {
              const logPerformed = log.performedArea || (isSimple ? 0 : (log.amount / (selectedOS.targetRate || 1)));
              return sum + logPerformed;
            }, 0);

            if (totalOSPerformedArea > 0) {
              const proportion = performedArea / totalOSPerformedArea;
              paidArea = field.area * proportion;
            } else {
              // If only one operator worked (common), they get the full field area
              paidArea = field.area;
            }
          } else {
            // bonus per hour
            performedArea = opTotalHours;
            paidArea = performedArea;
          }

          const totalBonus = Number((paidArea * (activityDef.bonusValue || 0)).toFixed(2));

          if (totalBonus > 0) {
            const bonusRecord: ProductionBonus = {
              id: Date.now().toString() + '-' + opId,
              osId: selectedOS.id,
              date: latestLogDate || new Date().toISOString().split('T')[0],
              activityName: selectedOS.activity,
              fieldName: field.name,
              fieldArea: field.area,
              performedArea,
              paidArea,
              bonusValue: activityDef.bonusValue,
              bonusUnit: activityDef.bonusUnit,
              totalBonus
            };

            // Remove any existing record for this OS to avoid duplication if refinalized
            const filteredHistory = (operator.productionHistory || []).filter(r => r.osId !== selectedOS.id);
            const updatedHistory = [...filteredHistory, bonusRecord];
            onUpdateOperator(operator.id, { productionHistory: updatedHistory });
          }
        }
      }

      onUpdateOS(selectedOS.id, {
        status: 'completed',
        completedAt: latestLogDate,
        totalApplied: totalApplied,
        deviation
      });

      // If it's a Planting activity, update the field's planting date and status
      // Use the date of the last log for the field's birth date
      const isPlantingActivity = activityDef?.category === 'planting' || 
                               selectedOS.activity.toLowerCase().includes('plantio');

      if (isPlantingActivity && field) {
        // Ensure we only use the date part for plantingDate
        const normalizedDate = latestLogDate.includes('T') ? latestLogDate.split('T')[0] : latestLogDate;
        
        onUpdateField(field.id, { 
          plantingDate: normalizedDate,
          status: 'Plantado recentemente'
        });
      }

      // Sync hours and location (passing updated OS to ensure location is reset if needed)
      await syncFleetHours(selectedOS.machineId, selectedOS.implementId, undefined, undefined, updatedOS);

      setSelectedOS(null);
    } catch (error) {
      console.error('Error finalizing OS:', error);
    }
  };

  const [showCancelConfirm, setShowCancelConfirm] = useState<string | null>(null);

  const handleCancelOS = async () => {
    if (!showCancelConfirm) return;
    const osId = showCancelConfirm;

    try {
      const osToCancel = serviceOrders.find(os => os.id === osId);
      if (!osToCancel) return;

      const updatedOS: ServiceOrder = {
        ...osToCancel,
        status: 'cancelled',
        completedAt: new Date().toISOString()
      };

      onUpdateOS(osId, {
        status: 'cancelled',
        completedAt: new Date().toISOString()
      });

      // Sync hours and location
      await syncFleetHours(osToCancel.machineId, osToCancel.implementId, undefined, undefined, updatedOS);

      setSelectedOS(null);
      setShowCancelConfirm(null);
      toast.success('Ordem de Serviço cancelada com sucesso.');
    } catch (error) {
      console.error('Error cancelling OS:', error);
      toast.error('Erro ao cancelar OS.');
    }
  };

  const formatNumber = (num: number, decimals: number = 1) => {
    return num.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  const formatQuantity = (value: number, unit: string) => {
    const unitLabel = unit === 'unit' ? 'mudas' : unit;
    return `${formatNumber(value)} ${unitLabel}`;
  };

  const getUnit = (activityName: string) => {
    const def = activityDefinitions.find(d => d.name === activityName);
    return def?.unit || 'kg';
  };

  const handleReopenOS = async () => {
    if (!selectedOS) return;
    try {
      const updatedOS: ServiceOrder = {
        ...selectedOS,
        status: 'active',
        completedAt: undefined
      };

      onUpdateOS(selectedOS.id, {
        status: 'active',
        completedAt: null
      });

      // Update location and hours
      await syncFleetHours(selectedOS.machineId, selectedOS.implementId, undefined, undefined, updatedOS);

      // Remove production history when reopening to avoid double counting
      operators.forEach(op => {
        if (op.productionHistory?.some(r => r.osId === selectedOS.id)) {
          const updatedHistory = op.productionHistory.filter(r => r.osId !== selectedOS.id);
          onUpdateOperator(op.id, { productionHistory: updatedHistory });
        }
      });

      setSelectedOS(updatedOS);
      toast.success('OS reaberta para edição.');
    } catch (error) {
      console.error('Error reopening OS:', error);
      toast.error('Erro ao reabrir OS.');
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-on-surface tracking-tight">Atividades</h2>
          <p className="text-on-surface-variant font-medium">Controle e monitoramento de ordens de serviço</p>
        </div>
      </header>

      {!selectedOS ? (
        <div className="space-y-8">
          {/* Active OS Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <TrendingUp size={20} />
              <h3 className="font-headline font-extrabold text-xl">OS em Execução</h3>
            </div>
            
            {activeOS.length === 0 ? (
              <div className="bg-surface-container-low p-8 rounded-3xl border border-dashed border-outline-variant text-center">
                <p className="text-on-surface-variant font-medium italic">Nenhuma ordem de serviço ativa no momento.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeOS.map(os => {
                  const field = fields.find(f => f.id === os.fieldId);
                  const operator = operators.find(o => o.id === os.operatorId);
                  return (
                    <button 
                      key={os.id}
                      onClick={() => setSelectedOS(os)}
                      className="bg-surface-container-lowest p-5 rounded-3xl border border-outline-variant hover:border-primary transition-all text-left group shadow-sm"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="bg-primary/10 p-2 rounded-xl text-primary">
                          <ClipboardCheck size={24} />
                        </div>
                        <span className="bg-primary-fixed/30 text-on-primary-fixed text-[10px] font-black uppercase px-3 py-1 rounded-full">Ativa</span>
                      </div>
                      <h4 className="font-headline font-black text-lg mb-1">{os.activity}</h4>
                      <div className="space-y-2 text-sm text-on-surface-variant font-medium">
                        <div className="flex items-center gap-2">
                          <MapPin size={14} /> {os.fieldName || field?.name || 'Talhão N/A'}
                        </div>
                        <div className="flex items-center gap-2">
                          <User size={14} /> 
                          {(() => {
                            const osLogs = allLogs.filter(l => (l.osId || (l as any).os_id) === os.id);
                            const opIds = Array.from(new Set(osLogs.map(l => l.operatorId || os.operatorId)));
                            const names = opIds.map(id => operators.find(o => o.id === id)?.name).filter(Boolean);
                            if (names.length > 1) return `Equipe: ${names.join(', ')}`;
                            return os.operatorName || operator?.name || 'Operador N/A';
                          })()}
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingUp size={14} /> Meta: {formatNumber(os.totalPlannedVolume)} {getUnit(os.activity)}
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between text-primary font-bold text-xs uppercase tracking-widest">
                        Ver Detalhes <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* History Section */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-on-surface-variant">
                <History size={20} />
                <h3 className="font-headline font-extrabold text-xl">Histórico de Conclusão</h3>
              </div>
              
              <div className="flex items-center gap-2 bg-surface-container-low p-2 rounded-2xl border border-outline-variant/30">
                <div className="flex items-center gap-2 px-2">
                  <Calendar size={14} className="text-on-surface-variant" />
                  <input 
                    type="date" 
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="bg-transparent text-[10px] font-bold uppercase outline-none"
                  />
                </div>
                <div className="w-px h-4 bg-outline-variant/50" />
                <div className="flex items-center gap-2 px-2">
                  <input 
                    type="date" 
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="bg-transparent text-[10px] font-bold uppercase outline-none"
                  />
                </div>
                {(filterStartDate || filterEndDate) && (
                  <button 
                    onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }}
                    className="p-1 hover:bg-surface-container rounded-full text-on-surface-variant"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="bg-surface-container-low rounded-3xl overflow-hidden border border-outline-variant/50">
              {displayedCompletedOS.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-on-surface-variant font-medium italic">Nenhum registro histórico encontrado.</p>
                </div>
              ) : (
                <div className="divide-y divide-outline-variant/30">
                  {displayedCompletedOS.map(os => {
                    const field = fields.find(f => f.id === os.fieldId);
                    const isHighDeviation = os.deviation && Math.abs(os.deviation) > 5;
                    const isSimple = getIsSimpleActivity(os.activity);
                    return (
                      <button 
                        key={os.id} 
                        onClick={() => setSelectedOS(os)}
                        className="w-full p-4 flex items-center justify-between hover:bg-surface-container transition-colors text-left"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-xl ${os.status === 'cancelled' ? 'bg-outline-variant/20 text-on-surface-variant' : isHighDeviation ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary'}`}>
                            {os.status === 'cancelled' ? <X size={20} /> : <CheckCircle2 size={20} />}
                          </div>
                          <div>
                            <p className="font-bold text-sm">{os.activity} {os.status === 'cancelled' && <span className="text-[10px] text-error">(Cancelada)</span>}</p>
                            <p className="text-[10px] font-medium text-on-surface-variant uppercase">{os.fieldName || field?.name} • {format(new Date(os.completedAt || os.createdAt), 'dd/MM/yyyy')}</p>
                            <p className="text-[9px] font-black text-primary uppercase mt-0.5">
                              {(() => {
                                const osLogs = allLogs.filter(l => (l.osId || (l as any).os_id) === os.id);
                                const opIds = Array.from(new Set(osLogs.map(l => l.operatorId || os.operatorId)));
                                const names = opIds.map(id => operators.find(o => o.id === id)?.name).filter(Boolean);
                                return names.length > 1 ? `Equipe: ${names.join(', ')}` : `Operador: ${names[0] || 'N/A'}`;
                              })()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-4">
                          <div>
                            {!isSimple ? (
                              <>
                                <p className="font-black text-sm">{formatNumber(os.totalApplied || 0)} {getUnit(os.activity)}</p>
                                <p className={`text-[10px] font-black uppercase ${isHighDeviation ? 'text-error' : 'text-primary'}`}>
                                  Desvio: {os.deviation ? (os.deviation > 0 ? '+' : '') + formatNumber(os.deviation) : '0'}%
                                </p>
                              </>
                            ) : (
                              <p className="font-black text-sm">
                                {formatNumber(allLogs.filter(l => (l.osId || (l as any).os_id) === os.id).reduce((sum, l) => sum + (l.horimetroFinal || 0) - (l.horimetroInicial || 0), 0))} h
                              </p>
                            )}
                          </div>
                          <ChevronRight size={16} className="text-on-surface-variant" />
                        </div>
                      </button>
                    );
                  })}
                  {!filterStartDate && !filterEndDate && filteredCompletedOS.length > 10 && (
                    <div className="p-3 text-center bg-surface-container/30">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                        Mostrando as 10 mais recentes • Use o filtro para ver mais
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      ) : (
        /* OS Detail View */
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <button 
            onClick={() => setSelectedOS(null)}
            className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-widest mb-4"
          >
            <ArrowRight size={18} className="rotate-180" /> Voltar para Lista
          </button>

          <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant shadow-sm space-y-6">
            <div className="flex justify-between items-start">
              <div className="flex items-start gap-3">
                <div>
                  <h3 className="text-2xl font-black text-on-surface">{selectedOS.activity}</h3>
                  <div className="flex flex-col gap-0.5 mt-1">
                    <p className="text-on-surface-variant font-bold uppercase text-xs tracking-widest">
                      {selectedOS.fieldName || fields.find(f => f.id === selectedOS.fieldId)?.name}
                    </p>
                    <p className="text-primary font-black uppercase text-[10px] tracking-widest flex items-center gap-1">
                      <User size={12} />
                      {(() => {
                        const participatingOperatorIds = Array.from(new Set(currentLogs.map(log => log.operatorId || selectedOS.operatorId)));
                        const opNames = participatingOperatorIds
                          .map(id => operators.find(o => o.id === id)?.name)
                          .filter(Boolean);
                        
                        if (opNames.length > 1) {
                          return `Equipe: ${opNames.join(', ')}`;
                        }
                        return `Operador: ${opNames[0] || selectedOS.operatorName || operators.find(o => o.id === selectedOS.operatorId)?.name || 'N/A'}`;
                      })()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={handleOpenEditOS}
                    className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                    title="Editar Detalhes da OS"
                  >
                    <Edit2 size={20} />
                  </button>
                  <button 
                    onClick={handleDownloadPDF}
                    disabled={isGeneratingPDF}
                    className="p-2 text-on-surface-variant hover:text-secondary hover:bg-secondary/10 rounded-lg transition-all"
                    title="Baixar PDF da OS"
                  >
                    <Download size={20} />
                  </button>
                  {canDelete && (
                    <button 
                      onClick={() => handleDeleteOS(selectedOS.id)}
                      className="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-all"
                      title="Excluir Ordem de Serviço"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-on-surface-variant uppercase mb-1">Meta Total</p>
                <p className="text-2xl font-black text-primary">{formatNumber(selectedOS.totalPlannedVolume)} {getUnit(selectedOS.activity)}</p>
              </div>
            </div>

            {isEditingOS && (
              <div className="bg-surface-container-low p-5 rounded-2xl border border-primary/20 space-y-4 animate-in zoom-in-95 duration-200">
                <h5 className="font-bold text-sm text-primary uppercase tracking-widest">Editar Detalhes da OS</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase">Meta Total ({getUnit(selectedOS.activity)})</label>
                    <input 
                      type="text" 
                      inputMode="decimal"
                      value={editOSTotalPlanned}
                      onChange={(e) => setEditOSTotalPlanned(e.target.value)}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="w-full bg-surface-container-lowest p-3 rounded-xl border border-outline-variant font-bold text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase">Taxa Alvo ({getUnit(selectedOS.activity)}/ha)</label>
                    <input 
                      type="text" 
                      inputMode="decimal"
                      value={editOSTargetRate}
                      onChange={(e) => setEditOSTargetRate(e.target.value)}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="w-full bg-surface-container-lowest p-3 rounded-xl border border-outline-variant font-bold text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={handleSaveOSChanges}
                    className="flex-1 bg-primary text-on-primary py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    <Save size={16} /> Salvar Alterações
                  </button>
                  <button 
                    onClick={() => setIsEditingOS(false)}
                    className="bg-surface-container text-on-surface p-3 rounded-xl"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
            )}

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {!getIsSimpleActivity(selectedOS.activity) && (
                  <>
                    <div className="bg-surface-container p-4 rounded-2xl">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Realizado Acumulado</p>
                      <p className="text-xl font-black text-on-surface">
                        {formatNumber(currentLogs.reduce((sum, log) => sum + log.amount, 0))} {getUnit(selectedOS.activity)}
                      </p>
                    </div>
                    <div className="bg-surface-container p-4 rounded-2xl">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Área Total Realizada</p>
                      <p className="text-xl font-black text-on-surface">
                        {formatNumber(currentLogs.reduce((sum, log) => sum + (log.performedArea || 0), 0))} ha
                      </p>
                    </div>
                    <div className="bg-surface-container p-4 rounded-2xl">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Saldo Restante</p>
                      <p className="text-xl font-black text-on-surface">
                        {formatNumber(Math.max(0, selectedOS.totalPlannedVolume - currentLogs.reduce((sum, log) => sum + log.amount, 0)))} {getUnit(selectedOS.activity)}
                      </p>
                    </div>
                  </>
                )}
                <div className="bg-surface-container p-4 rounded-2xl">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Total de Horas</p>
                  <p className="text-xl font-black text-on-surface">
                    {formatNumber(currentLogs.reduce((sum, log) => sum + (log.horimetroFinal || (log as any).horimetro_final || 0) - (log.horimetroInicial || (log as any).horimetro_inicial || 0), 0))} h
                  </p>
                </div>
              </div>

              {/* Resumo por Operador */}
              {!getIsSimpleActivity(selectedOS.activity) && currentLogs.length > 0 && (
                <div className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/30 space-y-3">
                  <h4 className="font-headline font-black text-sm uppercase tracking-widest text-on-surface-variant">Resumo por Operador</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-on-surface-variant font-black uppercase tracking-widest border-b border-outline-variant/30">
                          <th className="pb-2">Operador</th>
                          <th className="pb-2">Volume</th>
                          <th className="pb-2">Área (ha)</th>
                          <th className="pb-2">Horas</th>
                          <th className="pb-2 text-right">Desvio Prop.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/20">
                        {(() => {
                          const opSummary: Record<string, { volume: number, area: number, hours: number }> = {};
                          currentLogs.forEach(log => {
                            const opId = log.operatorId || selectedOS.operatorId;
                            if (!opSummary[opId]) opSummary[opId] = { volume: 0, area: 0, hours: 0 };
                            opSummary[opId].volume += log.amount;
                            opSummary[opId].area += log.performedArea || 0;
                            opSummary[opId].hours += (log.horimetroFinal || 0) - (log.horimetroInicial || 0);
                          });

                          return Object.entries(opSummary).map(([opId, data]) => {
                            const opName = operators.find(o => o.id === opId)?.name || 'N/A';
                            const totalOSApplied = currentLogs.reduce((sum, l) => sum + l.amount, 0);
                            const totalOSPlanned = selectedOS.totalPlannedVolume;
                            const opShare = totalOSApplied > 0 ? (data.volume / totalOSApplied) : 0;
                            const opProportionalArea = opShare * (fields.find(f => f.id === selectedOS.fieldId)?.area || 0);
                            
                            const deviation = ((totalOSApplied / totalOSPlanned) - 1) * 100;
                            const isHigh = Math.abs(deviation) > 5;

                            return (
                              <tr key={opId} className="font-bold">
                                <td className="py-2 text-on-surface">{opName}</td>
                                <td className="py-2">{formatNumber(data.volume)} {getUnit(selectedOS.activity)}</td>
                                <td className="py-2">{formatNumber(opProportionalArea)} ha</td>
                                <td className="py-2">{formatNumber(data.hours)} h</td>
                                <td className={`py-2 text-right ${isHigh ? 'text-error' : 'text-primary'}`}>
                                  {totalOSApplied > 0 ? (deviation > 0 ? '+' : '') + formatNumber(deviation) + '%' : '-'}
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-headline font-black text-lg">Lançamentos Diários</h4>
                  <button 
                    onClick={() => setShowLogForm(true)}
                    className="bg-primary text-on-primary p-2 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-md"
                  >
                    <Plus size={20} />
                  </button>
                </div>

              {showLogForm && (
                <div className="bg-surface-container-low p-5 rounded-2xl border border-primary/20 space-y-4 animate-in zoom-in-95 duration-200">
                  <h5 className="font-bold text-sm text-primary uppercase tracking-widest">
                    {editingLog ? 'Editar Lançamento' : 'Novo Lançamento'}
                  </h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-on-surface-variant uppercase">Data</label>
                      <input 
                        type="date" 
                        value={newLogDate}
                        onChange={(e) => setNewLogDate(e.target.value)}
                        className="w-full bg-surface-container-lowest p-3 rounded-xl border border-outline-variant font-bold text-sm"
                      />
                    </div>
                    {!getIsSimpleActivity(selectedOS.activity) && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-on-surface-variant uppercase">Quantidade ({getUnit(selectedOS.activity)})</label>
                        <input 
                          type="text" 
                          inputMode="decimal"
                          value={newLogAmount}
                          onChange={(e) => setNewLogAmount(e.target.value)}
                          onWheel={(e) => e.currentTarget.blur()}
                          placeholder="Ex: 8000"
                          className="w-full bg-surface-container-lowest p-3 rounded-xl border border-outline-variant font-bold text-sm"
                        />
                      </div>
                    )}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-on-surface-variant uppercase">Horímetro Inicial</label>
                      <input 
                        type="text" 
                        inputMode="decimal"
                        value={newLogHorimetroInicial}
                        onChange={(e) => setNewLogHorimetroInicial(e.target.value)}
                        onWheel={(e) => e.currentTarget.blur()}
                        placeholder="Ex: 1240.5"
                        className="w-full bg-surface-container-lowest p-3 rounded-xl border border-outline-variant font-bold text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-on-surface-variant uppercase">Horímetro Final</label>
                      <input 
                        type="text" 
                        inputMode="decimal"
                        value={newLogHorimetroFinal}
                        onChange={(e) => setNewLogHorimetroFinal(e.target.value)}
                        onWheel={(e) => e.currentTarget.blur()}
                        placeholder="Ex: 1248.2"
                        className="w-full bg-surface-container-lowest p-3 rounded-xl border border-outline-variant font-bold text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-on-surface-variant uppercase">Área Realizada (ha)</label>
                      <input 
                        type="text" 
                        inputMode="decimal"
                        value={newLogPerformedArea}
                        onChange={(e) => setNewLogPerformedArea(e.target.value)}
                        onWheel={(e) => e.currentTarget.blur()}
                        placeholder={getIsSimpleActivity(selectedOS.activity) ? "Obrigatório" : "Opcional (Auto)"}
                        className="w-full bg-surface-container-lowest p-3 rounded-xl border border-outline-variant font-bold text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-on-surface-variant uppercase">Operador Principal</label>
                      <select 
                        value={newLogOperatorId || selectedOS.operatorId}
                        onChange={(e) => setNewLogOperatorId(e.target.value)}
                        className="w-full bg-surface-container-lowest p-3 rounded-xl border border-outline-variant font-bold text-sm"
                      >
                        {operators.filter(o => o.status === 'Active' || o.status === 'Ativo' || o.id === selectedOS.operatorId).map(op => (
                          <option key={op.id} value={op.id}>{op.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Helpers / Additional Collaborators Section */}
                  <div className="space-y-2 border-t border-outline-variant/30 pt-3">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase flex items-center justify-between">
                      Colaboradores Adicionais / Equipe de Apoio
                      <span className="text-[8px] opacity-70">({newLogHelpers.length} adicionados)</span>
                    </label>
                    
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input 
                          type="text" 
                          list="helper-suggestions"
                          value={helperInput}
                          onChange={(e) => setHelperInput(e.target.value)}
                          placeholder="Digite o nome ou selecione..."
                          className="w-full bg-surface-container-lowest p-3 rounded-xl border border-outline-variant font-bold text-sm pr-10"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (helperInput.trim()) {
                                setNewLogHelpers([...newLogHelpers, helperInput.trim()]);
                                setHelperInput('');
                              }
                            }
                          }}
                        />
                        <datalist id="helper-suggestions">
                          {operators.map(op => (
                            <option key={op.id} value={op.name} />
                          ))}
                        </datalist>
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          if (helperInput.trim()) {
                            setNewLogHelpers([...newLogHelpers, helperInput.trim()]);
                            setHelperInput('');
                          }
                        }}
                        className="bg-primary/10 text-primary p-3 rounded-xl hover:bg-primary/20 transition-all"
                      >
                        <Plus size={20} />
                      </button>
                    </div>

                    {newLogHelpers.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {newLogHelpers.map((helper, idx) => (
                          <div key={idx} className="bg-primary/5 text-primary text-[10px] font-bold px-3 py-1.5 rounded-full border border-primary/10 flex items-center gap-2 pr-1">
                            {helper}
                            <button 
                              type="button"
                              onClick={() => setNewLogHelpers(newLogHelpers.filter((_, i) => i !== idx))}
                              className="bg-primary/10 hover:bg-primary/20 rounded-full p-0.5"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={handleAddLog}
                      className="flex-1 bg-primary text-on-primary py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                      <Save size={16} /> Salvar Lançamento
                    </button>
                    <button 
                      onClick={() => {
                        setShowLogForm(false);
                        setEditingLog(null);
                        setNewLogAmount('');
                        setNewLogHelpers([]);
                        setHelperInput('');
                      }}
                      className="bg-surface-container text-on-surface p-3 rounded-xl"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {currentLogs.length === 0 ? (
                  <p className="text-center py-8 text-on-surface-variant font-medium italic text-sm">Nenhum lançamento registrado ainda.</p>
                ) : (
                  currentLogs.map(log => (
                    <div key={log.id} className="flex justify-between items-center p-4 bg-surface-container-low rounded-2xl border border-outline-variant/30 group/log">
                      <div className="flex items-center gap-3">
                        <div className="bg-surface-container-lowest p-2 rounded-lg text-on-surface-variant">
                          <Calendar size={16} />
                        </div>
                        <div>
                          <p className="font-bold text-sm">{format(new Date(log.date.split('T')[0] + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })}</p>
                          <p className="text-[10px] font-medium text-on-surface-variant uppercase">
                            {operators.find(o => o.id === (log.operatorId || selectedOS.operatorId))?.name || 'Operador N/A'}
                            {log.helpers && log.helpers.length > 0 && ` + ${log.helpers.length} auxiliares`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right mr-4">
                          <p className="font-black text-primary">
                            {log.amount > 0 ? `${formatNumber(log.amount)} ${getUnit(selectedOS.activity)}` : `${formatNumber(log.performedArea || 0)} ha`}
                          </p>
                          <p className="text-[10px] font-bold text-on-surface-variant uppercase">
                            Área: {formatNumber(log.performedArea || 0)} ha
                          </p>
                          {(log.horimetroInicial !== undefined || (log as any).horimetro_inicial !== undefined) && (log.horimetroFinal !== undefined || (log as any).horimetro_final !== undefined) && (
                            <p className="text-[10px] font-bold text-on-surface-variant uppercase">
                              {formatNumber((log.horimetroFinal || (log as any).horimetro_final) - (log.horimetroInicial || (log as any).horimetro_inicial))} h ({log.horimetroInicial || (log as any).horimetro_inicial} - {log.horimetroFinal || (log as any).horimetro_final})
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditLog(log);
                            }}
                            className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg opacity-0 group-hover/log:opacity-100 transition-all"
                            title="Editar Lançamento"
                          >
                            <Edit2 size={16} />
                          </button>
                          {canDelete && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteLog(log);
                              }}
                              className="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg opacity-0 group-hover/log:opacity-100 transition-all"
                              title="Excluir Lançamento"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-6 border-t border-outline-variant space-y-3">
              {selectedOS.status === 'active' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button 
                    onClick={handleFinalizeOS}
                    className="bg-surface-container-highest text-on-surface py-5 rounded-3xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-primary hover:text-on-primary transition-all shadow-lg active:scale-[0.98]"
                  >
                    <CheckCircle2 size={24} /> Finalizar OS
                  </button>
                  <button 
                    onClick={() => setShowCancelConfirm(selectedOS.id)}
                    className="bg-error/10 text-error py-5 rounded-3xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-error hover:text-on-error transition-all shadow-sm active:scale-[0.98]"
                  >
                    <X size={24} /> Cancelar OS
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleReopenOS}
                  className="w-full bg-tertiary text-on-tertiary py-5 rounded-3xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:opacity-90 transition-all shadow-lg active:scale-[0.98]"
                >
                  <History size={24} /> Reabrir OS para Edição
                </button>
              )}
              <p className="text-center text-[10px] font-bold text-on-surface-variant uppercase mt-4 flex items-center justify-center gap-2">
                <AlertTriangle size={12} className="text-tertiary" /> {selectedOS.status === 'active' ? 'A finalização registrará o desvio final no histórico do talhão.' : selectedOS.status === 'cancelled' ? 'Esta OS está cancelada e não conta para o progresso.' : 'Reabrir a OS permite adicionar ou editar lançamentos diários.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-[2rem] w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-error/10 text-error rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle size={32} />
              </div>
              <div>
                <h3 className="text-xl font-headline font-black text-on-surface">Confirmar Exclusão</h3>
                <p className="text-sm font-medium text-on-surface-variant mt-2">
                  {showDeleteConfirm.type === 'os' 
                    ? 'Tem certeza que deseja excluir esta Ordem de Serviço? Todos os lançamentos serão removidos e os insumos retornarão ao estoque.'
                    : 'Deseja excluir este lançamento diário? O estoque proporcional será devolvido.'}
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 py-3 font-bold bg-surface-container text-on-surface rounded-xl uppercase text-xs tracking-widest"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 py-3 font-bold bg-error text-on-error rounded-xl uppercase text-xs tracking-widest shadow-lg shadow-error/20"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-[2rem] w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-error/10 text-error rounded-full flex items-center justify-center mx-auto">
                <X size={32} />
              </div>
              <div>
                <h3 className="text-xl font-headline font-black text-on-surface">Cancelar OS</h3>
                <p className="text-sm font-medium text-on-surface-variant mt-2">
                  Deseja realmente cancelar esta Ordem de Serviço? Ela não contará para o progresso do planejamento.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setShowCancelConfirm(null)}
                  className="flex-1 py-3 font-bold bg-surface-container text-on-surface rounded-xl uppercase text-xs tracking-widest"
                >
                  Voltar
                </button>
                <button 
                  onClick={handleCancelOS}
                  className="flex-1 py-3 font-bold bg-error text-on-error rounded-xl uppercase text-xs tracking-widest shadow-lg shadow-error/20"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden OS Report for PDF Generation */}
      {selectedOS && (
        <div className="hidden">
          <div ref={osReportRef} className="printable-os bg-white p-8 space-y-4 text-black" style={{ width: '190mm' }}>
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-primary pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white">
                  <ClipboardCheck size={24} />
                </div>
                <div>
                  <h1 className="text-2xl font-black uppercase tracking-tighter">Ordem de Serviço Florestal</h1>
                  <p className="text-[10px] font-bold text-gray-500 uppercase">ID: {selectedOS.id} • Gerado em: {new Date().toLocaleString('pt-BR')}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-bold uppercase text-gray-400">Status</p>
                <p className={`text-sm font-black uppercase ${selectedOS.status === 'completed' ? 'text-green-600' : selectedOS.status === 'cancelled' ? 'text-red-600' : 'text-blue-600'}`}>
                  {selectedOS.status === 'completed' ? 'Finalizada' : selectedOS.status === 'cancelled' ? 'Cancelada' : 'Em Andamento'}
                </p>
              </div>
            </div>

            {/* Highlights Summary */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-primary/5 p-3 rounded-2xl border border-primary/10 text-center">
                <p className="text-[10px] font-bold text-primary uppercase tracking-tighter mb-1">TAXA DE APLICAÇÃO</p>
                <p className="text-lg font-black text-on-surface leading-none">
                  {formatNumber(selectedOS.targetRate)} 
                </p>
                <p className="text-[10px] font-bold opacity-70 mt-1 uppercase">
                  {activityDefinitions.find(ad => ad.name === selectedOS.activity)?.unit === 'unit' ? 'mudas/ha' : `${activityDefinitions.find(ad => ad.name === selectedOS.activity)?.unit || 'L'}/ha`}
                </p>
              </div>
              <div className="bg-blue-600/5 p-3 rounded-2xl border border-blue-600/10 text-center">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter mb-1">ÁREA TOTAL</p>
                <p className="text-lg font-black text-on-surface leading-none">
                  {formatNumber(parseNumber(fields.find(f => f.id === selectedOS.fieldId)?.area || 0))} 
                </p>
                <p className="text-[10px] font-bold opacity-70 mt-1 uppercase">ha</p>
              </div>
              <div className="bg-orange-600/5 p-3 rounded-2xl border border-orange-600/10 text-center">
                <p className="text-[10px] font-bold text-orange-600 uppercase tracking-tighter mb-1">VOLUME TOTAL</p>
                <p className="text-lg font-black text-on-surface leading-none">
                  {formatNumber(selectedOS.totalPlannedVolume, 0)} 
                </p>
                <p className="text-[10px] font-bold opacity-70 mt-1 uppercase">
                  {activityDefinitions.find(ad => ad.name === selectedOS.activity)?.unit === 'unit' ? 'mudas' : (selectedOS.loadType === 'solid' ? 'kg' : activityDefinitions.find(ad => ad.name === selectedOS.activity)?.unit || 'L')}
                </p>
              </div>
              <div className="bg-gray-100 p-3 rounded-2xl border border-gray-200 text-center">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter mb-1">TEMPO EST.</p>
                <p className="text-lg font-black text-on-surface leading-none">
                  {(() => {
                    const ad = activityDefinitions.find(a => a.name === selectedOS.activity);
                    if (ad?.dailyGoal && ad.dailyGoal > 0) {
                      const field = fields.find(f => f.id === selectedOS.fieldId);
                      const area = parseNumber(field?.area || 0);
                      const isVolumeBased = (ad.unit === 'L' || ad.unit === 'kg') && ad.dailyGoal > 50;
                      const estimatedDays = isVolumeBased 
                        ? selectedOS.totalPlannedVolume / ad.dailyGoal 
                        : area / ad.dailyGoal;
                      return estimatedDays >= 1 ? `${formatNumber(estimatedDays, 1)} dias` : `${Math.round(estimatedDays * 8)}h`;
                    }
                    return 'N/A';
                  })()}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              {/* Section 1: Informações Gerais */}
              <div className="space-y-3">
                <p className="text-[11px] font-black text-primary uppercase tracking-widest border-b-2 border-primary/20 pb-2">Informações Gerais</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-end border-b border-outline-variant pb-1 py-1">
                    <span className="text-[11px] font-medium text-on-surface-variant uppercase">Talhão</span>
                    <span className="font-headline font-bold text-sm text-primary">{selectedOS.fieldName || fields.find(f => f.id === selectedOS.fieldId)?.name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-end border-b border-outline-variant pb-1 py-1">
                    <span className="text-[11px] font-medium text-on-surface-variant uppercase">Atividade</span>
                    <span className="font-headline font-bold text-sm">{selectedOS.activity}</span>
                  </div>
                  <div className="flex justify-between items-end border-b border-outline-variant pb-1 py-1">
                    <span className="text-[11px] font-medium text-on-surface-variant uppercase">Operador</span>
                    <span className="font-headline font-bold text-sm">{selectedOS.operatorName || operators.find(o => o.id === selectedOS.operatorId)?.name || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Section 2: Parâmetros de Regulagem */}
              {!getIsSimpleActivity(selectedOS.activity) && (
                <div className="space-y-3">
                  <p className="text-[11px] font-black text-primary uppercase tracking-widest border-b-2 border-primary/20 pb-2">Parâmetros de Regulagem</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    <div className="flex justify-between items-end border-b border-outline-variant pb-1 py-1">
                      <span className="text-[10px] font-medium text-on-surface-variant uppercase">Largura</span>
                      <span className="font-headline font-bold text-xs">{formatNumber(selectedOS.width)} m</span>
                    </div>
                    <div className="flex justify-between items-end border-b border-outline-variant pb-1 py-1">
                      <span className="text-[10px] font-medium text-on-surface-variant uppercase">Dist. Teste</span>
                      <span className="font-headline font-bold text-xs">{formatNumber(selectedOS.testDistance)} m</span>
                    </div>
                    <div className="flex justify-between items-end border-b border-outline-variant pb-1 py-1">
                      <span className="text-[10px] font-medium text-on-surface-variant uppercase">{selectedOS.loadType === 'solid' ? 'Saídas' : 'Bicos'}</span>
                      <span className="font-headline font-bold text-xs">{formatNumber(selectedOS.nozzles, 0)}</span>
                    </div>
                    <div className="flex justify-between items-end border-b border-outline-variant pb-1 py-1">
                      <span className="text-[10px] font-medium text-on-surface-variant uppercase">{selectedOS.loadType === 'solid' ? 'Peso/Saída' : 'V/Bico'}</span>
                      <span className="font-headline font-bold text-xs">
                        {formatNumber(((selectedOS.testDistance * selectedOS.width * selectedOS.targetRate) / 10000 / (selectedOS.nozzles || 1)) * 1000, 0)} {selectedOS.loadType === 'solid' ? 'g' : 'ml'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Section 3: Insumos */}
            {selectedOS.inputs && selectedOS.inputs.length > 0 && (
              <div className="space-y-3">
                <p className="text-[11px] font-black text-primary uppercase tracking-widest border-b-2 border-primary/20 pb-2">Insumos Necessários</p>
                <div className="bg-surface-container-low rounded-3xl p-6 border border-outline-variant/20">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    {selectedOS.inputs.map((input: any) => {
                      const field = fields.find(f => f.id === selectedOS.fieldId);
                      const area = parseNumber(field?.area || 0);
                      const totalNeeded = input.dose * area;
                      const tankCapacity = selectedOS.tankCapacity || 0;
                      const areaPerTank = tankCapacity > 0 ? tankCapacity / selectedOS.targetRate : 0;
                      const perTank = input.dose * areaPerTank;

                      return (
                        <div key={input.inputId} className="flex flex-col py-2 border-b border-outline-variant/30 last:border-0">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-black text-on-surface">{input.name || input.inputName}</span>
                            <div className="text-right">
                              <p className="text-base font-black text-primary">{formatQuantity(totalNeeded, input.unit)}</p>
                            </div>
                          </div>
                          <div className="flex justify-between items-center text-[10px] font-bold text-on-surface-variant uppercase">
                            <span>Dose: {formatQuantity(input.dose, input.unit)}/ha</span>
                            {selectedOS.loadType !== 'none' && (
                              <span className="text-secondary font-black">
                                {selectedOS.loadType === 'solid' ? 'Na Caçamba' : 'No Tanque'}: {formatQuantity(perTank, input.unit)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Section 4: Resumo de Carga */}
            {!getIsSimpleActivity(selectedOS.activity) && selectedOS.loadType !== 'none' && (
              <div className="space-y-3 bg-primary/5 p-6 rounded-3xl border border-primary/10">
                <p className="text-[11px] font-black text-primary uppercase tracking-widest border-b border-primary/20 pb-2 flex items-center gap-2">
                  <Droplets size={16} /> Resumo de Operação
                </p>
                <div className="grid grid-cols-4 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase">Capacidade</p>
                    <p className="text-base font-black text-on-surface">{selectedOS.tankCapacity} {selectedOS.loadType === 'solid' ? 'kg' : 'L'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase">Rendimento</p>
                    <p className="text-base font-black text-on-surface">{formatNumber((selectedOS.tankCapacity || 0) / selectedOS.targetRate, 2)} ha/cargas</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase">Operações</p>
                    <p className="text-base font-black text-on-surface">{formatNumber(parseNumber(fields.find(f => f.id === selectedOS.fieldId)?.area || 0) / ((selectedOS.tankCapacity || 0) / selectedOS.targetRate), 1)} viagens</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-primary uppercase">Volume Total</p>
                    <p className="text-lg font-black text-primary">{formatNumber(selectedOS.totalPlannedVolume, 0)} {selectedOS.loadType === 'solid' ? 'kg' : getUnit(selectedOS.activity)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Section 5: Histórico de Lançamentos */}
            <div className="space-y-3">
              <p className="text-[11px] font-black text-primary uppercase tracking-widest border-b-2 border-primary/20 pb-2">Histórico de Lançamentos</p>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="p-2 text-[10px] font-black uppercase text-gray-500 border border-gray-200">Data</th>
                    <th className="p-2 text-[10px] font-black uppercase text-gray-500 border border-gray-200">Operador</th>
                    <th className="p-2 text-[10px] font-black uppercase text-gray-500 border border-gray-200">Quant.</th>
                    <th className="p-2 text-[10px] font-black uppercase text-gray-500 border border-gray-200">Horímetro</th>
                    <th className="p-2 text-[10px] font-black uppercase text-gray-500 border border-gray-200">Rend.</th>
                  </tr>
                </thead>
                <tbody>
                  {currentLogs.slice(0, 10).map((log) => (
                    <tr key={log.id}>
                      <td className="p-2 text-[11px] border border-gray-200">{format(new Date(log.date), 'dd/MM/yyyy')}</td>
                      <td className="p-2 text-[11px] border border-gray-200 leading-tight">{operators.find(o => o.id === log.operatorId)?.name || 'N/A'}</td>
                      <td className="p-2 text-[11px] border border-gray-200">{formatNumber(log.amount)} {getUnit(selectedOS.activity)}</td>
                      <td className="p-2 text-[11px] border border-gray-200">{formatNumber(log.horimetroInicial)} - {formatNumber(log.horimetroFinal)}</td>
                      <td className="p-2 text-[11px] border border-gray-200">{formatNumber((log.horimetroFinal || 0) - (log.horimetroInicial || 0))} h</td>
                    </tr>
                  ))}
                  {currentLogs.length > 10 && (
                    <tr>
                      <td colSpan={5} className="p-2 text-[10px] text-center text-gray-400 italic">Mais {currentLogs.length - 10} registros não exibidos.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="pt-8 border-t-2 border-gray-100 flex justify-center">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fim do Relatório</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
