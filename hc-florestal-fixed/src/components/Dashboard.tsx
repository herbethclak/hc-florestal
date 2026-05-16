import React from 'react';
import { 
  Tractor as TractorIcon, 
  LayoutGrid,
  AlertTriangle,
  AlertCircle,
  Wrench,
  TrendingUp,
  ChevronRight,
  Package,
  Plus,
  Droplets
} from 'lucide-react';
import { Weather, Activity, InputItem, Machine, Planning, Field, ServiceOrder, DailyLog, ActivityDefinition } from '../types';

interface DashboardProps {
  activities: Activity[];
  onNewOS: () => void;
  onViewAll: () => void;
  inputs: InputItem[];
  machines: Machine[];
  plannings: Planning[];
  farmName: string;
  onEditFarmName: (name: string) => void;
  onTabChange: (tab: string) => void;
  getPlanningProgress: (plan: Planning) => number;
  fields: Field[];
  serviceOrders: ServiceOrder[];
  allDailyLogs: DailyLog[];
  activityDefinitions: ActivityDefinition[];
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  activities, 
  onNewOS, 
  onViewAll,
  inputs,
  machines,
  plannings,
  farmName,
  onEditFarmName,
  onTabChange,
  getPlanningProgress,
  fields,
  serviceOrders,
  allDailyLogs,
  activityDefinitions
}) => {
  const [isEditingFarmName, setIsEditingFarmName] = React.useState(false);
  const [tempFarmName, setTempFarmName] = React.useState(farmName);

  const formatNumber = (num: number, decimals: number = 1) => {
    return num.toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    });
  };

  const handleFarmNameSubmit = () => {
    onEditFarmName(tempFarmName);
    setIsEditingFarmName(false);
  };
  // Calculate suggestions data
  // Group inputs by active ingredient to check total stock per ingredient
  const ingredientGroups = inputs.reduce((acc, input) => {
    const rawKey = input.activeIngredient || input.name;
    const key = rawKey.trim().toLowerCase();
    
    if (!acc[key]) {
      acc[key] = {
        name: rawKey.trim(), // Keep original casing for display
        totalStock: 0,
        minStock: 0,
        unit: input.unit,
        items: []
      };
    }
    acc[key].totalStock += input.stock;
    // Use the highest minStock as the threshold for the active ingredient
    acc[key].minStock = Math.max(acc[key].minStock, input.minStock || 0);
    acc[key].items.push(input);
    return acc;
  }, {} as Record<string, { name: string; totalStock: number; minStock: number; unit: string; items: InputItem[] }>);

  const criticalIngredients = Object.values(ingredientGroups).filter(g => g.totalStock <= g.minStock && g.minStock > 0);

  const maintenanceMachines = machines.filter(m => {
    const nextRevision = (m.lastRevisionHours || 0) + (m.revisionInterval || 250);
    return m.hours >= nextRevision;
  });
  const activePlannings = plannings.filter(p => p.status === 'active');
  
  // Calculate Recurrence Alerts
  const recurrenceAlerts = serviceOrders
    .filter(os => os.status === 'completed' && os.completedAt)
    .reduce((acc, os) => {
      const activityDef = activityDefinitions.find(ad => ad.name === os.activity);
      if (activityDef?.followUpInterval) {
        const completedDate = new Date(os.completedAt!);
        const followUpDate = new Date(completedDate);
        followUpDate.setDate(followUpDate.getDate() + activityDef.followUpInterval);
        
        const today = new Date();
        const diffTime = followUpDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Show alert if follow up was due or is due in less than 10 days
        // but only show the most recent completion for each (field + activity)
        const existingAlertIdx = acc.findIndex(a => a.fieldId === os.fieldId && a.activityName === os.activity);
        
        // CHECK: Is there an active OS for this field/activity created AFTER this one's completion?
        const hasActiveFollowUp = serviceOrders.some(other => 
          other.fieldId === os.fieldId && 
          other.activity === os.activity && 
          other.status === 'active' &&
          other.createdAt > os.createdAt
        );

        if (diffDays <= 10 && !hasActiveFollowUp) {
          const field = fields.find(f => f.id === os.fieldId);
          const newAlert = {
            id: os.id,
            fieldId: os.fieldId,
            fieldName: field?.name || 'Talhão N/A',
            activityName: os.activity,
            daysRemaining: diffDays,
            dueDate: followUpDate,
            lastDone: completedDate
          };

          if (existingAlertIdx === -1) {
            acc.push(newAlert);
          } else {
            // Keep the one with the latest dueDate
            if (followUpDate > acc[existingAlertIdx].dueDate) {
              acc[existingAlertIdx] = newAlert;
            }
          }
        }
      }
      return acc;
    }, [] as any[])
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  const totalPlanningProgress = activePlannings.length > 0
    ? Math.round(activePlannings.reduce((sum, p) => sum + getPlanningProgress(p), 0) / activePlannings.length)
    : 0;

  // Area Statistics
  const totalArea = fields.reduce((sum, f) => sum + f.area, 0);
  
  // Identify planting activities
  const plantingActivityNames = activityDefinitions
    .filter(ad => ad.category === 'planting' || ad.name.toLowerCase().includes('plantio'))
    .map(ad => ad.name);

  const fieldsWithPlanting = fields.map(field => {
    const fieldOS = serviceOrders.filter(os => os.fieldId === field.id && plantingActivityNames.includes(os.activity));
    const completedPlantingOS = fieldOS.filter(os => os.status === 'completed');
    
    // Last planting date logic
    const allDates: number[] = [];
    const plantingOSIds = fieldOS.map(os => os.id);
    
    allDailyLogs
      .filter(log => plantingOSIds.includes(log.osId))
      .forEach(log => {
        const d = new Date(log.date.includes('T') ? log.date : log.date + 'T12:00:00');
        if (!isNaN(d.getTime())) allDates.push(d.getTime());
      });

    completedPlantingOS.forEach(os => {
      if (os.completedAt) {
        const d = new Date(os.completedAt.includes('T') ? os.completedAt : os.completedAt + 'T12:00:00');
        if (!isNaN(d.getTime())) allDates.push(d.getTime());
      }
    });

    const lastPlantingDate = field.plantingDate 
      ? new Date(field.plantingDate.includes('T') ? field.plantingDate : field.plantingDate + 'T12:00:00')
      : (allDates.length > 0 ? new Date(Math.max(...allDates)) : null);
    
    const ageYears = lastPlantingDate 
      ? Math.floor(Math.abs(new Date().getTime() - lastPlantingDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25))
      : null;

    return {
      ...field,
      isPlanted: lastPlantingDate !== null,
      ageYears
    };
  });

  const plantedArea = fieldsWithPlanting.filter(f => f.isPlanted).reduce((sum, f) => sum + f.area, 0);
  
  // Group by age
  const ageGroups = fieldsWithPlanting
    .filter(f => f.isPlanted && f.ageYears !== null)
    .reduce((acc, f) => {
      const age = f.ageYears!;
      acc[age] = (acc[age] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

  const sortedAges = Object.keys(ageGroups).map(Number).sort((a, b) => a - b);

  // Dynamic Greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bom dia';
    if (hour >= 12 && hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Welcome Section */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-8 flex flex-col justify-end py-4">
          <p className="font-label text-on-surface-variant font-medium tracking-wide uppercase text-xs mb-2">Visão Geral Diária</p>
          <div className="flex items-center gap-3 group">
            <h2 className="font-headline font-extrabold text-4xl md:text-5xl text-on-surface tracking-tight leading-tight">
              {getGreeting()}, 
              {isEditingFarmName ? (
                <div className="inline-flex items-center gap-2 ml-2">
                  <input
                    type="text"
                    value={tempFarmName}
                    onChange={(e) => setTempFarmName(e.target.value)}
                    onBlur={handleFarmNameSubmit}
                    onKeyDown={(e) => e.key === 'Enter' && handleFarmNameSubmit()}
                    autoFocus
                    className="bg-surface-container-highest border-none rounded-xl px-4 py-1 text-4xl md:text-5xl font-extrabold text-primary focus:ring-2 focus:ring-primary w-full max-w-md"
                  />
                </div>
              ) : (
                <button 
                  onClick={() => setIsEditingFarmName(true)} 
                  className="text-primary hover:underline transition-all text-left ml-2 decoration-primary/30 underline-offset-8"
                >
                  {farmName}
                </button>
              )}
            </h2>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <div className="bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2">
              <TrendingUp size={16} />
              {activities.length} Atividades Ativas
            </div>
            {criticalIngredients.length > 0 && (
              <div className="bg-error/10 text-error px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2">
                <AlertCircle size={16} />
                {criticalIngredients.length} Alertas de Estoque Baixo
              </div>
            )}
            {maintenanceMachines.length > 0 && (
              <div className="bg-tertiary/10 text-tertiary px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2">
                <Wrench size={16} />
                {maintenanceMachines.length} Máquinas em Manutenção
              </div>
            )}
            {recurrenceAlerts.length > 0 && (
              <div className="bg-secondary/10 text-secondary px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2">
                <TrendingUp size={16} />
                {recurrenceAlerts.length} Retornos (Recorrência)
              </div>
            )}
          </div>
        </div>

        {/* Area Card */}
        <div className="md:col-span-4 glass p-6 rounded-[2.5rem] flex flex-col justify-center relative overflow-hidden shadow-sm border border-white/20 min-h-[220px]">
          <div className="z-10 w-full space-y-6">
            {/* Header: Total Area */}
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-1">Área Total</p>
                <h3 className="text-5xl font-headline font-black text-primary">{formatNumber(totalArea)} <span className="text-sm font-bold text-on-surface-variant">ha</span></h3>
              </div>
              <div className="pt-4 border-t border-white/10">
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-1">Área Plantada</p>
                <p className="text-3xl font-headline font-black text-secondary">{formatNumber(plantedArea)} <span className="text-xs font-bold">ha</span></p>
              </div>
            </div>
          </div>
          <TractorIcon className="absolute -bottom-4 -right-4 opacity-5 pointer-events-none" size={120} />
        </div>
      </section>

      {/* Quick Actions */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button 
          onClick={onNewOS}
          className="flex flex-col items-center justify-center p-6 bg-primary text-on-primary rounded-[2rem] shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all active:scale-95 group"
        >
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-3 group-hover:bg-white/30 transition-colors">
            <Plus size={24} />
          </div>
          <span className="font-bold text-sm">Nova OS</span>
        </button>
        <button 
          onClick={() => onTabChange('planning')}
          className="flex flex-col items-center justify-center p-6 bg-surface-container-low text-on-surface rounded-[2rem] border border-outline-variant/30 hover:bg-surface-container-high transition-all active:scale-95 group"
        >
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
            <TrendingUp size={24} />
          </div>
          <span className="font-bold text-sm">Planejar</span>
        </button>
        <button 
          onClick={() => onTabChange('resources')}
          className="flex flex-col items-center justify-center p-6 bg-surface-container-low text-on-surface rounded-[2rem] border border-outline-variant/30 hover:bg-surface-container-high transition-all active:scale-95 group"
        >
          <div className="w-12 h-12 bg-secondary/10 text-secondary rounded-2xl flex items-center justify-center mb-3 group-hover:bg-secondary/20 transition-colors">
            <Package size={24} />
          </div>
          <span className="font-bold text-sm">Estoque</span>
        </button>
        <button 
          onClick={onViewAll}
          className="flex flex-col items-center justify-center p-6 bg-surface-container-low text-on-surface rounded-[2rem] border border-outline-variant/30 hover:bg-surface-container-high transition-all active:scale-95 group"
        >
          <div className="w-12 h-12 bg-tertiary/10 text-tertiary rounded-2xl flex items-center justify-center mb-3 group-hover:bg-tertiary/20 transition-colors">
            <LayoutGrid size={24} />
          </div>
          <span className="font-bold text-sm">Atividades</span>
        </button>
      </section>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Activities */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex justify-between items-center px-2">
            <h3 className="font-headline font-bold text-xl flex items-center gap-2">
              <span className="w-2 h-6 bg-primary rounded-full"></span>
              Atividades em Andamento
            </h3>
            <button 
              onClick={onViewAll}
              className="text-primary font-bold text-sm hover:underline flex items-center gap-1"
            >
              Ver todas <ChevronRight size={16} />
            </button>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {activities.length > 0 ? (
              activities.slice(0, 4).map((activity) => (
                <div key={activity.id} className="bg-surface-container-lowest rounded-3xl p-5 shadow-sm border border-outline-variant/5 flex items-center gap-4 hover:shadow-md transition-all group">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${activity.progress > 80 ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary'}`}>
                    {activity.type === 'spray' ? <Droplets size={24} /> : <LayoutGrid size={24} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-headline font-bold text-on-surface truncate">{activity.title}</h4>
                    <p className="text-xs text-on-surface-variant truncate">{activity.location} • {activity.machine}</p>
                    <div className="mt-2 h-1.5 bg-surface-container rounded-full overflow-hidden w-full max-w-xs">
                      <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${activity.progress}%` }}></div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${activity.status === 'Finishing' ? 'bg-secondary text-on-secondary' : 'bg-primary-container text-on-primary-container'}`}>
                      {activity.status || `${Math.round(activity.progress)}%`}
                    </span>
                    <p className="text-[10px] font-bold text-on-surface-variant mt-2 uppercase tracking-tighter">
                      {activity.estimatedTime || 'Em andamento'}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-surface-container-lowest rounded-3xl p-12 text-center border border-dashed border-outline-variant/30">
                <p className="text-on-surface-variant font-medium">Nenhuma atividade em andamento no momento.</p>
                <button 
                  onClick={onNewOS}
                  className="mt-4 text-primary font-bold hover:underline"
                >
                  Iniciar nova Ordem de Serviço
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Insights & Alerts */}
        <div className="lg:col-span-4 space-y-6">
          <h3 className="font-headline font-bold text-xl px-2 flex items-center gap-2">
            <span className="w-2 h-6 bg-secondary rounded-full"></span>
            Insights e Alertas
          </h3>

          {/* Critical Stock Widget */}
          <div className="bg-surface-container-lowest rounded-[2rem] p-6 border border-outline-variant/10 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-error/10 text-error rounded-xl flex items-center justify-center">
                  <Package size={20} />
                </div>
                <h4 className="font-bold text-on-surface">Estoque Crítico</h4>
              </div>
              <button onClick={() => onTabChange('resources')} className="text-primary p-2 hover:bg-primary/5 rounded-full transition-colors">
                <ChevronRight size={20} />
              </button>
            </div>
            <div className="space-y-3">
              {criticalIngredients.length > 0 ? (
                criticalIngredients.slice(0, 3).map(group => (
                  <div key={group.name} className="flex justify-between items-center p-3 bg-error/5 rounded-xl border border-error/10">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-on-surface truncate">{group.name}</p>
                      <p className="text-[10px] text-error font-bold uppercase">Abaixo do Mínimo</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-error">{formatNumber(group.totalStock)} {group.unit}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-on-surface-variant italic py-2">Todos os ingredientes ativos possuem estoque regular.</p>
              )}
            </div>
          </div>

          {/* Maintenance Widget */}
          <div className="bg-surface-container-lowest rounded-[2rem] p-6 border border-outline-variant/10 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-tertiary/10 text-tertiary rounded-xl flex items-center justify-center">
                  <Wrench size={20} />
                </div>
                <h4 className="font-bold text-on-surface">Manutenção</h4>
              </div>
              <button onClick={() => onTabChange('resources')} className="text-primary p-2 hover:bg-primary/5 rounded-full transition-colors">
                <ChevronRight size={20} />
              </button>
            </div>
            <div className="space-y-3">
              {maintenanceMachines.length > 0 ? (
                maintenanceMachines.slice(0, 3).map(machine => (
                  <div key={machine.id} className="flex justify-between items-center p-3 bg-tertiary/5 rounded-xl border border-tertiary/10">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-on-surface truncate">{machine.name}</p>
                      <p className="text-[10px] text-tertiary font-bold uppercase">Revisão Necessária</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-tertiary">{formatNumber(machine.hours)}h</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-on-surface-variant italic py-2">Nenhuma máquina requer revisão imediata.</p>
              )}
            </div>
          </div>

          {/* Recurrence Alerts Widget */}
          <div className="bg-surface-container-lowest rounded-[2rem] p-6 border border-outline-variant/10 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-secondary/10 text-secondary rounded-xl flex items-center justify-center">
                  <Droplets size={20} />
                </div>
                <h4 className="font-bold text-on-surface">Próximos Retornos</h4>
              </div>
            </div>
            <div className="space-y-3">
              {recurrenceAlerts.length > 0 ? (
                recurrenceAlerts.slice(0, 4).map(alert => (
                  <div key={`${alert.fieldId}-${alert.activityName}`} className={`flex justify-between items-center p-3 rounded-xl border ${alert.daysRemaining <= 0 ? 'bg-error/5 border-error/10' : 'bg-secondary/5 border-secondary/10'}`}>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-on-surface truncate">{alert.fieldName}</p>
                      <p className="text-[10px] text-on-surface-variant font-bold uppercase">{alert.activityName}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-black ${alert.daysRemaining <= 0 ? 'text-error' : 'text-secondary'}`}>
                        {alert.daysRemaining < 0 ? `Atrasado ${Math.abs(alert.daysRemaining)}d` : 
                         alert.daysRemaining === 0 ? 'Hoje' :
                         `Em ${alert.daysRemaining}d`}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-on-surface-variant italic py-2">Nenhum retorno agendado para os próximos dias.</p>
              )}
            </div>
          </div>

          {/* Planning Progress Widget */}
          <div className="bg-primary text-on-primary rounded-[2rem] p-6 shadow-lg shadow-primary/20 relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp size={20} />
                <h4 className="font-bold">Planejamento Ativo</h4>
              </div>
              {activePlannings.length > 0 ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1 opacity-80">
                      <span>Progresso Geral</span>
                      <span>{activePlannings.length} Planos</span>
                    </div>
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-white transition-all duration-1000" style={{ width: `${totalPlanningProgress}%` }}></div>
                    </div>
                    <p className="text-[10px] font-bold mt-1 opacity-70 text-right">{totalPlanningProgress}% Concluído</p>
                  </div>
                  <button 
                    onClick={() => onTabChange('planning')}
                    className="w-full py-3 bg-white text-primary rounded-xl font-bold text-sm active:scale-95 transition-all"
                  >
                    Ver Detalhes
                  </button>
                </div>
              ) : (
                <p className="text-sm opacity-80 italic">Nenhum planejamento ativo no momento.</p>
              )}
            </div>
            <AlertTriangle className="absolute -bottom-6 -right-6 opacity-10 rotate-12" size={120} />
          </div>
        </div>
      </div>
    </div>
  );
};

