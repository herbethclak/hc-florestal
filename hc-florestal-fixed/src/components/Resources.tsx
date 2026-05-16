import React, { useState, useEffect, useMemo } from 'react';
import { UserPlus, FileUp, Map as MapIcon, FlaskConical, Tractor as TractorIcon, AlertCircle, Trash2, Edit2, X, Plus, Package, ClipboardList, Download, ArrowUpRight, ArrowDownLeft, History, User, MapPin, ReceiptText, BarChart3, ClipboardCheck, Calendar, Settings2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Operator, Field, InputItem, Machine, Implement, ActivityDefinition, ActivityCategory, StockMovement, ServiceOrder, DailyLog, ProductionBonus, Planning } from '../types';
import html2pdf from 'html2pdf.js';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

import Papa from 'papaparse';
import { parseNumber } from '../constants';

interface ResourcesProps {
  operators: Operator[];
  fields: Field[];
  inputs: InputItem[];
  machines: Machine[];
  implementsList: Implement[];
  activityDefinitions: ActivityDefinition[];
  activityCategories: ActivityCategory[];
  stockMovements: StockMovement[];
  serviceOrders: ServiceOrder[];
  dailyLogs: DailyLog[];
  plannings: Planning[];
  onAdd: (type: string, item: any) => void;
  onDelete: (type: string, id: string) => void;
  onEdit: (type: string, item: any) => void;
  onStockMovement: (movement: Omit<StockMovement, 'id' | 'date'>) => void;
  onDeleteStockMovement: (id: string) => void;
  onImportCSV: (type: string, items: any[]) => void;
  role?: 'admin' | 'manager' | 'operator';
}

type ResourceType = 'operators' | 'fields' | 'inputs' | 'fleet' | 'implements' | 'activityDefinitions' | 'performance';

export const Resources: React.FC<ResourcesProps> = ({ 
  operators, 
  fields, 
  inputs, 
  machines,
  implementsList,
  activityDefinitions,
  activityCategories,
  stockMovements,
  serviceOrders,
  dailyLogs,
  plannings,
  onAdd,
  onDelete,
  onEdit,
  onStockMovement,
  onDeleteStockMovement,
  onImportCSV,
  role
}) => {
  const [activeTab, setActiveTab] = useState<ResourceType>('operators');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [selectedInputForMovement, setSelectedInputForMovement] = useState<InputItem | null>(null);
  const [selectedInputForHistory, setSelectedInputForHistory] = useState<InputItem | null>(null);
  const [selectedFieldIdForSummary, setSelectedFieldIdForSummary] = useState<string | null>(null);
  const selectedFieldForSummary = fields.find(f => f.id === selectedFieldIdForSummary) || null;
  const [selectedOSForDetail, setSelectedOSForDetail] = useState<ServiceOrder | null>(null);
  const [isOSDetailModalOpen, setIsOSDetailModalOpen] = useState(false);
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [selectedItemIdForMaintenance, setSelectedItemIdForMaintenance] = useState<string | null>(null);
  const [editingMaintenanceRecord, setEditingMaintenanceRecord] = useState<any>(null);
  const [maintenanceToDelete, setMaintenanceToDelete] = useState<{ recordId: string, description: string } | null>(null);

  const [isProductionModalOpen, setIsProductionModalOpen] = useState(false);
  const [isConsolidatedReportModalOpen, setIsConsolidatedReportModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isSimpleActivity, setIsSimpleActivity] = useState(false);

  useEffect(() => {
    if (editingItem && activeTab === 'activityDefinitions') {
      setIsSimpleActivity(!!editingItem.isSimpleActivity);
    } else {
      setIsSimpleActivity(false);
    }
  }, [editingItem, activeTab, isModalOpen]);
  const [selectedOperatorForProduction, setSelectedOperatorForProduction] = useState<Operator | null>(null);
  const [editingProductionRecord, setEditingProductionRecord] = useState<any>(null);
  const [productionToDelete, setProductionToDelete] = useState<ProductionBonus | null>(null);
  const [productionFilterStart, setProductionFilterStart] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'));
  const [productionFilterEnd, setProductionFilterEnd] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showDeletedProduction, setShowDeletedProduction] = useState(false);

  const selectedItemForMaintenance = activeTab === 'fleet' 
    ? machines.find(m => m.id === selectedItemIdForMaintenance)
    : implementsList.find(i => i.id === selectedItemIdForMaintenance);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ type: string, id: string, name: string, extra?: any } | null>(null);
  const [fieldSearch, setFieldSearch] = useState('');
  const [movementType, setMovementType] = useState<'entry' | 'exit'>('entry');

  const performanceData = useMemo(() => {
    const summary: Record<string, {
      activityName: string;
      totalArea: number;
      totalHours: number;
      averagePerformance: number;
      logs: Array<{
        date: string;
        operator: string;
        field: string;
        area: number;
        hours: number;
        performance: number;
      }>;
      goal: number;
    }> = {};

    dailyLogs.forEach(log => {
      const os = serviceOrders.find(o => o.id === log.osId);
      if (!os) return;

      const activity = os.activity;
      const hours = (log.horimetroFinal || 0) - (log.horimetroInicial || 0);
      const area = log.performedArea || 0;

      if (hours > 0) {
        if (!summary[activity]) {
          summary[activity] = {
            activityName: activity,
            totalArea: 0,
            totalHours: 0,
            averagePerformance: 0,
            logs: [],
            goal: 0 // We'll try to find this from plannings
          };
          
          // Try to find goal from planning
          const planning = plannings.find(p => p.id === os.planningId);
          if (planning) {
            summary[activity].goal = planning.dailyGoal; // Note: planning goal is ha/day, maybe we should have ha/h goal too
          }
        }

        const performance = area / hours;
        const operator = operators.find(o => o.id === log.operatorId)?.name || 'N/A';
        const field = fields.find(f => f.id === os.fieldId)?.name || os.fieldName || 'N/A';

        summary[activity].totalArea += area;
        summary[activity].totalHours += hours;
        summary[activity].logs.push({
          date: log.date,
          operator,
          field,
          area,
          hours,
          performance
        });
      }
    });

    Object.values(summary).forEach(item => {
      if (item.totalHours > 0) {
        item.averagePerformance = item.totalArea / item.totalHours;
      }
    });

    return Object.values(summary).sort((a, b) => b.averagePerformance - a.averagePerformance);
  }, [dailyLogs, serviceOrders, operators, fields, plannings]);

  const canDelete = role === 'admin' || role === 'manager';
  
  const formatNumber = (num: number, decimals: number = 1) => {
    return num.toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    });
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (type: string, id: string, name: string) => {
    if (!canDelete) return;
    setShowDeleteConfirm({ type, id, name });
  };

  const confirmDelete = () => {
    if (!showDeleteConfirm || !canDelete) return;
    
    if (showDeleteConfirm.type === 'stockMovements') {
      onDeleteStockMovement(showDeleteConfirm.id);
    } else {
      onDelete(showDeleteConfirm.type, showDeleteConfirm.id);
    }
    
    setShowDeleteConfirm(null);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as any[];
        if (data.length === 0) {
          toast.error('O arquivo CSV está vazio ou não possui um cabeçalho válido.');
          return;
        }

        // Basic validation and type conversion
        const processedData = data.map(item => {
          const newItem = { ...item };
          if (newItem.area) newItem.area = parseNumber(newItem.area);
          if (newItem.stock) newItem.stock = parseNumber(newItem.stock);
          if (newItem.minStock) newItem.minStock = parseNumber(newItem.minStock);
          if (newItem.hours) newItem.hours = parseNumber(newItem.hours);
          if (newItem.width) newItem.width = parseNumber(newItem.width);
          if (newItem.nozzles) newItem.nozzles = parseNumber(newItem.nozzles);
          
          // Add default images/avatars if missing
          if (!newItem.image && (activeTab === 'fields' || activeTab === 'fleet' || activeTab === 'implements')) {
            newItem.image = `https://picsum.photos/seed/${Math.random()}/400/200`;
          }
          if (!newItem.avatar && activeTab === 'operators') {
            newItem.avatar = `https://picsum.photos/seed/${Math.random()}/200/200`;
          }
          
          return newItem;
        });

        onImportCSV(activeTab, processedData);
        toast.success(`${processedData.length} registros importados com sucesso para ${activeTab}!`);
        e.target.value = ''; // Reset input
      },
      error: (error) => {
        toast.error(`Erro ao processar CSV: ${error.message}`);
      }
    });
  };

  const handleMaintenanceSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedItemForMaintenance) return;

    const formData = new FormData(e.currentTarget);
    const description = formData.get('description') as string;
    const hours = parseNumber(formData.get('hours') as string);
    const cost = parseNumber(formData.get('cost') as string);
    const type = formData.get('type') as 'preventive' | 'corrective';
    const date = editingMaintenanceRecord ? editingMaintenanceRecord.date : new Date().toISOString();

    const newRecord = {
      id: editingMaintenanceRecord ? editingMaintenanceRecord.id : Date.now().toString(),
      date,
      hours,
      description,
      type,
      cost
    };

    let updatedHistory = (selectedItemForMaintenance as any).maintenanceHistory || [];
    if (editingMaintenanceRecord) {
      updatedHistory = updatedHistory.map((r: any) => r.id === editingMaintenanceRecord.id ? newRecord : r);
    } else {
      updatedHistory = [...updatedHistory, newRecord];
    }

    // Only update lastRevisionHours if it's preventive maintenance
    // and it's the most recent preventive maintenance (or just always if it's the one being added/edited and it's preventive)
    // Business rule: when adding corrective maintenance, the revision hour meter should not change, only for preventive maintenance.
    
    const updateData: any = {
      ...selectedItemForMaintenance,
      maintenanceHistory: updatedHistory
    };

    if (type === 'preventive') {
      updateData.lastRevisionHours = hours;
    }

    onEdit(activeTab, updateData);

    setIsMaintenanceModalOpen(false);
    setEditingMaintenanceRecord(null);
  };

  const confirmDeleteMaintenance = () => {
    if (!selectedItemForMaintenance || !maintenanceToDelete) return;

    const updatedHistory = ((selectedItemForMaintenance as any).maintenanceHistory || [])
      .filter((r: any) => r.id !== maintenanceToDelete.recordId);

    onEdit(activeTab, {
      ...selectedItemForMaintenance,
      maintenanceHistory: updatedHistory
    });
    setMaintenanceToDelete(null);
  };

  const handleProductionSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedOperatorForProduction) return;

    const formData = new FormData(e.currentTarget);
    const rawData = Object.fromEntries(formData.entries());
    
    const bonusValue = parseNumber(rawData.bonusValue as string);
    const fieldArea = parseNumber(rawData.fieldArea as string);
    const performedArea = parseNumber(rawData.performedArea as string);
    const paidArea = parseNumber(rawData.paidArea as string);
    
    const totalBonus = Number((paidArea * bonusValue).toFixed(2));

    const newRecord: ProductionBonus = {
      id: editingProductionRecord?.id || Date.now().toString(),
      osId: rawData.osId as string || 'Manual',
      date: rawData.date as string,
      activityName: rawData.activityName as string,
      fieldName: rawData.fieldName as string,
      fieldArea,
      performedArea,
      paidArea,
      bonusValue,
      bonusUnit: rawData.bonusUnit as 'ha' | 'hour',
      totalBonus
    };

    let updatedHistory = [...(selectedOperatorForProduction.productionHistory || [])];
    if (editingProductionRecord) {
      updatedHistory = updatedHistory.map(r => r.id === editingProductionRecord.id ? newRecord : r);
    } else {
      updatedHistory.push(newRecord);
    }

    onEdit('operators', {
      ...selectedOperatorForProduction,
      productionHistory: updatedHistory
    });

    setEditingProductionRecord(null);
  };

  const confirmDeleteProduction = () => {
    if (!selectedOperatorForProduction || !productionToDelete) return;

    let updatedHistory = (selectedOperatorForProduction.productionHistory || [])
      .filter(r => r.id !== productionToDelete.id);

    let updatedDeletedIds = [...(selectedOperatorForProduction.deletedProductionIds || [])];
    if (productionToDelete.id.startsWith('os-')) {
      if (!updatedDeletedIds.includes(productionToDelete.id)) {
        updatedDeletedIds.push(productionToDelete.id);
      }
    }

    onEdit('operators', {
      ...selectedOperatorForProduction,
      productionHistory: updatedHistory,
      deletedProductionIds: updatedDeletedIds
    });
    setProductionToDelete(null);
    toast.success('Lançamento removido com sucesso.');
  };

  const handleRestoreProduction = (operator: Operator, productionId: string) => {
    const updatedDeletedIds = (operator.deletedProductionIds || []).filter(id => id !== productionId);
    onEdit('operators', {
      ...operator,
      deletedProductionIds: updatedDeletedIds
    });
    toast.success('Lançamento restaurado com sucesso.');
  };

  const getConsolidatedProduction = (operator: Operator, includeDeleted = false) => {
    const history = [...(operator.productionHistory || [])].map(p => ({ ...p, isManual: true }));
    
    // Find all completed OS for this operator
    const completedOS = serviceOrders.filter(os => os.operatorId === operator.id && os.status === 'completed');
    
    completedOS.forEach(os => {
      // Check if this OS already has a record in history or was explicitly deleted
      const hasRecord = history.some(p => p.osId === os.id);
      const isDeleted = (operator.deletedProductionIds || []).includes(`os-${os.id}`);
      
      if (!hasRecord && (includeDeleted || !isDeleted)) {
        const activityDef = activityDefinitions.find(ad => ad.name === os.activity);
        const isSimple = !!activityDef?.isSimpleActivity;
        const field = fields.find(f => f.id === os.fieldId);
        
        const bonusValue = activityDef?.bonusValue || 0;
        const bonusUnit = activityDef?.bonusUnit || 'ha';
        const fieldName = (os as any).fieldName || field?.name || 'N/A';
        const fieldArea = (os as any).fieldArea || field?.area || 0;

        const osLogs = dailyLogs.filter(log => log.osId === os.id);
        let performedArea = 0;
        let paidArea = 0;
        
        if (bonusUnit === 'ha') {
          if (!isSimple) {
            performedArea = (os.totalApplied || 0) / (os.targetRate || 1);
          } else {
            // For simple activities, use hours as performance measure but pay by hectare
            performedArea = osLogs.reduce((sum, log) => sum + (log.horimetroFinal || 0) - (log.horimetroInicial || 0), 0);
          }
          
          // Calculate proportion if OS was shared (similar logic to Activities.tsx)
          const allOsLogs = dailyLogs.filter(l => l.osId === os.id);
          const opLogs = allOsLogs.filter(l => l.operatorId === operator.id);
          const opPerformed = opLogs.reduce((sum, log) => {
            return sum + (log.performedArea || (isSimple ? 0 : (log.amount / (os.targetRate || 1))));
          }, 0);
          const totalPerformed = allOsLogs.reduce((sum, log) => {
            return sum + (log.performedArea || (isSimple ? 0 : (log.amount / (os.targetRate || 1))));
          }, 0);

          if (totalPerformed > 0 && opPerformed > 0) {
            paidArea = fieldArea * (opPerformed / totalPerformed);
            performedArea = opPerformed;
          } else {
            paidArea = fieldArea;
          }
        } else {
          // bonus per hour
          performedArea = osLogs.reduce((sum, log) => sum + (log.horimetroFinal || 0) - (log.horimetroInicial || 0), 0);
          paidArea = performedArea;
        }
        
        const totalBonus = Number((paidArea * bonusValue).toFixed(2));
        
        history.push({
          id: `os-${os.id}`,
          osId: os.id,
          date: os.completedAt || os.createdAt,
          activityName: os.activity,
          fieldName: fieldName,
          fieldArea: fieldArea,
          performedArea,
          paidArea,
          bonusValue: bonusValue,
          bonusUnit: bonusUnit,
          totalBonus,
          isDeleted: isDeleted,
          isManual: false
        } as any);
      }
    });
    
    return history;
  };

  const handleDownloadProductionPDF = (operator: Operator) => {
    const element = document.createElement('div');
    element.style.padding = '40px';
    element.style.fontFamily = 'Arial, sans-serif';
    element.style.color = '#333';

    const history = getConsolidatedProduction(operator)
      .filter(p => {
        const pDate = new Date(p.date.includes('T') ? p.date : p.date + 'T12:00:00');
        const start = productionFilterStart ? new Date(productionFilterStart + 'T00:00:00') : null;
        const end = productionFilterEnd ? new Date(productionFilterEnd + 'T23:59:59') : null;
        if (start && pDate < start) return false;
        if (end && pDate > end) return false;
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalBonus = history.reduce((sum, p) => sum + p.totalBonus, 0);

    element.innerHTML = `
      <div style="border-bottom: 3px solid #1a4731; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h1 style="font-size: 28px; font-weight: 900; color: #1a4731; margin: 0;">GESTOR FLORESTAL</h1>
          <p style="font-size: 10px; font-weight: bold; color: #666; text-transform: uppercase; letter-spacing: 2px;">Relatório de Produção: ${operator.name}</p>
        </div>
        <div style="text-align: right;">
          <p style="font-size: 12px; font-weight: bold; color: #333;">Data: ${new Date().toLocaleDateString('pt-BR')}</p>
          <p style="font-size: 10px; color: #666;">Período: ${productionFilterStart || 'Início'} até ${productionFilterEnd || 'Fim'}</p>
        </div>
      </div>

      <div style="margin-bottom: 30px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <thead>
            <tr style="background: #f8f9fa; border-bottom: 2px solid #dee2e6;">
              <th style="padding: 12px; text-align: left; font-weight: 900;">Data</th>
              <th style="padding: 12px; text-align: left; font-weight: 900;">Atividade / Talhão</th>
              <th style="padding: 12px; text-align: right; font-weight: 900;">Área do Talhão</th>
              <th style="padding: 12px; text-align: right; font-weight: 900;">Pago (Área Talhão)</th>
              <th style="padding: 12px; text-align: right; font-weight: 900;">Bônus (R$)</th>
              <th style="padding: 12px; text-align: right; font-weight: 900;">Total (R$)</th>
            </tr>
          </thead>
          <tbody>
            ${history.map(p => {
              const dateObj = p.date.includes('T') ? new Date(p.date) : new Date(p.date + 'T12:00:00');
              const dateStr = isNaN(dateObj.getTime()) ? p.date : dateObj.toLocaleDateString('pt-BR');
              return `
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 12px;">${dateStr}</td>
                  <td style="padding: 12px;">
                    <div style="font-weight: bold;">${p.activityName}${p.osId && p.osId !== 'Manual' ? ' <span style="font-size: 8px; color: #006644; background: #e6f2ee; padding: 2px 4px; border-radius: 4px;">OS</span>' : ''}</div>
                    <div style="font-size: 9px; color: #666;">Talhão: ${p.fieldName}</div>
                  </td>
                  <td style="padding: 12px; text-align: right;">${formatNumber(p.fieldArea)} ha</td>
                  <td style="padding: 12px; text-align: right;">${formatNumber(p.paidArea)} ${p.bonusUnit === 'ha' ? 'ha' : 'h'}</td>
                  <td style="padding: 12px; text-align: right;">R$ ${formatNumber(p.bonusValue)}</td>
                  <td style="padding: 12px; text-align: right; font-weight: bold;">R$ ${formatNumber(p.totalBonus)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
          <tfoot>
            <tr style="background: #f8f9fa; border-top: 2px solid #dee2e6;">
              <td colspan="5" style="padding: 12px; text-align: right; font-weight: 900; font-size: 14px;">TOTAL A PAGAR:</td>
              <td style="padding: 12px; text-align: right; font-weight: 900; font-size: 14px; color: #1a4731;">R$ ${formatNumber(totalBonus)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;

    const opt = {
      margin: 10,
      filename: `Producao_${operator.name}_${new Date().getTime()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    // @ts-ignore
    html2pdf().set(opt).from(element).save();
  };

  const handleDownloadConsolidatedProductionPDF = () => {
    const element = document.createElement('div');
    element.style.padding = '40px';
    element.style.fontFamily = 'Arial, sans-serif';
    element.style.color = '#333';

    const start = productionFilterStart ? new Date(productionFilterStart + 'T00:00:00') : null;
    const end = productionFilterEnd ? new Date(productionFilterEnd + 'T23:59:59') : null;

    const consolidatedData = operators.map(op => {
      const history = getConsolidatedProduction(op).filter(p => {
        const pDate = new Date(p.date.includes('T') ? p.date : p.date + 'T12:00:00');
        if (start && pDate < start) return false;
        if (end && pDate > end) return false;
        return true;
      });

      const activitiesSummary: { [key: string]: { area: number, total: number } } = {};
      let totalValue = 0;

      history.forEach(p => {
        const key = `${p.activityName} (${p.bonusUnit})`;
        if (!activitiesSummary[key]) {
          activitiesSummary[key] = { area: 0, total: 0 };
        }
        activitiesSummary[key].area += p.paidArea;
        activitiesSummary[key].total += p.totalBonus;
        totalValue += p.totalBonus;
      });

      return {
        name: op.name,
        summary: activitiesSummary,
        total: totalValue
      };
    }).filter(d => d.total > 0);

    element.innerHTML = `
      <div style="border-bottom: 3px solid #1a4731; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h1 style="font-size: 28px; font-weight: 900; color: #1a4731; margin: 0;">GESTOR FLORESTAL</h1>
          <p style="font-size: 10px; font-weight: bold; color: #666; text-transform: uppercase; letter-spacing: 2px;">Relatório de Produção Consolidado</p>
        </div>
        <div style="text-align: right;">
          <p style="font-size: 12px; font-weight: bold; color: #333;">Data: ${new Date().toLocaleDateString('pt-BR')}</p>
          <p style="font-size: 10px; color: #666;">Período: ${productionFilterStart || 'Início'} até ${productionFilterEnd || 'Fim'}</p>
        </div>
      </div>

      <div style="margin-bottom: 30px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <thead>
            <tr style="background: #f8f9fa; border-bottom: 2px solid #dee2e6;">
              <th style="padding: 12px; text-align: left; font-weight: 900;">Operador</th>
              <th style="padding: 12px; text-align: left; font-weight: 900;">Atividades (Área/Horas)</th>
              <th style="padding: 12px; text-align: right; font-weight: 900;">Total a Pagar (R$)</th>
            </tr>
          </thead>
          <tbody>
            ${consolidatedData.map(d => `
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 12px; font-weight: bold;">${d.name}</td>
                <td style="padding: 12px;">
                  ${Object.entries(d.summary).map(([act, data]) => `
                    <div style="margin-bottom: 4px;">
                      <span style="font-weight: bold;">${act}:</span> ${formatNumber(data.area)} ${act.includes('(ha)') ? 'ha' : 'h'} - R$ ${formatNumber(data.total)}
                    </div>
                  `).join('')}
                </td>
                <td style="padding: 12px; text-align: right; font-weight: bold; font-size: 13px; color: #1a4731;">R$ ${formatNumber(d.total)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="background: #f8f9fa; border-top: 2px solid #dee2e6;">
              <td colspan="2" style="padding: 12px; text-align: right; font-weight: 900; font-size: 16px;">TOTAL GERAL:</td>
              <td style="padding: 12px; text-align: right; font-weight: 900; font-size: 16px; color: #1a4731;">R$ ${formatNumber(consolidatedData.reduce((sum, d) => sum + d.total, 0))}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;

    const opt = {
      margin: 10,
      filename: `Relatorio_Consolidado_Producao_${new Date().getTime()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    // @ts-ignore
    html2pdf().set(opt).from(element).save();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const rawData = Object.fromEntries(formData.entries());
    
    const data: any = { ...rawData };
    
    // Handle checkboxes
    if (activeTab === 'activityDefinitions') {
      data.isSimpleActivity = formData.get('isSimpleActivity') === 'on';
    }
    
    // Convert numeric fields
    const numericFields = [
      'area', 'stock', 'minStock', 'hours', 'lastRevisionHours', 
      'revisionInterval', 'width', 'nozzles', 'dailyGoal', 'tankCapacity',
      'testDistance', 'spacingWidth', 'spacingLength', 'amount',
      'horimetroInicial', 'horimetroFinal', 'targetRate', 'totalPlannedVolume',
      'bonusValue', 'followUpInterval'
    ];
    
    numericFields.forEach(field => {
      if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
        data[field] = parseNumber(data[field]);
      } else if (data[field] === '') {
        data[field] = 0;
      }
    });

    try {
      if (editingItem) {
        await onEdit(activeTab, { ...editingItem, ...data });
      } else {
        // Add default image if missing
        if (!data.image && (activeTab === 'fields' || activeTab === 'fleet' || activeTab === 'implements')) {
          data.image = `https://picsum.photos/seed/${Date.now()}/400/200`;
        }
        if (!data.avatar && activeTab === 'operators') {
          data.avatar = `https://picsum.photos/seed/${Date.now()}/200/200`;
        }
        await onAdd(activeTab, data);
      }
      setIsModalOpen(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Error saving resource:', error);
      // The error should have already been displayed by the handler in App.tsx
    }
  };

  const handleStockMovement = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInputForMovement) return;

    const formData = new FormData(e.currentTarget);
    const amount = parseNumber(formData.get('amount') as string);
    const invoiceNumber = formData.get('invoiceNumber') as string;
    const recipient = formData.get('recipient') as string;
    const location = formData.get('location') as string;
    const description = formData.get('description') as string;

    if (isNaN(amount) || amount <= 0) {
      toast.error('Quantidade inválida');
      return;
    }

    onStockMovement({
      inputId: selectedInputForMovement.id,
      type: movementType,
      amount,
      invoiceNumber,
      recipient,
      location,
      description
    });

    setIsMovementModalOpen(false);
    setSelectedInputForMovement(null);
  };

  const handleDownloadStockPDF = () => {
    // Group by active ingredient
    const grouped = inputs.reduce((acc, input) => {
      const key = input.activeIngredient || 'Outros';
      if (!acc[key]) acc[key] = { total: 0, unit: input.unit, items: [] };
      acc[key].total += input.stock;
      acc[key].items.push(input);
      return acc;
    }, {} as Record<string, { total: number, unit: string, items: InputItem[] }>);

    const element = document.createElement('div');
    element.style.padding = '40px';
    element.style.fontFamily = 'sans-serif';
    element.innerHTML = `
      <div style="border-bottom: 3px solid #1a4731; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h1 style="font-size: 28px; font-weight: 900; color: #1a4731; margin: 0;">GESTOR FLORESTAL</h1>
          <p style="font-size: 10px; font-weight: bold; color: #666; text-transform: uppercase; letter-spacing: 2px;">Resumo de Estoque Consolidado</p>
        </div>
        <div style="text-align: right;">
          <p style="font-size: 12px; font-weight: bold; color: #333;">Data: ${new Date().toLocaleDateString('pt-BR')}</p>
          <p style="font-size: 10px; color: #666;">Hora: ${new Date().toLocaleTimeString('pt-BR')}</p>
        </div>
      </div>

      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; font-weight: 800; margin-bottom: 15px; color: #333; border-left: 4px solid #1a4731; padding-left: 10px;">Consolidado por Ingrediente Ativo</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="background: #f8f9fa; border-bottom: 2px solid #dee2e6;">
              <th style="padding: 12px; text-align: left; font-weight: 900;">Ingrediente Ativo</th>
              <th style="padding: 12px; text-align: right; font-weight: 900;">Total Disponível</th>
              <th style="padding: 12px; text-align: left; font-weight: 900;">Detalhamento por Produto</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(grouped).map(([ingredient, data]: [string, any]) => `
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 12px; font-weight: bold; color: #1a4731;">${ingredient}</td>
                <td style="padding: 12px; text-align: right; font-weight: 900; font-size: 14px;">${formatNumber(data.total)} ${data.unit}</td>
                <td style="padding: 12px; color: #666; font-size: 11px;">
                  ${data.items.map((i: any) => `• ${i.name} (${i.brand}): <b>${formatNumber(i.stock)} ${i.unit}</b>`).join('<br>')}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div style="margin-top: 50px; border-top: 1px solid #eee; padding-top: 20px; font-size: 10px; color: #999; text-align: center;">
        Este documento é um resumo informativo do estoque atual no sistema GESTOR FLORESTAL.
      </div>
    `;

    const opt = {
      margin: 0,
      filename: `Resumo_Estoque_Gestao_Florestal_${new Date().getTime()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    // @ts-ignore
    html2pdf().set(opt).from(element).save();
  };

  const handleDownloadAllMovementsPDF = () => {
    const element = document.createElement('div');
    element.style.padding = '40px';
    element.style.fontFamily = 'sans-serif';
    
    const sortedMovements = [...stockMovements].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    element.innerHTML = `
      <div style="border-bottom: 3px solid #1a4731; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h1 style="font-size: 28px; font-weight: 900; color: #1a4731; margin: 0;">GESTOR FLORESTAL</h1>
          <p style="font-size: 10px; font-weight: bold; color: #666; text-transform: uppercase; letter-spacing: 2px;">Relatório Geral de Movimentação de Estoque</p>
        </div>
        <div style="text-align: right;">
          <p style="font-size: 12px; font-weight: bold; color: #333;">Data: ${new Date().toLocaleDateString('pt-BR')}</p>
          <p style="font-size: 10px; color: #666;">Hora: ${new Date().toLocaleTimeString('pt-BR')}</p>
        </div>
      </div>

      <div style="margin-bottom: 30px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
          <thead>
            <tr style="background: #f8f9fa; border-bottom: 2px solid #dee2e6;">
              <th style="padding: 10px; text-align: left; font-weight: 900;">Data/Hora</th>
              <th style="padding: 10px; text-align: left; font-weight: 900;">Insumo</th>
              <th style="padding: 10px; text-align: left; font-weight: 900;">Tipo</th>
              <th style="padding: 10px; text-align: right; font-weight: 900;">Qtd</th>
              <th style="padding: 10px; text-align: left; font-weight: 900;">Detalhes</th>
            </tr>
          </thead>
          <tbody>
            ${sortedMovements.map(m => {
              const input = inputs.find(i => i.id === m.inputId);
              const dateStr = new Date(m.date).toLocaleDateString('pt-BR');
              const timeStr = new Date(m.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
              const typeLabel = m.type === 'entry' ? 'Entrada' : m.type === 'exit' ? 'Saída' : 'Dedução OS';
              const typeColor = m.type === 'entry' ? '#1a4731' : '#b91c1c';
              
              let details = [];
              if (m.invoiceNumber) details.push(`NF: ${m.invoiceNumber}`);
              if (m.recipient) details.push(`Dest: ${m.recipient}`);
              if (m.location) details.push(`Loc: ${m.location}`);
              if (m.description) details.push(`Obs: ${m.description}`);

              return `
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 10px;">${dateStr}<br><span style="color: #999;">${timeStr}</span></td>
                  <td style="padding: 10px; font-weight: bold;">${input?.name || 'Insumo Removido'}</td>
                  <td style="padding: 10px; color: ${typeColor}; font-weight: bold;">${typeLabel}</td>
                  <td style="padding: 10px; text-align: right; font-weight: 900;">${m.type === 'entry' ? '+' : '-'}${formatNumber(m.amount)} ${input?.unit || ''}</td>
                  <td style="padding: 10px; color: #666; font-size: 9px;">${details.join(' | ')}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <div style="margin-top: 50px; border-top: 1px solid #eee; padding-top: 20px; font-size: 10px; color: #999; text-align: center;">
        Relatório gerado automaticamente pelo sistema GESTOR FLORESTAL.
      </div>
    `;

    const opt = {
      margin: 10,
      filename: `Relatorio_Movimentacoes_Gestao_Florestal_${new Date().getTime()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    // @ts-ignore
    html2pdf().set(opt).from(element).save();
  };

  const handleDownloadInputHistoryPDF = (input: InputItem) => {
    const element = document.createElement('div');
    element.style.padding = '40px';
    element.style.fontFamily = 'sans-serif';
    
    const movements = stockMovements
      .filter(m => m.inputId === input.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    element.innerHTML = `
      <div style="border-bottom: 3px solid #1a4731; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h1 style="font-size: 28px; font-weight: 900; color: #1a4731; margin: 0;">GESTOR FLORESTAL</h1>
          <p style="font-size: 10px; font-weight: bold; color: #666; text-transform: uppercase; letter-spacing: 2px;">Histórico de Movimentação: ${input.name}</p>
        </div>
        <div style="text-align: right;">
          <p style="font-size: 12px; font-weight: bold; color: #333;">Data: ${new Date().toLocaleDateString('pt-BR')}</p>
          <p style="font-size: 10px; color: #666;">Estoque Atual: ${formatNumber(input.stock)} ${input.unit}</p>
        </div>
      </div>

      <div style="margin-bottom: 30px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <thead>
            <tr style="background: #f8f9fa; border-bottom: 2px solid #dee2e6;">
              <th style="padding: 12px; text-align: left; font-weight: 900;">Data/Hora</th>
              <th style="padding: 12px; text-align: left; font-weight: 900;">Tipo</th>
              <th style="padding: 12px; text-align: right; font-weight: 900;">Quantidade</th>
              <th style="padding: 12px; text-align: left; font-weight: 900;">Detalhes</th>
            </tr>
          </thead>
          <tbody>
            ${movements.map(m => {
              const dateStr = new Date(m.date).toLocaleDateString('pt-BR');
              const timeStr = new Date(m.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
              const typeLabel = m.type === 'entry' ? 'Entrada' : m.type === 'exit' ? 'Saída' : 'Dedução OS';
              const typeColor = m.type === 'entry' ? '#1a4731' : '#b91c1c';
              
              let details = [];
              if (m.invoiceNumber) details.push(`NF: ${m.invoiceNumber}`);
              if (m.recipient) details.push(`Dest: ${m.recipient}`);
              if (m.location) details.push(`Loc: ${m.location}`);
              if (m.description) details.push(`Obs: ${m.description}`);

              return `
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 12px;">${dateStr} ${timeStr}</td>
                  <td style="padding: 12px; color: ${typeColor}; font-weight: bold;">${typeLabel}</td>
                  <td style="padding: 12px; text-align: right; font-weight: 900;">${m.type === 'entry' ? '+' : '-'}${formatNumber(m.amount)} ${input.unit}</td>
                  <td style="padding: 12px; color: #666;">${details.join(' | ')}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    const opt = {
      margin: 10,
      filename: `Historico_${input.name}_${new Date().getTime()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    // @ts-ignore
    html2pdf().set(opt).from(element).save();
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-headline font-extrabold text-on-surface tracking-tight">Gestão de Recursos</h2>
          <p className="text-on-surface-variant font-medium">Controle central de ativos florestais e insumos</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 px-4 py-2.5 bg-surface-container-highest text-on-surface rounded-xl font-semibold text-sm hover:bg-surface-variant transition-all active:scale-95 cursor-pointer">
            <FileUp size={18} /> Importar CSV
            <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
          </label>
          <button 
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-xl font-bold text-sm shadow-lg active:scale-95"
          >
            <Plus size={18} /> Novo Registro
          </button>
          {activeTab === 'operators' && (
            <button 
              onClick={() => setIsConsolidatedReportModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-tertiary-fixed text-on-tertiary-fixed rounded-xl font-bold text-sm shadow-lg active:scale-95"
            >
              <BarChart3 size={18} /> Relatório de Produção
            </button>
          )}
          {activeTab === 'activityDefinitions' && (
            <button 
              onClick={() => setIsCategoryModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-secondary-fixed text-on-secondary-fixed rounded-xl font-bold text-sm shadow-lg active:scale-95"
            >
              <Settings2 size={18} /> Categorias
            </button>
          )}
          {activeTab === 'inputs' && (
            <>
              <button 
                onClick={handleDownloadAllMovementsPDF}
                className="flex items-center gap-2 px-5 py-2.5 bg-tertiary-fixed text-on-tertiary-fixed rounded-xl font-bold text-sm shadow-lg active:scale-95"
              >
                <History size={18} /> PDF de Movimentações
              </button>
              <button 
                onClick={handleDownloadStockPDF}
                className="flex items-center gap-2 px-5 py-2.5 bg-secondary-fixed text-on-secondary-fixed rounded-xl font-bold text-sm shadow-lg active:scale-95"
              >
                <Download size={18} /> PDF de Estoque
              </button>
            </>
          )}
        </div>
      </section>

      <nav className="overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 p-1.5 bg-surface-container-low rounded-2xl w-max">
          <button 
            onClick={() => setActiveTab('operators')}
            className={`px-6 py-2.5 font-bold rounded-xl shadow-sm text-sm transition-all ${activeTab === 'operators' ? 'bg-surface-container-lowest text-primary' : 'text-on-surface-variant hover:bg-surface-container'}`}
          >
            Operadores
          </button>
          <button 
            onClick={() => setActiveTab('fields')}
            className={`px-6 py-2.5 font-bold rounded-xl shadow-sm text-sm transition-all ${activeTab === 'fields' ? 'bg-surface-container-lowest text-primary' : 'text-on-surface-variant hover:bg-surface-container'}`}
          >
            Talhões
          </button>
          <button 
            onClick={() => setActiveTab('inputs')}
            className={`px-6 py-2.5 font-bold rounded-xl shadow-sm text-sm transition-all ${activeTab === 'inputs' ? 'bg-surface-container-lowest text-primary' : 'text-on-surface-variant hover:bg-surface-container'}`}
          >
            Insumos
          </button>
          <button 
            onClick={() => setActiveTab('fleet')}
            className={`px-6 py-2.5 font-bold rounded-xl shadow-sm text-sm transition-all ${activeTab === 'fleet' ? 'bg-surface-container-lowest text-primary' : 'text-on-surface-variant hover:bg-surface-container'}`}
          >
            Frota
          </button>
          <button 
            onClick={() => setActiveTab('implements')}
            className={`px-6 py-2.5 font-bold rounded-xl shadow-sm text-sm transition-all ${activeTab === 'implements' ? 'bg-surface-container-lowest text-primary' : 'text-on-surface-variant hover:bg-surface-container'}`}
          >
            Implementos
          </button>
          <button 
            onClick={() => setActiveTab('activityDefinitions')}
            className={`px-6 py-2.5 font-bold rounded-xl shadow-sm text-sm transition-all ${activeTab === 'activityDefinitions' ? 'bg-surface-container-lowest text-primary' : 'text-on-surface-variant hover:bg-surface-container'}`}
          >
            Atividades
          </button>
          <button 
            onClick={() => setActiveTab('performance')}
            className={`px-6 py-2.5 font-bold rounded-xl shadow-sm text-sm transition-all ${activeTab === 'performance' ? 'bg-surface-container-lowest text-primary' : 'text-on-surface-variant hover:bg-surface-container'}`}
          >
            Rendimento
          </button>
        </div>
      </nav>

      {activeTab === 'fields' && (
        <div className="relative max-w-md">
          <input
            type="text"
            placeholder="Buscar talhão por nome ou ID..."
            value={fieldSearch}
            onChange={(e) => setFieldSearch(e.target.value)}
            className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-5 text-on-surface font-medium focus:ring-2 focus:ring-primary transition-all shadow-sm"
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeTab === 'operators' && operators.map(op => (
          <div key={op.id} className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm border border-outline-variant/5 relative group">
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => handleOpenEdit(op)} className="p-2 text-primary hover:bg-primary/10 rounded-lg"><Edit2 size={16} /></button>
              {canDelete && (
                <button onClick={() => handleDeleteClick('operators', op.id, op.name)} className="p-2 text-error hover:bg-error/10 rounded-lg"><Trash2 size={16} /></button>
              )}
            </div>
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-inner">
                  <img className="w-full h-full object-cover" src={op.avatar} alt={op.name} referrerPolicy="no-referrer" />
                </div>
                <div>
                  <h3 className="font-headline font-bold text-on-surface">{op.name}</h3>
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{op.specialty}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${op.status === 'Active' ? 'bg-primary-fixed text-on-primary-fixed-variant' : 'bg-surface-variant text-on-surface-variant'}`}>{op.status}</span>
            </div>
            <div className="space-y-3 pt-4 border-t border-outline-variant/10">
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Experiência</span>
                <span className="font-semibold text-on-surface">{op.experience}</span>
              </div>
              <button 
                onClick={() => {
                  setSelectedOperatorForProduction(op);
                  setIsProductionModalOpen(true);
                }}
                className="w-full py-2.5 mt-2 flex items-center justify-center gap-2 bg-secondary-fixed text-on-secondary-fixed rounded-xl font-bold text-xs shadow-sm active:scale-95 transition-all"
              >
                <BarChart3 size={14} /> Controle de Produção
              </button>
            </div>
          </div>
        ))}

        {activeTab === 'fields' && fields
          .filter(f => 
            f.name.toLowerCase().includes(fieldSearch.toLowerCase()) || 
            f.id.toLowerCase().includes(fieldSearch.toLowerCase())
          )
          .map(field => (
          <div key={field.id} className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm border border-outline-variant/5 relative group">
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
              <button 
                onClick={() => {
                  setSelectedFieldIdForSummary(field.id);
                  setIsSummaryModalOpen(true);
                }} 
                className="p-2 bg-white/80 text-secondary hover:bg-white rounded-lg shadow-sm"
                title="Resumo do Talhão"
              >
                <BarChart3 size={16} />
              </button>
              <button onClick={() => handleOpenEdit(field)} className="p-2 bg-white/80 text-primary hover:bg-white rounded-lg shadow-sm"><Edit2 size={16} /></button>
              {canDelete && (
                <button onClick={() => handleDeleteClick('fields', field.id, field.name)} className="p-2 bg-white/80 text-error hover:bg-white rounded-lg shadow-sm"><Trash2 size={16} /></button>
              )}
            </div>
            <div className="h-32 rounded-2xl overflow-hidden mb-6 relative">
              <img className="w-full h-full object-cover" src={field.image} alt={field.name} referrerPolicy="no-referrer" />
              <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg">
                <span className="text-[10px] font-bold text-primary uppercase">{field.id}</span>
              </div>
            </div>
            <h3 className="font-headline font-bold text-xl text-on-surface mb-1">{field.name}</h3>
            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-2xl font-black text-secondary">{formatNumber(field.area)}</span>
              <span className="text-sm font-bold text-on-surface-variant">Hectares</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <div className="bg-surface-container-low p-3 rounded-xl">
                <p className="text-[10px] uppercase font-bold text-on-surface-variant mb-1">Material Genético</p>
                <p className="font-bold text-on-surface">{field.geneticMaterial}</p>
              </div>
              {field.status && (
                <div className="bg-secondary/5 p-3 rounded-xl border border-secondary/10">
                  <p className="text-[10px] uppercase font-bold text-secondary mb-1">Status</p>
                  <p className="font-bold text-secondary">
                    {(() => {
                      if (field.status === 'Plantado recentemente' && field.plantingDate) {
                        const birthDate = new Date(field.plantingDate.includes('T') ? field.plantingDate : field.plantingDate + 'T12:00:00');
                        const now = new Date();
                        const diffTime = Math.abs(now.getTime() - birthDate.getTime());
                        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                        if (diffDays > 180) return 'Plantado';
                      }
                      return field.status;
                    })()}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}

        {activeTab === 'inputs' && inputs.map(input => {
          // Calculate total stock for this active ingredient
          const rawKey = input.activeIngredient || input.name;
          const key = rawKey.trim().toLowerCase();
          
          const groupStock = inputs
            .filter(i => (i.activeIngredient || i.name).trim().toLowerCase() === key)
            .reduce((sum, i) => sum + i.stock, 0);
          
          const groupMinStock = inputs
            .filter(i => (i.activeIngredient || i.name).trim().toLowerCase() === key)
            .reduce((max, i) => Math.max(max, i.minStock || 0), 0);

          const isLowStock = groupStock <= groupMinStock && groupMinStock > 0;
          
          return (
            <div key={input.id} className={`bg-surface-container-lowest rounded-3xl p-6 shadow-sm border ${isLowStock ? 'border-error/30 bg-error/5' : 'border-outline-variant/5'} relative group transition-all`}>
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => {
                    setSelectedInputForMovement(input);
                    setIsMovementModalOpen(true);
                  }} 
                  className="p-2 text-secondary hover:bg-secondary/10 rounded-lg"
                  title="Movimentação de Estoque"
                >
                  <Package size={16} />
                </button>
                <button 
                  onClick={() => {
                    setSelectedInputForHistory(input);
                    setIsHistoryModalOpen(true);
                  }} 
                  className="p-2 text-tertiary hover:bg-tertiary/10 rounded-lg"
                  title="Histórico de Movimentação"
                >
                  <History size={16} />
                </button>
                <button onClick={() => handleOpenEdit(input)} className="p-2 text-primary hover:bg-primary/10 rounded-lg"><Edit2 size={16} /></button>
                {canDelete && (
                  <button onClick={() => handleDeleteClick('inputs', input.id, input.name)} className="p-2 text-error hover:bg-error/10 rounded-lg"><Trash2 size={16} /></button>
                )}
              </div>
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isLowStock ? 'bg-error text-on-error' : 'bg-tertiary-fixed text-tertiary'}`}>
                  <FlaskConical size={24} />
                </div>
                <div>
                  <h3 className="font-headline font-bold text-on-surface">{input.name}</h3>
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{input.activeIngredient || 'I.A. não definido'}</p>
                </div>
              </div>
              <div className={`p-4 rounded-2xl border mb-4 ${isLowStock ? 'bg-error/10 border-error/20' : 'bg-stone-50 border-stone-100'}`}>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-on-surface">Estoque Atual</span>
                    {isLowStock && <AlertCircle size={14} className="text-error animate-pulse" />}
                  </div>
                  <span className={`text-lg font-black ${isLowStock ? 'text-error' : 'text-tertiary'}`}>{formatNumber(input.stock, 2)} <span className="text-xs font-bold">{input.unit}</span></span>
                </div>
                <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${isLowStock ? 'bg-error' : 'bg-tertiary'}`} 
                    style={{ width: `${Math.min(100, (input.stock / ((input.minStock || 1) * 2)) * 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-[9px] font-bold text-on-surface-variant uppercase">Marca: {input.brand}</span>
                  <span className="text-[9px] font-bold text-on-surface-variant uppercase">Mín: {formatNumber(input.minStock || 0, 2)} {input.unit}</span>
                </div>
              </div>
              <span className="px-3 py-1 bg-surface-container rounded-lg text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter">{input.type}</span>
            </div>
          );
        })}

        {activeTab === 'fleet' && machines.map(machine => {
          const isActive = serviceOrders.some(os => os.machineId === machine.id && os.status === 'active');
          const currentStatus = isActive ? 'Em Operação' : machine.status;
          const nextRevision = (machine.lastRevisionHours || 0) + (machine.revisionInterval || 0);
          const isRevisionDue = machine.revisionInterval && machine.hours >= nextRevision;
          const progress = machine.revisionInterval ? Math.min(100, ((machine.hours - (machine.lastRevisionHours || 0)) / machine.revisionInterval) * 100) : 0;

          return (
            <div key={machine.id} className={`bg-surface-container-lowest rounded-3xl p-6 shadow-sm border ${isRevisionDue ? 'border-error/30 bg-error/5' : 'border-outline-variant/5'} relative group`}>
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                <button onClick={() => handleOpenEdit(machine)} className="p-2 bg-white/80 text-primary hover:bg-white rounded-lg shadow-sm"><Edit2 size={16} /></button>
                {canDelete && (
                  <button onClick={() => handleDeleteClick('fleet', machine.id, machine.name)} className="p-2 bg-white/80 text-error hover:bg-white rounded-lg shadow-sm"><Trash2 size={16} /></button>
                )}
              </div>
              <div className="h-32 rounded-2xl overflow-hidden mb-6 relative">
                <img className="w-full h-full object-cover" src={machine.image} alt={machine.name} referrerPolicy="no-referrer" />
              </div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-headline font-bold text-lg text-on-surface">{machine.name}</h3>
                  <p className="text-sm font-medium text-secondary">ID: {machine.modelId}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${currentStatus === 'Em Operação' ? 'bg-secondary-fixed text-on-secondary-fixed-variant' : currentStatus === 'Maintenance' ? 'bg-error/10 text-error' : 'bg-surface-variant text-on-surface-variant'}`}>{currentStatus}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div className="bg-surface-container-low p-3 rounded-xl">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase">Horímetro Atual</p>
                  <p className="font-black text-on-surface">{formatNumber(machine.hours)} h</p>
                </div>
                <div className="bg-surface-container-low p-3 rounded-xl">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase">Localização</p>
                  <p className="font-bold text-on-surface truncate">{machine.location}</p>
                </div>
              </div>
              
              <div className={`p-4 rounded-2xl border ${isRevisionDue ? 'bg-error/10 border-error/20' : 'bg-surface-container-low border-outline-variant/10'}`}>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-on-surface-variant uppercase">Próxima Revisão</span>
                    {isRevisionDue && <AlertCircle size={14} className="text-error animate-pulse" />}
                  </div>
                  <span className={`text-sm font-black ${isRevisionDue ? 'text-error' : 'text-primary'}`}>
                    {machine.revisionInterval ? `${formatNumber(nextRevision)} h` : 'Não definido'}
                  </span>
                </div>
                {machine.revisionInterval && (
                  <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${isRevisionDue ? 'bg-error' : 'bg-primary'}`} 
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                )}
                {machine.revisionInterval && (
                  <p className={`text-[9px] font-bold uppercase mt-2 ${isRevisionDue ? 'text-error' : 'text-on-surface-variant'}`}>
                    {isRevisionDue ? 'Revisão Atrasada!' : `${formatNumber(nextRevision - machine.hours)} h restantes`}
                  </p>
                )}
              </div>

              <button 
                onClick={() => {
                  setSelectedItemIdForMaintenance(machine.id);
                  setIsMaintenanceModalOpen(true);
                }}
                className="mt-4 w-full py-2 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest bg-surface-container hover:bg-surface-container-high text-primary rounded-xl transition-all"
              >
                <History size={14} /> Histórico de Revisões
              </button>
            </div>
          );
        })}

        {activeTab === 'implements' && implementsList.map(impl => {
          const isActive = serviceOrders.some(os => os.implementId === impl.id && os.status === 'active');
          const currentStatus = isActive ? 'Em Uso' : impl.status;

          return (
            <div key={impl.id} className={`bg-surface-container-lowest rounded-3xl p-6 shadow-sm border border-outline-variant/5 relative group`}>
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                <button onClick={() => handleOpenEdit(impl)} className="p-2 bg-white/80 text-primary hover:bg-white rounded-lg shadow-sm"><Edit2 size={16} /></button>
                {canDelete && (
                  <button onClick={() => handleDeleteClick('implements', impl.id, impl.name)} className="p-2 bg-white/80 text-error hover:bg-white rounded-lg shadow-sm"><Trash2 size={16} /></button>
                )}
              </div>
              <div className="h-32 rounded-2xl overflow-hidden mb-6 relative">
                <img className="w-full h-full object-cover" src={impl.image} alt={impl.name} referrerPolicy="no-referrer" />
              </div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-headline font-bold text-lg text-on-surface">{impl.name}</h3>
                  <p className="text-sm font-medium text-secondary">{impl.brand}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${currentStatus === 'Em Uso' ? 'bg-primary-fixed text-on-primary-fixed-variant' : currentStatus === 'Maintenance' ? 'bg-error/10 text-error' : 'bg-surface-variant text-on-surface-variant'}`}>{currentStatus}</span>
              </div>
              <div className="grid grid-cols-1 gap-4 text-sm mb-4">
                <div className="bg-surface-container-low p-3 rounded-xl">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase">Largura</p>
                  <p className="font-bold text-on-surface">{impl.width} m</p>
                </div>
              </div>

              <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/10">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-on-surface-variant uppercase">Localização Atual</span>
                  <span className="text-sm font-black text-primary">
                    {impl.location || 'Unidade'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {activeTab === 'activityDefinitions' && activityDefinitions.map(activity => {
          const category = activityCategories.find(c => c.id === activity.category || c.name === activity.category);
          return (
            <div key={activity.id} className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm border border-outline-variant/5 relative group">
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleOpenEdit(activity)} className="p-2 text-primary hover:bg-primary/10 rounded-lg"><Edit2 size={16} /></button>
                {canDelete && (
                  <button onClick={() => handleDeleteClick('activityDefinitions', activity.id, activity.name)} className="p-2 text-error hover:bg-error/10 rounded-lg"><Trash2 size={16} /></button>
                )}
              </div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-primary-fixed flex items-center justify-center text-primary">
                  <ClipboardList size={24} />
                </div>
                <div>
                  <h3 className="font-headline font-bold text-on-surface">{activity.name}</h3>
                </div>
              </div>
              {activity.description && (
                <p className="text-sm text-on-surface-variant line-clamp-2 mb-4">{activity.description}</p>
              )}
              <div className="pt-4 border-t border-outline-variant/10 flex justify-between items-center">
                <span className="px-3 py-1 bg-surface-container rounded-lg text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter">
                  {category?.name || 'Outros'}
                </span>
                <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                  {activity.unit}/ha
                </span>
              </div>
            </div>
          );
        })}

        {activeTab === 'performance' && (
          <div className="col-span-full space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {performanceData.map(item => (
                <div key={item.activityName} className="bg-surface-container-lowest p-6 rounded-[2rem] border border-outline-variant/10 shadow-sm space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h4 className="font-black text-on-surface text-lg">{item.activityName}</h4>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-md text-[10px] font-black uppercase">Média Geral</span>
                        <span className="font-black text-primary text-xl">{formatNumber(item.averagePerformance, 2)} <span className="text-xs">ha/h</span></span>
                      </div>
                    </div>
                    {item.goal > 0 && (
                      <div className="text-right space-y-1">
                        <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Meta</p>
                        <p className="font-black text-secondary">{formatNumber(item.goal, 2)} <span className="text-xs">ha/dia</span></p>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2 pt-4 border-t border-outline-variant/10">
                    <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Totais Acumulados</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-surface-container-low p-3 rounded-2xl">
                        <p className="text-[9px] font-bold text-on-surface-variant uppercase mb-1">Área Total</p>
                        <p className="font-bold text-on-surface">{formatNumber(item.totalArea, 2)} ha</p>
                      </div>
                      <div className="bg-surface-container-low p-3 rounded-2xl">
                        <p className="text-[9px] font-bold text-on-surface-variant uppercase mb-1">Horas Totais</p>
                        <p className="font-bold text-on-surface">{formatNumber(item.totalHours, 1)} h</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {performanceData.length > 0 && (
              <div className="bg-surface-container-lowest rounded-[2rem] border border-outline-variant/10 shadow-sm overflow-hidden mt-8">
                <div className="p-6 border-b border-outline-variant/10 bg-surface-container-low">
                  <h4 className="font-black text-on-surface uppercase tracking-widest text-sm">Detalhamento por Operação</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-surface-container-low/50 text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] border-b border-outline-variant/20">
                        <th className="px-8 py-5">Data</th>
                        <th className="px-8 py-5">Atividade</th>
                        <th className="px-8 py-5">Operador / Talhão</th>
                        <th className="px-8 py-5 text-right">Rendimento</th>
                        <th className="px-8 py-5 text-right">Meta Activity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10">
                      {performanceData.flatMap(item => item.logs).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((log, idx) => {
                        const activityInfo = performanceData.find(pd => pd.logs.includes(log));
                        const isLowPerformance = activityInfo && activityInfo.averagePerformance > 0 && log.performance < activityInfo.averagePerformance * 0.8;
                        
                        return (
                          <tr key={idx} className="hover:bg-primary/5 transition-colors group">
                            <td className="px-8 py-4 text-xs font-bold text-on-surface-variant whitespace-nowrap">
                              {format(new Date(log.date), 'dd/MM/yyyy HH:mm')}
                            </td>
                            <td className="px-8 py-4">
                              <span className="text-xs font-black text-primary uppercase">{activityInfo?.activityName}</span>
                            </td>
                            <td className="px-8 py-4">
                              <div className="space-y-0.5">
                                <div className="text-sm font-bold text-on-surface">{log.operator}</div>
                                <div className="text-[10px] font-bold text-on-surface-variant uppercase flex items-center gap-1">
                                  <MapPin size={10} /> {log.field}
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-4 text-right">
                              <div className="flex flex-col items-end">
                                <span className={`text-sm font-black ${isLowPerformance ? 'text-error' : 'text-on-surface'}`}>
                                  {formatNumber(log.performance, 2)} ha/h
                                </span>
                                <span className="text-[10px] font-bold text-on-surface-variant uppercase">
                                  {formatNumber(log.area, 2)} ha em {formatNumber(log.hours, 1)}h
                                </span>
                              </div>
                            </td>
                            <td className="px-8 py-4 text-right">
                              <div className="flex flex-col items-end">
                                <span className="text-xs font-bold text-secondary">
                                  Média: {formatNumber(activityInfo?.averagePerformance || 0, 2)} ha/h
                                </span>
                                {isLowPerformance && (
                                  <span className="text-[9px] font-black text-error uppercase mt-1 flex items-center gap-1">
                                    <AlertCircle size={10} /> Rendimento Baixo
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {performanceData.length === 0 && (
              <div className="bg-surface-container-lowest p-12 rounded-[2rem] border border-dashed border-outline-variant text-center">
                <p className="text-on-surface-variant font-medium italic">Nenhum dado de rendimento disponível. Certifique-se de que os diários de bordo possuem horímetro inicial e final registrados.</p>
              </div>
            )}
          </div>
        )}

      </div>

      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center shrink-0">
              <h3 className="text-xl font-headline font-extrabold text-on-surface">Gerenciar Categorias</h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="p-2 hover:bg-surface-variant rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="bg-surface-container-low p-4 rounded-2xl space-y-3">
                <h4 className="text-xs font-black text-primary uppercase tracking-widest">Nova Categoria</h4>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    id="new-category-name"
                    placeholder="Nome da categoria"
                    className="flex-1 bg-surface-container-lowest border-none rounded-xl py-2 px-3 text-sm font-bold"
                  />
                  <button 
                    onClick={() => {
                      const input = document.getElementById('new-category-name') as HTMLInputElement;
                      if (input.value) {
                        onAdd('activityCategories', { name: input.value });
                        input.value = '';
                      }
                    }}
                    className="bg-primary text-on-primary px-4 py-2 rounded-xl font-bold text-xs uppercase"
                  >
                    Adicionar
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {activityCategories.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between p-3 bg-surface-container rounded-xl">
                    <span className="font-bold text-sm">{cat.name}</span>
                    {canDelete && (
                      <button 
                        onClick={() => handleDeleteClick('activityCategories', cat.id, cat.name)}
                        className="p-2 text-on-surface-variant hover:text-error transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="p-6 border-t border-outline-variant/10">
              <button 
                onClick={() => setIsCategoryModalOpen(false)}
                className="w-full py-3 bg-surface-container text-on-surface font-black text-xs uppercase tracking-widest rounded-xl"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-outline-variant/10 flex justify-between items-center shrink-0">
              <h3 className="text-2xl font-headline font-extrabold text-on-surface">
                {editingItem ? 'Editar' : 'Novo'} {
                  activeTab === 'operators' ? 'Operador' :
                  activeTab === 'fields' ? 'Talhão' :
                  activeTab === 'inputs' ? 'Insumo' :
                  activeTab === 'fleet' ? 'Máquina' : 
                  activeTab === 'activityDefinitions' ? 'Atividade' : 'Implemento'
                }
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-surface-variant rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto">
              {activeTab === 'operators' && (
                <>
                  <Input label="Nome" name="name" defaultValue={editingItem?.name} required />
                  <Input label="Especialidade" name="specialty" defaultValue={editingItem?.specialty} required />
                  <Input label="Experiência" name="experience" defaultValue={editingItem?.experience} required />
                  <Select label="Status" name="status" defaultValue={editingItem?.status || 'Ativo'}>
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                  </Select>
                </>
              )}
              {activeTab === 'fields' && (
                <>
                  <Input label="Nome do Talhão" name="name" defaultValue={editingItem?.name} required />
                  <Input label="Área (ha)" name="area" type="text" inputMode="decimal" defaultValue={editingItem?.area ? formatNumber(editingItem.area, 2) : ''} required />
                  <Input label="Material Genético" name="geneticMaterial" defaultValue={editingItem?.geneticMaterial} required />
                  <Input label="Status" name="status" defaultValue={editingItem?.status} />
                </>
              )}
              {activeTab === 'inputs' && (
                <>
                  <Input label="Nome Comercial" name="name" defaultValue={editingItem?.name} required />
                  <Input label="Ingrediente Ativo" name="activeIngredient" defaultValue={editingItem?.activeIngredient} required />
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Marca" name="brand" defaultValue={editingItem?.brand} required />
                    <Input label="Tipo" name="type" defaultValue={editingItem?.type} required />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <Input label="Estoque Atual" name="stock" type="text" inputMode="decimal" defaultValue={editingItem?.stock ? formatNumber(editingItem.stock, 2) : ''} required />
                    <Input label="Estoque Mínimo" name="minStock" type="text" inputMode="decimal" defaultValue={editingItem?.minStock ? formatNumber(editingItem.minStock, 2) : ''} required />
                    <Input label="Unidade" name="unit" defaultValue={editingItem?.unit || 'L'} required />
                  </div>
                </>
              )}
              {activeTab === 'fleet' && (
                <>
                  <Input label="Nome da Máquina" name="name" defaultValue={editingItem?.name} required />
                  <Input label="ID do Modelo" name="modelId" defaultValue={editingItem?.modelId} required />
                  <div className="grid grid-cols-3 gap-4">
                    <Input label="Horímetro Atual (h)" name="hours" type="text" inputMode="decimal" defaultValue={editingItem?.hours ? formatNumber(editingItem.hours, 2) : ''} required />
                    <Input label="Última Revisão (h)" name="lastRevisionHours" type="text" inputMode="decimal" defaultValue={editingItem?.lastRevisionHours ? formatNumber(editingItem.lastRevisionHours, 2) : ''} />
                    <Input label="Intervalo (h)" name="revisionInterval" type="text" inputMode="decimal" defaultValue={editingItem?.revisionInterval ? formatNumber(editingItem.revisionInterval, 2) : ''} />
                  </div>
                  <Input label="Localização" name="location" defaultValue={editingItem?.location} required />
                  <Select label="Status Manual" name="status" defaultValue={editingItem?.status || 'Disponível'}>
                    <option value="Disponível">Disponível</option>
                    <option value="Em Operação">Em Operação</option>
                    <option value="Manutenção">Manutenção</option>
                  </Select>
                </>
              )}
              {activeTab === 'implements' && (
                <>
                  <Input label="Nome do Implemento" name="name" defaultValue={editingItem?.name} required />
                  <Input label="Marca" name="brand" defaultValue={editingItem?.brand} required />
                  <Input label="Tipo" name="type" defaultValue={editingItem?.type} required />
                  <div className="grid grid-cols-2 gap-4">
                    <Select label="Tipo de Carga" name="loadType" defaultValue={editingItem?.loadType || 'liquid'}>
                      <option value="liquid">Líquido (L)</option>
                      <option value="solid">Sólido (kg)</option>
                      <option value="none">Nenhum (Roçadeira/Grade)</option>
                    </Select>
                    <Input label="Capacidade (L ou kg)" name="tankCapacity" type="text" inputMode="decimal" defaultValue={editingItem?.tankCapacity ? formatNumber(editingItem.tankCapacity, 2) : ''} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Largura (m)" name="width" type="text" inputMode="decimal" defaultValue={editingItem?.width ? formatNumber(editingItem.width, 2) : ''} required />
                    <Input label="Nº de Bicos / Saídas" name="nozzles" type="text" inputMode="decimal" defaultValue={editingItem?.nozzles ? formatNumber(editingItem.nozzles, 0) : ''} required />
                  </div>
                  <Select label="Status Manual" name="status" defaultValue={editingItem?.status || 'Disponível'}>
                    <option value="Disponível">Disponível</option>
                    <option value="Em Uso">Em Uso</option>
                    <option value="Manutenção">Manutenção</option>
                  </Select>
                </>
              )}
              {activeTab === 'activityDefinitions' && (
                <>
                  <Input label="Nome da Atividade" name="name" defaultValue={editingItem?.name} required />
                  <div className="flex items-center gap-3 mb-4 bg-surface-container-low p-4 rounded-2xl border border-outline-variant/10">
                    <input 
                      type="checkbox" 
                      id="isSimpleActivity" 
                      name="isSimpleActivity" 
                      checked={isSimpleActivity}
                      onChange={(e) => setIsSimpleActivity(e.target.checked)}
                      className="w-5 h-5 rounded border-outline text-primary focus:ring-primary"
                    />
                    <label htmlFor="isSimpleActivity" className="text-sm font-bold text-on-surface cursor-pointer">
                      Atividade Simples (Apenas horas, sem insumos/implementos)
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Select label="Categoria" name="category" defaultValue={editingItem?.category || 'outro'}>
                      {activityCategories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                      <option value="outro">Outro</option>
                    </Select>
                    <div className={isSimpleActivity ? "opacity-50 pointer-events-none" : ""}>
                      <Select label="Unidade de Taxa" name="unit" defaultValue={editingItem?.unit || 'L'} required={!isSimpleActivity}>
                        <option value="L">L/ha</option>
                        <option value="kg">kg/ha</option>
                        <option value="unit">unid/ha</option>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Valor do Bônus (R$)" name="bonusValue" type="text" placeholder="0,00" defaultValue={editingItem?.bonusValue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} />
                    <Select label="Unidade do Bônus" name="bonusUnit" defaultValue={editingItem?.bonusUnit || 'ha'}>
                      <option value="ha">por Hectare (ha)</option>
                      <option value="hour">por Hora Máquina (h)</option>
                    </Select>
                  </div>
                  {!isSimpleActivity && (
                    <Input label="Meta Diária (L, kg ou unid / dia)" name="dailyGoal" type="text" inputMode="decimal" defaultValue={editingItem?.dailyGoal ? formatNumber(editingItem.dailyGoal, 2) : ''} required />
                  )}
                  <Input label="Intervalo para Retorno (Dias - Opcional)" name="followUpInterval" type="text" inputMode="numeric" defaultValue={editingItem?.followUpInterval || ''} placeholder="Ex: 30 para pulverização de remonta" />
                  <Input label="Descrição (Opcional)" name="description" defaultValue={editingItem?.description} />
                </>
              )}
              <div className="pt-4 flex gap-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 font-bold text-on-surface-variant hover:bg-surface-variant rounded-2xl transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 py-4 font-bold bg-primary text-on-primary rounded-2xl shadow-lg active:scale-95 transition-all">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isMovementModalOpen && selectedInputForMovement && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-outline-variant/10 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-2xl font-headline font-extrabold text-on-surface">Movimentação</h3>
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">{selectedInputForMovement.name}</p>
              </div>
              <button onClick={() => setIsMovementModalOpen(false)} className="p-2 hover:bg-surface-variant rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleStockMovement} className="p-8 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <label className="relative flex flex-col items-center justify-center p-6 rounded-3xl border-2 border-outline-variant cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5 transition-all">
                  <input type="radio" name="type" value="entry" className="hidden" checked={movementType === 'entry'} onChange={() => setMovementType('entry')} />
                  <ArrowDownLeft className="text-primary mb-2" size={32} />
                  <span className="font-bold text-sm">Entrada</span>
                </label>
                <label className="relative flex flex-col items-center justify-center p-6 rounded-3xl border-2 border-outline-variant cursor-pointer has-[:checked]:border-error has-[:checked]:bg-error/5 transition-all">
                  <input type="radio" name="type" value="exit" className="hidden" checked={movementType === 'exit'} onChange={() => setMovementType('exit')} />
                  <ArrowUpRight className="text-error mb-2" size={32} />
                  <span className="font-bold text-sm">Saída</span>
                </label>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label={`Quantidade (${selectedInputForMovement.unit})`} name="amount" type="text" inputMode="decimal" required autoFocus />
                {movementType === 'entry' && (
                  <Input label="Número da Nota Fiscal" name="invoiceNumber" placeholder="Ex: 123456" />
                )}
              </div>

              {movementType === 'exit' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select label="Destinatário" name="recipient">
                    <option value="">Selecionar Operador</option>
                    {operators.map(op => <option key={op.id} value={op.name}>{op.name}</option>)}
                  </Select>
                  <Select label="Localização" name="location">
                    <option value="">Selecionar Talhão</option>
                    {fields.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                  </Select>
                </div>
              )}

              <Input label="Observação / Descrição" name="description" placeholder="Opcional" />

              <div className="pt-4 flex gap-4">
                <button type="button" onClick={() => setIsMovementModalOpen(false)} className="flex-1 py-4 font-bold text-on-surface-variant hover:bg-surface-variant rounded-2xl transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 py-4 font-bold bg-primary text-on-primary rounded-2xl shadow-lg active:scale-95 transition-all">Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isHistoryModalOpen && selectedInputForHistory && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-outline-variant/10 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-headline font-extrabold text-on-surface">Histórico de Movimentação</h3>
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">{selectedInputForHistory.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleDownloadInputHistoryPDF(selectedInputForHistory)}
                  className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors"
                  title="Baixar PDF do Histórico"
                >
                  <Download size={20} />
                </button>
                <button onClick={() => setIsHistoryModalOpen(false)} className="p-2 hover:bg-surface-variant rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="p-8 max-h-[60vh] overflow-y-auto no-scrollbar">
              <div className="space-y-4">
                {stockMovements
                  .filter(m => m.inputId === selectedInputForHistory.id)
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map(movement => (
                    <div key={movement.id} className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/10 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          movement.type === 'entry' ? 'bg-primary/10 text-primary' : 
                          movement.type === 'exit' ? 'bg-error/10 text-error' : 'bg-secondary/10 text-secondary'
                        }`}>
                          {movement.type === 'entry' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                        </div>
                        <div>
                          <p className="font-bold text-on-surface">
                            {movement.type === 'entry' ? 'Entrada' : movement.type === 'exit' ? 'Saída' : 'Dedução OS'}
                            <span className="ml-2 text-xs font-medium text-on-surface-variant">
                              {new Date(movement.date).toLocaleDateString('pt-BR')} {new Date(movement.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                            {movement.invoiceNumber && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-on-surface-variant uppercase">
                                <ReceiptText size={12} /> Inv: {movement.invoiceNumber}
                              </span>
                            )}
                            {movement.recipient && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-on-surface-variant uppercase">
                                <User size={12} /> {movement.recipient}
                              </span>
                            )}
                            {movement.location && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-on-surface-variant uppercase">
                                <MapPin size={12} /> {movement.location}
                              </span>
                            )}
                          </div>
                          {movement.description && (
                            <p className="text-xs text-on-surface-variant mt-1 italic">"{movement.description}"</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className={`font-black text-lg ${
                            movement.type === 'entry' ? 'text-primary' : 'text-error'
                          }`}>
                            {movement.type === 'entry' ? '+' : '-'}{formatNumber(movement.amount, 2)}
                          </p>
                          <p className="text-[10px] font-bold text-on-surface-variant uppercase">{selectedInputForHistory.unit}</p>
                        </div>
                        {canDelete && (
                          <button 
                            onClick={() => setShowDeleteConfirm({ 
                              type: 'stockMovements', 
                              id: movement.id, 
                              name: movement.type === 'entry' ? 'Entrada de Estoque' : 'Saída de Estoque'
                            })}
                            className="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-all"
                            title="Excluir Movimentação"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                {stockMovements.filter(m => m.inputId === selectedInputForHistory.id).length === 0 && (
                  <div className="text-center py-12 text-on-surface-variant opacity-50">
                    <History size={48} className="mx-auto mb-2" />
                    <p className="font-bold">Nenhuma movimentação registrada</p>
                  </div>
                )}
              </div>
            </div>
            <div className="p-8 border-t border-outline-variant/10 bg-surface-container-low">
              <button onClick={() => setIsHistoryModalOpen(false)} className="w-full py-4 font-bold bg-surface-variant text-on-surface rounded-2xl transition-all">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {isSummaryModalOpen && selectedFieldForSummary && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-[2.5rem] w-full max-w-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-outline-variant/10 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-2xl font-headline font-extrabold text-on-surface">Resumo do Talhão</h3>
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">{selectedFieldForSummary.name} • {selectedFieldForSummary.area} ha</p>
              </div>
              <button onClick={() => setIsSummaryModalOpen(false)} className="p-2 hover:bg-surface-variant rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto no-scrollbar space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-surface-container p-5 rounded-3xl border border-outline-variant/10">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Total de Atividades</p>
                  <p className="text-3xl font-black text-primary">
                    {serviceOrders.filter(os => os.fieldId === selectedFieldForSummary.id).length}
                  </p>
                </div>
                <div className="bg-surface-container p-5 rounded-3xl border border-outline-variant/10">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Idade do Talhão</p>
                  <p className="text-3xl font-black text-secondary">
                    {(() => {
                      // 1. Find all planting OS for this field
                      const plantingOSIds = serviceOrders
                        .filter(os => 
                          os.fieldId === selectedFieldForSummary.id && 
                          os.status === 'completed' &&
                          activityDefinitions.find(d => d.name === os.activity)?.category === 'planting'
                        )
                        .map(os => os.id);

                      // 2. Find logs for these OS
                      const plantingLogs = dailyLogs
                        .filter(log => plantingOSIds.includes(log.osId))
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                      // 3. Determine birth date (planting) - Use date of LAST record (log or completion)
                      const allDates: number[] = [];
                      
                      plantingLogs.forEach(log => {
                        const d = new Date(log.date.includes('T') ? log.date : log.date + 'T12:00:00');
                        if (!isNaN(d.getTime())) allDates.push(d.getTime());
                      });

                      serviceOrders
                        .filter(os => plantingOSIds.includes(os.id) && os.completedAt)
                        .forEach(os => {
                          const d = new Date(os.completedAt!.includes('T') ? os.completedAt! : os.completedAt! + 'T12:00:00');
                          if (!isNaN(d.getTime())) allDates.push(d.getTime());
                        });

                      let birthDate: Date | null = null;
                      if (selectedFieldForSummary.plantingDate) {
                        birthDate = new Date(selectedFieldForSummary.plantingDate.includes('T') ? selectedFieldForSummary.plantingDate : selectedFieldForSummary.plantingDate + 'T12:00:00');
                      } else if (allDates.length > 0) {
                        // Fallback for old data or if OS was completed but field wasn't updated
                        birthDate = new Date(Math.max(...allDates));
                      }

                      if (birthDate) {
                        const now = new Date();
                        const diffTime = Math.abs(now.getTime() - birthDate.getTime());
                        const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                        if (totalDays < 30) return 'Plantado Recentemente';
                        
                        let years = now.getFullYear() - birthDate.getFullYear();
                        let months = now.getMonth() - birthDate.getMonth();
                        let days = now.getDate() - birthDate.getDate();

                        if (days < 0) {
                          months--;
                          const lastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
                          days += lastMonth.getDate();
                        }
                        
                        if (months < 0) {
                          years--;
                          months += 12;
                        }
                        
                        const yearStr = years > 0 ? `${years} ${years === 1 ? 'ano' : 'anos'}` : '';
                        const monthStr = months > 0 ? `${months} ${months === 1 ? 'mês' : 'meses'}` : '';
                        const dayStr = days > 0 ? `${days} ${days === 1 ? 'dia' : 'dias'}` : '';
                        
                        const ageParts = [yearStr, monthStr, dayStr].filter(Boolean);
                        const ageDetail = ageParts.join(' e ');
                        
                        return `${ageDetail} (${totalDays} d)`;
                      }
                      return 'Não Plantado';
                    })()}
                  </p>
                </div>
                <div className="bg-surface-container p-5 rounded-3xl border border-outline-variant/10">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Desvio Médio</p>
                  {(() => {
                    const completed = serviceOrders.filter(os => os.fieldId === selectedFieldForSummary.id && os.status === 'completed');
                    const avgDev = completed.length > 0 
                      ? completed.reduce((acc, os) => acc + (os.deviation || 0), 0) / completed.length 
                      : 0;
                    return (
                      <p className={`text-3xl font-black ${Math.abs(avgDev) > 5 ? 'text-error' : 'text-primary'}`}>
                        {avgDev > 0 ? '+' : ''}{formatNumber(avgDev, 1)}%
                      </p>
                    );
                  })()}
                </div>
                <div className="bg-surface-container p-5 rounded-3xl border border-outline-variant/10">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Total de Horas</p>
                  <p className="text-3xl font-black text-on-surface">
                    {(() => {
                      const fieldOSIds = serviceOrders.filter(os => os.fieldId === selectedFieldForSummary.id).map(os => os.id);
                      const fieldLogs = dailyLogs.filter(log => fieldOSIds.includes(log.osId));
                      const totalHours = fieldLogs.reduce((sum, log) => sum + (log.horimetroFinal || 0) - (log.horimetroInicial || 0), 0);
                      return formatNumber(totalHours);
                    })()} h
                  </p>
                </div>
              </div>

              {/* Activity History */}
              <div className="space-y-4">
                <h4 className="font-headline font-black text-lg flex items-center gap-2">
                  <ClipboardCheck size={20} className="text-primary" /> Histórico de OS
                </h4>
                <div className="space-y-3">
                  {serviceOrders
                    .filter(os => os.fieldId === selectedFieldForSummary.id)
                    .map(os => {
                      const osLogs = dailyLogs.filter(l => l.osId === os.id);
                      const totalApplied = osLogs.reduce((sum, l) => sum + l.amount, 0);
                      const isSimple = !!activityDefinitions.find(d => d.name === os.activity)?.isSimpleActivity;
                      return (
                        <div key={os.id} className="bg-surface-container-low p-5 rounded-3xl border border-outline-variant/10">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <p className="font-black text-on-surface">{os.activity}</p>
                              <p className="text-[10px] font-bold text-on-surface-variant uppercase">
                                {os.status === 'active' ? 'Em Execução' : 'Concluída em ' + format(new Date(os.completedAt || os.createdAt), 'dd/MM/yyyy')}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${os.status === 'active' ? 'bg-primary/10 text-primary' : 'bg-surface-variant text-on-surface-variant'}`}>
                                {os.status === 'active' ? 'Ativa' : 'Finalizada'}
                              </span>
                              <button 
                                onClick={() => {
                                  setSelectedOSForDetail(os);
                                  setIsOSDetailModalOpen(true);
                                }}
                                className="flex items-center gap-1 text-[10px] font-black text-primary hover:underline"
                              >
                                <ArrowUpRight size={12} /> Ver OS Completa
                              </button>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t border-outline-variant/10">
                            {!isSimple && (
                              <>
                                <div>
                                  <p className="text-[9px] font-bold text-on-surface-variant uppercase">Aplicado</p>
                                  <p className="font-bold text-sm">{formatNumber(totalApplied)} {activityDefinitions.find(d => d.name === os.activity)?.unit || 'kg'}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] font-bold text-on-surface-variant uppercase">Área Teórica</p>
                                  <p className="font-bold text-sm">{formatNumber(totalApplied / (os.targetRate || 1))} ha</p>
                                </div>
                              </>
                            )}
                            <div>
                              <p className="text-[9px] font-bold text-on-surface-variant uppercase">Horas</p>
                              <p className="font-bold text-sm">{formatNumber(osLogs.reduce((sum, l) => sum + (l.horimetroFinal || 0) - (l.horimetroInicial || 0), 0))} h</p>
                            </div>
                            {!isSimple && (
                              <div>
                                <p className="text-[9px] font-bold text-on-surface-variant uppercase">Desvio</p>
                                <p className={`font-bold text-sm ${Math.abs(os.deviation || 0) > 5 ? 'text-error' : 'text-primary'}`}>
                                  {os.deviation ? (os.deviation > 0 ? '+' : '') + formatNumber(os.deviation) + '%' : '0%'}
                                </p>
                              </div>
                            )}
                            <div>
                              <p className="text-[9px] font-bold text-on-surface-variant uppercase">Operador</p>
                              <p className="font-bold text-sm truncate">{operators.find(o => o.id === os.operatorId)?.name || 'N/A'}</p>
                            </div>
                          </div>

                          {/* Daily Logs Sub-list */}
                          {osLogs.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-outline-variant/5">
                              <p className="text-[9px] font-black text-on-surface-variant uppercase mb-2">Lançamentos Diários</p>
                              <div className="flex flex-wrap gap-2">
                                  {osLogs.map(log => (
                                    <div key={log.id} className="bg-surface-container-lowest px-3 py-1.5 rounded-xl border border-outline-variant/5 flex items-center gap-2">
                                      <Calendar size={10} className="text-on-surface-variant" />
                                      <span className="text-[10px] font-bold">{format(new Date(log.date.split('T')[0] + 'T12:00:00'), 'dd/MM')}</span>
                                      <span className="text-[10px] font-black text-primary">{formatNumber(log.amount)}{activityDefinitions.find(d => d.name === os.activity)?.unit || 'kg'}</span>
                                      {log.horimetroInicial !== undefined && log.horimetroFinal !== undefined && (
                                        <span className="text-[10px] font-bold text-secondary">{formatNumber(log.horimetroFinal - log.horimetroInicial)}h</span>
                                      )}
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  {serviceOrders.filter(os => os.fieldId === selectedFieldForSummary.id).length === 0 && (
                    <div className="text-center py-12 bg-surface-container-low rounded-3xl border border-dashed border-outline-variant">
                      <p className="text-on-surface-variant font-medium italic">Nenhuma atividade registrada para este talhão.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-8 border-t border-outline-variant/10 bg-surface-container-low shrink-0">
              <button onClick={() => setIsSummaryModalOpen(false)} className="w-full py-4 font-bold bg-primary text-on-primary rounded-2xl shadow-lg transition-all">Fechar Resumo</button>
            </div>
          </div>
        </div>
      )}

      {isOSDetailModalOpen && selectedOSForDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-outline-variant/10 flex justify-between items-center shrink-0 bg-surface-container-low">
              <div>
                <h3 className="text-2xl font-headline font-black text-on-surface">Detalhes da Ordem de Serviço</h3>
                <p className="text-sm font-bold text-on-surface-variant uppercase tracking-widest">ID: {selectedOSForDetail.id}</p>
              </div>
              <button onClick={() => setIsOSDetailModalOpen(false)} className="p-3 hover:bg-surface-variant rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 space-y-8 overflow-y-auto">
              {/* Header Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-surface-container p-4 rounded-2xl border border-outline-variant/5">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Atividade</p>
                  <p className="font-black text-on-surface">{selectedOSForDetail.activity}</p>
                </div>
                <div className="bg-surface-container p-4 rounded-2xl border border-outline-variant/5">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Talhão</p>
                  <p className="font-black text-on-surface">{(selectedOSForDetail as any).fieldName || fields.find(f => f.id === selectedOSForDetail.fieldId)?.name || 'N/A'}</p>
                </div>
                <div className="bg-surface-container p-4 rounded-2xl border border-outline-variant/5">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Status</p>
                  <p className={`font-black uppercase text-xs ${selectedOSForDetail.status === 'active' ? 'text-primary' : 'text-on-surface-variant'}`}>
                    {selectedOSForDetail.status === 'active' ? 'Em Execução' : 'Concluída'}
                  </p>
                </div>
                <div className="bg-surface-container p-4 rounded-2xl border border-outline-variant/5">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Data de Criação</p>
                  <p className="font-black text-on-surface">{format(new Date(selectedOSForDetail.createdAt), 'dd/MM/yyyy')}</p>
                </div>
              </div>

              {/* Technical Details */}
              <div className="space-y-4">
                <h4 className="font-headline font-black text-lg flex items-center gap-2">
                  <TractorIcon size={20} className="text-primary" /> Configuração Técnica
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl border border-outline-variant/10">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase">Máquina</p>
                    <p className="font-bold">{(selectedOSForDetail as any).machineName || machines.find(m => m.id === selectedOSForDetail.machineId)?.name || 'N/A'}</p>
                  </div>
                  <div className="p-4 rounded-2xl border border-outline-variant/10">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase">Implemento</p>
                    <p className="font-bold">{(selectedOSForDetail as any).implementName || implementsList.find(i => i.id === selectedOSForDetail.implementId)?.name || 'N/A'}</p>
                  </div>
                  <div className="p-4 rounded-2xl border border-outline-variant/10">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase">Operador</p>
                    <p className="font-bold">{(selectedOSForDetail as any).operatorName || operators.find(o => o.id === selectedOSForDetail.operatorId)?.name || 'N/A'}</p>
                  </div>
                  <div className="p-4 rounded-2xl border border-outline-variant/10">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase">Largura de Trabalho</p>
                    <p className="font-bold">{selectedOSForDetail.width} m</p>
                  </div>
                  <div className="p-4 rounded-2xl border border-outline-variant/10">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase">Taxa Alvo</p>
                    <p className="font-bold">{selectedOSForDetail.targetRate} {activityDefinitions.find(d => d.name === selectedOSForDetail.activity)?.unit || 'kg'}/ha</p>
                  </div>
                  <div className="p-4 rounded-2xl border border-outline-variant/10">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase">Volume Planejado</p>
                    <p className="font-bold">{selectedOSForDetail.totalPlannedVolume.toLocaleString('pt-BR')} {activityDefinitions.find(d => d.name === selectedOSForDetail.activity)?.unit || 'kg'}</p>
                  </div>
                </div>
              </div>

              {/* Insumos */}
              <div className="space-y-4">
                <h4 className="font-headline font-black text-lg flex items-center gap-2">
                  <Package size={20} className="text-primary" /> Insumos da Calda
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedOSForDetail.inputs.map((input, idx) => (
                    <div key={idx} className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/10 flex justify-between items-center">
                      <div>
                        <p className="font-black text-on-surface">{(input as any).inputName || input.name}</p>
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase">Dose: {input.dose} {input.unit}/ha</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-primary">
                          {(input.dose * ((selectedOSForDetail as any).fieldArea || fields.find(f => f.id === selectedOSForDetail.fieldId)?.area || 0)).toLocaleString('pt-BR')}
                        </p>
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase">{input.unit} total</p>
                        {input.stockDeduction !== undefined && (
                          <p className="text-[10px] font-bold text-secondary uppercase mt-1">Retirada: {input.stockDeduction.toLocaleString('pt-BR')} {input.unit}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Execution Summary */}
              {(() => {
                const isSimple = !!activityDefinitions.find(d => d.name === selectedOSForDetail.activity)?.isSimpleActivity;
                return (
                  <div className="space-y-4">
                    <h4 className="font-headline font-black text-lg flex items-center gap-2">
                      <BarChart3 size={20} className="text-primary" /> Resumo da Execução
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {!isSimple && (
                        <>
                          <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                            <p className="text-[10px] font-bold text-primary uppercase">Total Aplicado</p>
                            <p className="text-xl font-black text-primary">
                              {formatNumber(dailyLogs.filter(l => l.osId === selectedOSForDetail.id).reduce((sum, l) => sum + l.amount, 0))} {activityDefinitions.find(d => d.name === selectedOSForDetail.activity)?.unit || 'kg'}
                            </p>
                          </div>
                          <div className="p-4 rounded-2xl bg-secondary/5 border border-secondary/10">
                            <p className="text-[10px] font-bold text-secondary uppercase">Área Real</p>
                            <p className="text-xl font-black text-secondary">
                              {formatNumber(dailyLogs.filter(l => l.osId === selectedOSForDetail.id).reduce((sum, l) => sum + l.amount, 0) / (selectedOSForDetail.targetRate || 1))} ha
                            </p>
                          </div>
                        </>
                      )}
                      <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/10">
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase">Horas Máquina</p>
                        <p className="text-xl font-black">
                          {formatNumber(dailyLogs.filter(l => l.osId === selectedOSForDetail.id).reduce((sum, l) => sum + (l.horimetroFinal || 0) - (l.horimetroInicial || 0), 0))} h
                        </p>
                      </div>
                      {!isSimple && (
                        <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/10">
                          <p className="text-[10px] font-bold text-on-surface-variant uppercase">Desvio Final</p>
                          <p className={`text-xl font-black ${Math.abs(selectedOSForDetail.deviation || 0) > 5 ? 'text-error' : 'text-primary'}`}>
                            {selectedOSForDetail.deviation ? (selectedOSForDetail.deviation > 0 ? '+' : '') + formatNumber(selectedOSForDetail.deviation) + '%' : '0%'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
            
            <div className="p-8 border-t border-outline-variant/10 bg-surface-container-low shrink-0">
              <button onClick={() => setIsOSDetailModalOpen(false)} className="w-full py-4 font-bold bg-primary text-on-primary rounded-2xl shadow-lg transition-all">Fechar Detalhes</button>
            </div>
          </div>
        </div>
      )}

      {/* Consolidated Production Report Modal */}
      {isConsolidatedReportModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-surface rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl border border-outline-variant/10 animate-in zoom-in-95 duration-300">
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-2xl font-headline font-black text-on-surface tracking-tight">Relatório de Produção</h3>
                  <p className="text-on-surface-variant font-medium">Selecione o período desejado</p>
                </div>
                <button 
                  onClick={() => setIsConsolidatedReportModalOpen(false)}
                  className="p-2 hover:bg-surface-container-highest rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Início</label>
                  <input 
                    type="date" 
                    value={productionFilterStart} 
                    onChange={(e) => setProductionFilterStart(e.target.value)}
                    className="w-full bg-surface-container-low border-none rounded-2xl py-4 px-5 font-bold text-on-surface focus:ring-2 focus:ring-primary transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Fim</label>
                  <input 
                    type="date" 
                    value={productionFilterEnd} 
                    onChange={(e) => setProductionFilterEnd(e.target.value)}
                    className="w-full bg-surface-container-low border-none rounded-2xl py-4 px-5 font-bold text-on-surface focus:ring-2 focus:ring-primary transition-all"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => {
                    handleDownloadConsolidatedProductionPDF();
                    setIsConsolidatedReportModalOpen(false);
                  }}
                  className="w-full py-4 bg-primary text-on-primary rounded-2xl font-black text-lg shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                >
                  <FileText size={24} /> Gerar Relatório PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isProductionModalOpen && selectedOperatorForProduction && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[150] flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-[2.5rem] w-full max-w-5xl h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-outline-variant/10 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-inner">
                  <img className="w-full h-full object-cover" src={selectedOperatorForProduction.avatar} alt={selectedOperatorForProduction.name} referrerPolicy="no-referrer" />
                </div>
                <div>
                  <h3 className="text-2xl font-headline font-black text-on-surface">Controle de Produção</h3>
                  <p className="text-on-surface-variant font-medium">{selectedOperatorForProduction.name}</p>
                </div>
              </div>
              <button 
                onClick={() => handleDownloadProductionPDF(selectedOperatorForProduction)}
                className="flex items-center gap-2 px-6 py-3 bg-secondary-fixed text-on-secondary-fixed rounded-2xl font-bold text-sm shadow-lg active:scale-95 transition-all"
              >
                <Download size={18} /> Gerar PDF
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
              <div className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/10">
                <h4 className="text-sm font-black text-on-surface-variant uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Plus size={16} /> {editingProductionRecord ? 'Editar Lançamento' : 'Novo Lançamento de Produção'}
                </h4>
                <form 
                  key={editingProductionRecord?.id || 'new'}
                  onSubmit={handleProductionSubmit} 
                  className="grid grid-cols-1 md:grid-cols-4 gap-4"
                >
                  <Input label="Data" type="date" name="date" required defaultValue={editingProductionRecord?.date || new Date().toISOString().split('T')[0]} />
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest ml-1">Atividade</label>
                    <select name="activityName" required defaultValue={editingProductionRecord?.activityName || ''} className="w-full bg-surface-container-highest border-none rounded-2xl py-3 px-4 text-on-surface font-medium focus:ring-2 focus:ring-primary transition-all appearance-none">
                      <option value="">Selecionar...</option>
                      {activityDefinitions.map(ad => (
                        <option key={ad.id} value={ad.name}>{ad.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest ml-1">Talhão</label>
                    <select name="fieldName" required defaultValue={editingProductionRecord?.fieldName || ''} className="w-full bg-surface-container-highest border-none rounded-2xl py-3 px-4 text-on-surface font-medium focus:ring-2 focus:ring-primary transition-all appearance-none">
                      <option value="">Selecionar...</option>
                      {fields.map(f => (
                        <option key={f.id} value={f.name}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                  <Input label="Área do Talhão (ha)" type="text" name="fieldArea" required defaultValue={editingProductionRecord?.fieldArea?.toLocaleString('pt-BR') || '0'} />
                  <Input label="Área Realizada / Horas" type="text" name="performedArea" required defaultValue={editingProductionRecord?.performedArea?.toLocaleString('pt-BR') || '0'} />
                  <Input label="Área Paga / Horas" type="text" name="paidArea" required defaultValue={editingProductionRecord?.paidArea?.toLocaleString('pt-BR') || editingProductionRecord?.fieldArea?.toLocaleString('pt-BR') || '0'} />
                  <Input label="Valor do Bônus (R$)" type="text" name="bonusValue" required defaultValue={editingProductionRecord?.bonusValue?.toLocaleString('pt-BR') || '0'} />
                  <Select label="Unidade" name="bonusUnit" required defaultValue={editingProductionRecord?.bonusUnit || 'ha'}>
                    <option value="ha">Por Hectare</option>
                    <option value="hour">Por Hora Máquina</option>
                  </Select>
                  <div className="flex items-end gap-2">
                    <button type="submit" className="flex-1 py-3 bg-primary text-on-primary rounded-2xl font-bold shadow-lg active:scale-95 transition-all">
                      {editingProductionRecord ? 'Salvar' : 'Adicionar'}
                    </button>
                    {editingProductionRecord && (
                      <button 
                        type="button"
                        onClick={() => setEditingProductionRecord(null)}
                        className="p-3 bg-surface-variant text-on-surface-variant rounded-2xl hover:bg-outline-variant/20 transition-all"
                        title="Cancelar Edição"
                      >
                        <X size={20} />
                      </button>
                    )}
                  </div>
                </form>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-black text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
                    <History size={16} /> Histórico de Produção
                  </h4>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setShowDeletedProduction(!showDeletedProduction)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${showDeletedProduction ? 'bg-error/10 text-error' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}`}
                    >
                      {showDeletedProduction ? 'Ocultar Removidos' : 'Mostrar Removidos'}
                    </button>
                    <div className="flex items-center gap-2">
                      <input 
                        type="date" 
                        value={productionFilterStart} 
                        onChange={(e) => setProductionFilterStart(e.target.value)}
                        className="bg-surface-container-low border-none rounded-xl py-2 px-3 text-xs font-bold text-on-surface focus:ring-2 focus:ring-primary"
                      />
                      <span className="text-on-surface-variant text-xs font-bold">até</span>
                      <input 
                        type="date" 
                        value={productionFilterEnd} 
                        onChange={(e) => setProductionFilterEnd(e.target.value)}
                        className="bg-surface-container-low border-none rounded-xl py-2 px-3 text-xs font-bold text-on-surface focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {selectedOperatorForProduction && getConsolidatedProduction(selectedOperatorForProduction, showDeletedProduction)
                    .filter(p => {
                      const pDate = new Date(p.date.includes('T') ? p.date : p.date + 'T12:00:00');
                      const start = productionFilterStart ? new Date(productionFilterStart + 'T00:00:00') : null;
                      const end = productionFilterEnd ? new Date(productionFilterEnd + 'T23:59:59') : null;
                      if (start && pDate < start) return false;
                      if (end && pDate > end) return false;
                      return true;
                    })
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map(p => {
                      const dateObj = p.date.includes('T') ? new Date(p.date) : new Date(p.date + 'T12:00:00');
                      const isValidDate = !isNaN(dateObj.getTime());
                      const deviation = p.bonusUnit === 'ha' && p.fieldArea > 0 ? ((p.performedArea / p.fieldArea) - 1) * 100 : 0;
                      const isHighDeviation = Math.abs(deviation) > 5;
                      
                      const isEditing = editingProductionRecord?.id === p.id;
                      const isDeleted = (p as any).isDeleted;
                      
                      return (
                      <div key={p.id} className={`bg-surface-container-lowest p-5 rounded-2xl border ${isDeleted ? 'opacity-50 grayscale border-dashed' : isEditing ? 'border-primary ring-2 ring-primary/20' : isHighDeviation ? 'border-error/30 bg-error-container/5' : 'border-outline-variant/10'} flex items-center justify-between group hover:border-primary/30 transition-all`}>
                        <div className="flex items-center gap-6">
                          <div className="text-center min-w-[60px]">
                            <p className="text-[10px] font-black text-on-surface-variant uppercase">{isValidDate ? dateObj.toLocaleDateString('pt-BR', { month: 'short' }) : '---'}</p>
                            <p className="text-xl font-black text-on-surface">{isValidDate ? dateObj.toLocaleDateString('pt-BR', { day: '2-digit' }) : '--'}</p>
                          </div>
                          <div className="h-10 w-px bg-outline-variant/20"></div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="font-bold text-on-surface">{p.activityName}</h5>
                              {p.osId && p.osId !== 'Manual' && (
                                <span className="text-[10px] font-black bg-secondary/10 text-secondary px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                  {isDeleted ? 'OS Ignorada' : 'OS Concluída'}
                                </span>
                              )}
                              {isHighDeviation && !isDeleted && (
                                <span className="text-[10px] font-black bg-error/10 text-error px-2 py-0.5 rounded-full uppercase tracking-tighter flex items-center gap-1">
                                  <AlertCircle size={10} /> Desvio: {deviation > 0 ? '+' : ''}{formatNumber(deviation, 1)}%
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-medium text-on-surface-variant">Talhão: {p.fieldName} ({formatNumber(p.fieldArea)} ha)</p>
                          </div>
                          <div className="hidden md:block">
                            <p className="text-[10px] font-bold text-on-surface-variant uppercase">Realizado</p>
                            <p className={`text-sm font-black ${isHighDeviation && !isDeleted ? 'text-error' : 'text-on-surface'}`}>{formatNumber(p.performedArea)} {p.bonusUnit === 'ha' ? 'ha' : 'h'}</p>
                          </div>
                          <div className="hidden md:block">
                            <p className="text-[10px] font-bold text-on-surface-variant uppercase">Pago (Área Talhão)</p>
                            <p className="text-sm font-black text-secondary">{formatNumber(p.paidArea)} {p.bonusUnit === 'ha' ? 'ha' : 'h'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-8">
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-on-surface-variant uppercase">Bônus Total</p>
                            <p className="text-lg font-black text-primary">R$ {formatNumber(p.totalBonus)}</p>
                          </div>
                          <div className="flex gap-1">
                            {isDeleted ? (
                              <button 
                                onClick={() => handleRestoreProduction(selectedOperatorForProduction, p.id)} 
                                className="p-2 text-secondary hover:bg-secondary/10 rounded-lg flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest"
                              >
                                <Plus size={16} /> Restaurar
                              </button>
                            ) : (
                              <>
                                <button onClick={() => setEditingProductionRecord(p)} className="p-2 text-primary hover:bg-primary/10 rounded-lg" title="Editar"><Edit2 size={16} /></button>
                                <button onClick={() => setProductionToDelete(p)} className="p-2 text-error hover:bg-error/10 rounded-lg" title="Excluir"><Trash2 size={16} /></button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {selectedOperatorForProduction && getConsolidatedProduction(selectedOperatorForProduction).length === 0 && (
                    <div className="text-center py-12 text-on-surface-variant opacity-50 italic">
                      Nenhum registro de produção encontrado.
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-8 border-t border-outline-variant/10 bg-surface-container-low shrink-0">
              <button onClick={() => setIsProductionModalOpen(false)} className="w-full py-4 font-bold bg-surface-variant text-on-surface rounded-2xl transition-all">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {productionToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-[2.5rem] w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-error/10 text-error rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={40} />
              </div>
              <h3 className="text-2xl font-headline font-black text-on-surface mb-2">Excluir Lançamento</h3>
              <p className="text-on-surface-variant font-medium mb-8">
                Tem certeza que deseja excluir o lançamento de produção de <span className="font-bold text-on-surface">"{productionToDelete.activityName}"</span>?
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setProductionToDelete(null)}
                  className="py-4 font-black text-xs uppercase tracking-widest bg-surface-container text-on-surface rounded-2xl active:scale-95 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmDeleteProduction}
                  className="py-4 font-black text-xs uppercase tracking-widest bg-error text-on-error rounded-2xl shadow-lg shadow-error/20 active:scale-95 transition-all"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isMaintenanceModalOpen && selectedItemForMaintenance && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-outline-variant/10 flex justify-between items-center shrink-0 bg-surface-container-low">
              <div>
                <h3 className="text-2xl font-headline font-black text-on-surface">Histórico de Manutenção</h3>
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">{selectedItemForMaintenance.name}</p>
              </div>
              <button onClick={() => setIsMaintenanceModalOpen(false)} className="p-3 hover:bg-surface-variant rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 space-y-8 overflow-y-auto no-scrollbar">
              {/* Add New Maintenance Form */}
              <div className="bg-surface-container p-6 rounded-3xl border border-outline-variant/10">
                <h4 className="text-sm font-black text-on-surface-variant uppercase mb-4 flex items-center gap-2">
                  {editingMaintenanceRecord ? <Edit2 size={16} /> : <Plus size={16} />} 
                  {editingMaintenanceRecord ? 'Editar Manutenção' : 'Registrar Nova Manutenção'}
                </h4>
                <form onSubmit={handleMaintenanceSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input 
                      label="Horímetro da Manutenção" 
                      name="hours" 
                      type="text" 
                      placeholder="0.0"
                      defaultValue={editingMaintenanceRecord?.hours?.toLocaleString('pt-BR')}
                      required 
                    />
                    <Select 
                      label="Tipo de Manutenção" 
                      name="type" 
                      defaultValue={editingMaintenanceRecord?.type || 'preventive'}
                      required
                    >
                      <option value="preventive">Preventiva</option>
                      <option value="corrective">Corretiva</option>
                    </Select>
                    <Input 
                      label="Custo (R$)" 
                      name="cost" 
                      type="text" 
                      placeholder="0,00"
                      defaultValue={editingMaintenanceRecord?.cost?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    />
                    <div className="md:col-span-2">
                      <Input 
                        label="Descrição do Serviço" 
                        name="description" 
                        placeholder="Ex: Troca de óleo e filtros" 
                        defaultValue={editingMaintenanceRecord?.description}
                        required 
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {editingMaintenanceRecord && (
                      <button 
                        type="button" 
                        onClick={() => setEditingMaintenanceRecord(null)}
                        className="flex-1 py-3 font-bold bg-surface-variant text-on-surface rounded-xl active:scale-95 transition-all"
                      >
                        Cancelar
                      </button>
                    )}
                    <button type="submit" className="flex-[2] py-3 font-bold bg-primary text-on-primary rounded-xl shadow-md active:scale-95 transition-all">
                      {editingMaintenanceRecord ? 'Salvar Alterações' : 'Salvar Manutenção'}
                    </button>
                  </div>
                </form>
              </div>

              {/* History List */}
              <div className="space-y-4">
                <h4 className="text-sm font-black text-on-surface-variant uppercase flex items-center gap-2">
                  <History size={16} /> Histórico
                </h4>
                {(selectedItemForMaintenance as any).maintenanceHistory?.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((record: any) => (
                  <div key={record.id} className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/5 flex justify-between items-center group/item">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-on-surface">{record.description}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter ${record.type === 'corrective' ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary'}`}>
                          {record.type === 'corrective' ? 'Corretiva' : 'Preventiva'}
                        </span>
                      </div>
                      <p className="text-xs text-on-surface-variant">
                        {format(new Date(record.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-black text-primary">{formatNumber(record.hours)} h</p>
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase">Horímetro</p>
                      </div>
                      {record.cost !== undefined && record.cost > 0 && (
                        <div className="text-right border-l border-outline-variant/10 pl-4">
                          <p className="font-black text-secondary">R$ {formatNumber(record.cost, 2)}</p>
                          <p className="text-[10px] font-bold text-on-surface-variant uppercase">Custo</p>
                        </div>
                      )}
                      <div className="flex flex-col gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setEditingMaintenanceRecord(record)}
                          className="p-1.5 text-primary hover:bg-primary/10 rounded-lg"
                          title="Editar"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => setMaintenanceToDelete({ recordId: record.id, description: record.description })}
                          className="p-1.5 text-error hover:bg-error/10 rounded-lg"
                          title="Excluir"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {(!(selectedItemForMaintenance as any).maintenanceHistory || (selectedItemForMaintenance as any).maintenanceHistory.length === 0) && (
                  <div className="text-center py-8 text-on-surface-variant opacity-50 italic">
                    Nenhuma manutenção registrada no histórico.
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-8 border-t border-outline-variant/10 bg-surface-container-low shrink-0">
              <button onClick={() => setIsMaintenanceModalOpen(false)} className="w-full py-4 font-bold bg-surface-variant text-on-surface rounded-2xl transition-all">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {maintenanceToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-[2.5rem] w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-error/10 text-error rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={40} />
              </div>
              <h3 className="text-2xl font-headline font-black text-on-surface mb-2">Excluir Manutenção</h3>
              <p className="text-on-surface-variant font-medium mb-8">
                Tem certeza que deseja excluir a manutenção <span className="font-bold text-on-surface">"{maintenanceToDelete.description}"</span>?
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setMaintenanceToDelete(null)}
                  className="py-4 font-black text-xs uppercase tracking-widest bg-surface-container text-on-surface rounded-2xl active:scale-95 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmDeleteMaintenance}
                  className="py-4 font-black text-xs uppercase tracking-widest bg-error text-on-error rounded-2xl shadow-lg shadow-error/20 active:scale-95 transition-all"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-[2.5rem] w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-error/10 text-error rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={40} />
              </div>
              <h3 className="text-2xl font-headline font-black text-on-surface mb-2">Confirmar Exclusão</h3>
              <p className="text-on-surface-variant font-medium mb-8">
                Tem certeza que deseja excluir <span className="font-bold text-on-surface">"{showDeleteConfirm.name}"</span>? Esta ação não pode ser desfeita.
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

const Input = ({ label, ...props }: any) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest ml-1">{label}</label>
    <input 
      {...props} 
      onWheel={(e) => e.currentTarget.blur()}
      className="w-full bg-surface-container-highest border-none rounded-2xl py-3 px-4 text-on-surface font-medium focus:ring-2 focus:ring-primary transition-all" 
    />
  </div>
);

const Select = ({ label, children, ...props }: any) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest ml-1">{label}</label>
    <select {...props} className="w-full bg-surface-container-highest border-none rounded-2xl py-3 px-4 text-on-surface font-medium focus:ring-2 focus:ring-primary transition-all appearance-none">
      {children}
    </select>
  </div>
);
