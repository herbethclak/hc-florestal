import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, ArrowRight, Info, CheckCircle2, FileText, Map as MapIcon, User as UserIcon, Tractor as TractorIcon, Droplets, FlaskConical, Beaker, Plus, Trash2, Package, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Operator, Field, InputItem, Machine, Implement, OSData, OSInput, ActivityDefinition, ServiceOrder } from '../types';
import { format } from 'date-fns';
import html2pdf from 'html2pdf.js';
import { parseNumber } from '../constants';

import { ConfirmDialog } from './ConfirmDialog';

interface NewOSFlowProps {
  operators: Operator[];
  fields: Field[];
  inputs: InputItem[];
  machines: Machine[];
  implementsList: Implement[];
  activityDefinitions: ActivityDefinition[];
  onComplete: (data: OSData) => void;
  onCancel: () => void;
}

const formatNumber = (num: number, decimals: number = 2) => {
  return num.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
};

const formatQuantity = (value: number, unit: string) => {
  const isLitreOrKg = unit.toLowerCase() === 'l' || unit.toLowerCase() === 'kg';
  
  if (isLitreOrKg && value < 1 && value > 0) {
    const newValue = value * 1000;
    const newUnit = unit.toLowerCase() === 'l' ? 'ml' : 'g';
    return `${formatNumber(newValue, 0)} ${newUnit}`;
  }
  
  return `${formatNumber(value)} ${unit}`;
};

export const NewOSFlow: React.FC<NewOSFlowProps> = ({ 
  operators, 
  fields, 
  inputs, 
  machines, 
  implementsList,
  activityDefinitions,
  onComplete, 
  onCancel 
}) => {
  const [step, setStep] = useState(1);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isStockConfirmOpen, setIsStockConfirmOpen] = useState(false);
  const [pendingInput, setPendingInput] = useState<any>(null);
  const [osData, setOsData] = useState<OSData>(() => {
    const draft = localStorage.getItem('os_draft');
    if (draft) {
      try {
        localStorage.removeItem('os_draft');
        return JSON.parse(draft);
      } catch (e) {
        console.error('Error parsing OS draft', e);
      }
    }
    const saved = localStorage.getItem('last_os_data');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing saved OS data', e);
      }
    }
    return {
      activity: '',
      fieldId: '',
      machineId: '',
      implementId: '',
      operatorId: '',
      targetRate: 150,
      inputs: [],
      width: 24,
      testDistance: 50,
      nozzles: 48,
      spacingWidth: 3,
      spacingLength: 2,
      planningId: ''
    };
  });

  useEffect(() => {
    localStorage.setItem('last_os_data', JSON.stringify(osData));
  }, [osData]);

  const getIsSimpleActivity = () => {
    const activityDef = activityDefinitions.find(ad => ad.name === osData.activity);
    return !!activityDef?.isSimpleActivity;
  };

  const nextStep = () => {
    if (step === 1 && getIsSimpleActivity()) {
      setStep(4);
    } else {
      setStep(s => Math.min(s + 1, 4));
    }
  };
  const prevStep = () => {
    if (step === 4 && getIsSimpleActivity()) {
      setStep(1);
    } else {
      setStep(s => Math.max(s - 1, 1));
    }
  };

  const updateData = (key: keyof OSData, value: any) => {
    setOsData(prev => {
      const newData = { ...prev, [key]: value };
      
      // Clear inputs when activity changes to avoid carrying over inputs from previous activity
      if (key === 'activity' && value !== prev.activity) {
        newData.inputs = [];
      }

      // Auto-fill width, nozzles, tankCapacity and loadType when implement changes
      if (key === 'implementId') {
        const selectedImplement = implementsList.find(i => i.id === value);
        if (selectedImplement) {
          newData.width = selectedImplement.width;
          newData.nozzles = selectedImplement.nozzles;
          newData.loadType = selectedImplement.loadType || 'liquid';
          if (selectedImplement.tankCapacity) {
            newData.tankCapacity = selectedImplement.tankCapacity;
          }
        }
      }
      
      return newData;
    });
  };

  const confirmAddInput = (input: any, dose: number) => {
    const field = fields.find((f: any) => String(f.id) === String(osData.fieldId));
    const area = field?.area || 0;
    const totalNeeded = dose * area;
    
    const newInputs = [...osData.inputs, { 
      inputId: input.id, 
      name: input.name, 
      dose, 
      unit: input.unit,
      stockDeduction: totalNeeded
    }];
    updateData('inputs', newInputs);
    setIsStockConfirmOpen(false);
    setPendingInput(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-in fade-in slide-in-from-right-4 duration-500">
      {/* Progress Header */}
      <div className="mb-8">
        <div className="flex justify-between items-end mb-3">
          <div>
            <span className="text-primary font-bold font-headline text-sm tracking-tight uppercase">
              {step === 4 ? 'Etapa Final' : `Etapa 0${step}`}
            </span>
            <h2 className="text-2xl font-extrabold text-on-surface tracking-tight">
              {step === 1 && 'Nova OS - Identificação'}
              {step === 2 && 'Definição de Taxa e Insumos'}
              {step === 3 && 'Regulagem do Implemento'}
              {step === 4 && 'Resumo da Ordem de Serviço'}
            </h2>
          </div>
          <span className="text-on-surface-variant font-semibold text-sm">{step}/4</span>
        </div>
        <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-500 rounded-full" 
            style={{ width: `${(step / 4) * 100}%` }}
          ></div>
        </div>
      </div>

      {step === 1 && (
        <Step1 
          data={osData} 
          operators={operators} 
          fields={fields} 
          machines={machines} 
          implementsList={implementsList}
          activityDefinitions={activityDefinitions}
          updateData={updateData} 
          onNext={nextStep} 
          onCancel={onCancel} 
          onClear={() => setIsClearConfirmOpen(true)}
        />
      )}
      {step === 2 && (
        <Step2 
          data={osData} 
          allInputs={inputs} 
          fields={fields}
          activityDefinitions={activityDefinitions}
          updateData={updateData} 
          onNext={nextStep} 
          onPrev={prevStep} 
          onStockWarning={(input: any, dose: number, totalNeeded: number) => {
            setPendingInput({ input, dose, totalNeeded });
            setIsStockConfirmOpen(true);
          }}
        />
      )}
      {step === 3 && (
        <Step3 
          data={osData} 
          activityDefinitions={activityDefinitions}
          updateData={updateData} 
          onNext={nextStep} 
          onPrev={prevStep} 
        />
      )}
      {step === 4 && (
        <Step4 
          data={osData} 
          fields={fields}
          operators={operators}
          allInputs={inputs}
          activityDefinitions={activityDefinitions}
          onComplete={() => onComplete(osData)} 
          onPrev={prevStep} 
        />
      )}

      <ConfirmDialog 
        isOpen={isClearConfirmOpen}
        title="Limpar Campos?"
        message="Você realmente deseja limpar todos os campos preenchidos nesta Ordem de Serviço?"
        confirmLabel="Sim, Limpar"
        cancelLabel="Cancelar"
        onConfirm={() => {
          localStorage.removeItem('last_os_data');
          window.location.reload();
        }}
        onCancel={() => setIsClearConfirmOpen(false)}
      />

      <ConfirmDialog 
        isOpen={isStockConfirmOpen}
        title="Estoque Insuficiente"
        message={`Aviso: O estoque atual (${formatNumber(pendingInput?.input?.stock || 0)} ${pendingInput?.input?.unit}) é insuficiente para a dose selecionada (Necessário: ${formatNumber(pendingInput?.totalNeeded || 0)} ${pendingInput?.input?.unit}). Deseja adicionar mesmo assim?`}
        confirmLabel="Sim, Adicionar"
        cancelLabel="Voltar"
        onConfirm={() => confirmAddInput(pendingInput.input, pendingInput.dose)}
        onCancel={() => {
          setIsStockConfirmOpen(false);
          setPendingInput(null);
        }}
      />
    </div>
  );
};

const Step1 = ({ data, operators, fields, machines, implementsList, activityDefinitions, updateData, onNext, onCancel, onClear }: any) => {
  const selectedActivityDef = activityDefinitions.find((a: any) => a.name === data.activity);
  const isSimple = !!selectedActivityDef?.isSimpleActivity;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormCard label="Atividade" icon={<ChevronRight />}>
          <select 
            value={data.activity}
            onChange={(e) => updateData('activity', e.target.value)}
            className="appearance-none w-full bg-surface-container-highest border-none rounded-xl py-4 px-4 text-on-surface font-medium focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all"
          >
            <option disabled value="">Selecionar operação</option>
            {activityDefinitions.map((act: any) => (
              <option key={act.id} value={act.name}>{act.name}</option>
            ))}
          </select>
        </FormCard>

        <FormCard label="Talhão" icon={<MapIcon size={20} />}>
          <select 
            value={data.fieldId}
            onChange={(e) => updateData('fieldId', e.target.value)}
            className="appearance-none w-full bg-surface-container-highest border-none rounded-xl py-4 px-4 text-on-surface font-medium focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all"
          >
            <option disabled value="">Escolher local</option>
            {fields.map((f: any) => <option key={f.id} value={f.id}>{f.name} ({f.area}ha)</option>)}
          </select>
        </FormCard>

        <FormCard label="Máquina (Trator)" icon={<TractorIcon size={20} />}>
          <select 
            value={data.machineId}
            onChange={(e) => updateData('machineId', e.target.value)}
            className="appearance-none w-full bg-surface-container-highest border-none rounded-xl py-4 px-4 text-on-surface font-medium focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all"
          >
            <option disabled value="">Trator/Veículo</option>
            {machines.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </FormCard>

        <FormCard label="Implemento" icon={<Package size={20} />}>
          <select 
            value={data.implementId}
            disabled={isSimple}
            onChange={(e) => updateData('implementId', e.target.value)}
            className={`appearance-none w-full bg-surface-container-highest border-none rounded-xl py-4 px-4 text-on-surface font-medium focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all ${isSimple ? 'opacity-50' : ''}`}
          >
            <option disabled value="">{isSimple ? 'Não necessário' : 'Implemento acoplado'}</option>
            {implementsList.map((i: any) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </FormCard>

        <FormCard label="Operador" icon={<UserIcon size={20} />}>
          <select 
            value={data.operatorId}
            onChange={(e) => updateData('operatorId', e.target.value)}
            className="appearance-none w-full bg-surface-container-highest border-none rounded-xl py-4 px-4 text-on-surface font-medium focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all"
          >
            <option disabled value="">Responsável</option>
            {operators.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </FormCard>
      </div>

      <div className="pt-8 flex flex-col gap-4">
        <button 
          onClick={onNext}
          disabled={!data.activity || !data.fieldId || !data.machineId || (!isSimple && !data.implementId) || !data.operatorId}
          className="w-full bg-gradient-to-br from-primary to-primary-container text-on-primary py-5 rounded-2xl font-bold text-lg shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSimple ? 'Revisar OS' : 'Próximo Passo'} <ArrowRight size={20} />
        </button>
        <div className="flex gap-4">
          <button 
            onClick={onClear} 
            className="flex-1 text-on-surface-variant font-bold py-3 text-sm hover:underline"
          >
            Limpar dados
          </button>
          <button onClick={onCancel} className="flex-1 text-primary font-bold py-3 text-sm hover:underline">
            Cancelar e sair
          </button>
        </div>
      </div>
    </div>
  );
};

const Step2 = ({ data, allInputs, fields, activityDefinitions, updateData, onNext, onPrev, onStockWarning }: any) => {
  const [selectedInputId, setSelectedInputId] = useState('');
  const [doseInput, setDoseInput] = useState('');
  const [stockDeductionInput, setStockDeductionInput] = useState('');
  const [targetRateInput, setTargetRateInput] = useState(data.targetRate.toString());
  const [tankCapacityInput, setTankCapacityInput] = useState(data.tankCapacity?.toString() || '600');
  const [spacingWidthInput, setSpacingWidthInput] = useState(data.spacingWidth?.toString() || '3');
  const [spacingLengthInput, setSpacingLengthInput] = useState(data.spacingLength?.toString() || '2');

  useEffect(() => {
    setTankCapacityInput(data.tankCapacity?.toString() || '600');
  }, [data.tankCapacity]);

  useEffect(() => {
    const activityDef = activityDefinitions.find((a: any) => a.name === data.activity);
    if (activityDef?.unit === 'unit') {
      const w = parseNumber(spacingWidthInput);
      const l = parseNumber(spacingLengthInput);
      if (!isNaN(w) && !isNaN(l) && w > 0 && l > 0) {
        const rate = Math.round(10000 / (w * l));
        setTargetRateInput(rate.toString());
        updateData('targetRate', rate);
        updateData('spacingWidth', w);
        updateData('spacingLength', l);
      }
    }
  }, [spacingWidthInput, spacingLengthInput, data.activity]);

  useEffect(() => {
    if (!data.tankCapacity) {
      updateData('tankCapacity', 600);
    }
  }, []);

  const addInput = () => {
    const dose = parseNumber(doseInput);
    if (!selectedInputId || isNaN(dose) || dose <= 0) return;
    const input = allInputs.find((i: any) => String(i.id) === String(selectedInputId));
    if (!input) return;

    if (data.loadType === 'solid' && data.inputs.length >= 1) {
      toast.warning('Implementos sólidos (Distribuidor/Adubadora) permitem apenas um insumo por vez.');
      return;
    }

    const totalNeeded = dose * area;
    if (totalNeeded > input.stock) {
      onStockWarning(input, dose, totalNeeded);
      return;
    }
    
    const deduction = parseNumber(stockDeductionInput);
    
    const newInputs = [...data.inputs, { 
      inputId: input.id, 
      name: input.name, 
      dose, 
      unit: input.unit,
      stockDeduction: (stockDeductionInput === '' || isNaN(deduction) || deduction === 0) ? totalNeeded : deduction
    }];
    updateData('inputs', newInputs);
    setSelectedInputId('');
    setDoseInput('');
    setStockDeductionInput('');
  };

  const updateInputDeduction = (inputId: string, value: string) => {
    const num = parseNumber(value);
    if (isNaN(num)) return;
    const newInputs = data.inputs.map((i: any) => 
      i.inputId === inputId ? { ...i, stockDeduction: num } : i
    );
    updateData('inputs', newInputs);
  };

  const removeInput = (id: string) => {
    updateData('inputs', data.inputs.filter((i: any) => i.inputId !== id));
  };

  const field = fields.find((f: any) => String(f.id) === String(data.fieldId));
  const area = parseNumber(field?.area || 0);

  useEffect(() => {
    const dose = parseNumber(doseInput);
    if (!isNaN(dose) && area > 0) {
      setStockDeductionInput(formatNumber(dose * area));
    } else {
      setStockDeductionInput('');
    }
  }, [doseInput, area]);
  
  const activityDef = activityDefinitions.find((a: any) => a.name === data.activity);
  const activityUnit = activityDef?.unit || 'L';

  const selectedInput = allInputs.find((i: any) => String(i.id) === String(selectedInputId));
  const currentDose = parseNumber(doseInput);
  const totalNeeded = !isNaN(currentDose) && selectedInput ? currentDose * area : 0;
  const totalPreview = totalNeeded > 0 ? formatNumber(totalNeeded) : null;
  const isInsufficientStock = selectedInput && totalNeeded > selectedInput.stock;

  return (
    <div className="space-y-6">
      <section className="bg-surface-container-lowest p-6 rounded-3xl shadow-sm border border-outline-variant/10 flex flex-col lg:flex-row gap-8 items-center">
        <div className="flex-1 space-y-3">
          <div className="inline-flex items-center px-3 py-1 bg-tertiary-fixed text-on-tertiary-fixed-variant rounded-full text-[10px] font-black uppercase tracking-widest">
            Configuração da Receita
          </div>
          <p className="text-on-surface-variant text-sm leading-relaxed">
            {activityUnit === 'unit' 
              ? `Defina o espaçamento para calcular a densidade de plantio. A quantidade total de mudas é calculada com base na área do talhão (${area} ha).`
              : `Selecione os insumos e defina a dose por hectare. O volume total é calculado com base na área do talhão (${area} ha).`}
          </p>
        </div>
        <div className="w-full lg:w-auto grid grid-cols-1 sm:grid-cols-2 gap-4 shrink-0">
          {activityUnit === 'unit' && (
            <>
              <div className="relative w-full sm:w-44">
                <label className="absolute -top-2 left-3 px-1 bg-surface-container-lowest text-[10px] font-bold text-primary uppercase tracking-tighter z-10">
                  Espaçamento Entre Linhas (m)
                </label>
                <div className="flex items-center bg-surface-container-highest rounded-xl px-4 py-3 border-2 border-transparent focus-within:border-primary transition-all">
                  <input 
                    className="bg-transparent border-none focus:ring-0 w-full font-headline font-bold text-lg text-on-surface" 
                    type="text" 
                    inputMode="decimal"
                    value={spacingWidthInput} 
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) => setSpacingWidthInput(e.target.value)}
                  />
                  <span className="text-on-surface-variant font-semibold text-sm ml-2">m</span>
                </div>
              </div>
              <div className="relative w-full sm:w-44">
                <label className="absolute -top-2 left-3 px-1 bg-surface-container-lowest text-[10px] font-bold text-primary uppercase tracking-tighter z-10">
                  Espaçamento Entre Plantas (m)
                </label>
                <div className="flex items-center bg-surface-container-highest rounded-xl px-4 py-3 border-2 border-transparent focus-within:border-primary transition-all">
                  <input 
                    className="bg-transparent border-none focus:ring-0 w-full font-headline font-bold text-lg text-on-surface" 
                    type="text" 
                    inputMode="decimal"
                    value={spacingLengthInput} 
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) => setSpacingLengthInput(e.target.value)}
                  />
                  <span className="text-on-surface-variant font-semibold text-sm ml-2">m</span>
                </div>
              </div>
            </>
          )}
          {data.loadType !== 'none' && (
            <>
              <div className="relative w-full sm:w-44">
                <label className="absolute -top-2 left-3 px-1 bg-surface-container-lowest text-[10px] font-bold text-primary uppercase tracking-tighter z-10">
                  {data.loadType === 'solid' ? 'Taxa de Aplicação' : 'Taxa de Aplicação Alvo'}
                </label>
                <div className="flex items-center bg-surface-container-highest rounded-xl px-4 py-3 border-2 border-transparent focus-within:border-primary transition-all">
                  <input 
                    className="bg-transparent border-none focus:ring-0 w-full font-headline font-bold text-lg text-on-surface" 
                    type="text" 
                    inputMode="decimal"
                    value={targetRateInput} 
                    readOnly={activityUnit === 'unit'}
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) => {
                      if (activityUnit === 'unit') return;
                      const val = e.target.value;
                      setTargetRateInput(val);
                      const num = parseNumber(val);
                      if (!isNaN(num)) updateData('targetRate', num);
                    }}
                  />
                  <span className="text-on-surface-variant font-semibold text-sm ml-2">{activityUnit === 'unit' ? 'un/ha' : (data.loadType === 'solid' ? 'kg/ha' : `${activityUnit}/ha`)}</span>
                </div>
              </div>

              <div className="relative w-full sm:w-44">
                <label className="absolute -top-2 left-3 px-1 bg-surface-container-lowest text-[10px] font-bold text-secondary uppercase tracking-tighter z-10">
                  {data.loadType === 'solid' ? 'Capacidade da Caçamba' : 'Capacidade do Tanque'}
                </label>
                <div className="flex items-center bg-surface-container-highest rounded-xl px-4 py-3 border-2 border-transparent focus-within:border-secondary transition-all">
                  <input 
                    className="bg-transparent border-none focus:ring-0 w-full font-headline font-bold text-lg text-on-surface" 
                    type="text" 
                    inputMode="decimal"
                    value={tankCapacityInput} 
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTankCapacityInput(val);
                      const num = parseNumber(val);
                      if (!isNaN(num)) updateData('tankCapacity', num);
                    }}
                  />
                  <span className="text-on-surface-variant font-semibold text-sm ml-2">{activityUnit === 'unit' ? 'unidades' : (data.loadType === 'solid' ? 'kg' : 'L')}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <div className="flex justify-between items-center px-2">
            <h3 className="font-headline font-bold text-on-surface">Insumos Selecionados</h3>
          </div>
          
          <div className="bg-surface-container-low p-4 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
                <div className="sm:col-span-1">
                  <label className="block text-[10px] font-black text-on-surface-variant uppercase mb-1 ml-1">Insumo</label>
                  <select 
                    value={selectedInputId}
                    onChange={(e) => setSelectedInputId(e.target.value)}
                    className="w-full bg-surface-container-lowest border-none rounded-xl py-3 px-4 text-sm font-medium shadow-sm"
                  >
                    <option value="">Selecionar Insumo</option>
                    {allInputs.map((i: any) => (
                      <option key={i.id} value={i.id}>
                        {i.name} ({formatNumber(i.stock, 1)} {i.unit})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-on-surface-variant uppercase mb-1 ml-1">Dose ({selectedInput?.unit || 'L'}/ha)</label>
                  <input 
                    type="text" 
                    inputMode="decimal"
                    placeholder="0.00"
                    value={doseInput}
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) => setDoseInput(e.target.value)}
                    className={`w-full bg-surface-container-lowest border-none rounded-xl py-3 px-4 text-sm font-bold shadow-sm ${isInsufficientStock ? 'text-error' : ''}`}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-primary uppercase mb-1 ml-1">Retirada ({selectedInput?.unit || 'L'})</label>
                  <input 
                    type="text" 
                    inputMode="decimal"
                    placeholder="0.00"
                    value={stockDeductionInput}
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) => setStockDeductionInput(e.target.value)}
                    className="w-full bg-surface-container-lowest border-none rounded-xl py-3 px-4 text-sm font-bold text-primary shadow-sm"
                  />
                </div>
              </div>
              <button 
                onClick={addInput}
                title="Adicionar Insumo"
                className="bg-primary text-on-primary h-[44px] px-6 rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2 font-bold shadow-md whitespace-nowrap"
              >
                <Plus size={20} /> <span className="sm:hidden lg:inline">Inserir</span>
              </button>
            </div>

            {totalPreview && (
              <div className={`px-4 py-2 rounded-xl border flex justify-between items-center animate-in fade-in slide-in-from-top-1 ${isInsufficientStock ? 'bg-error/5 border-error/20' : 'bg-primary/5 border-primary/10'}`}>
                <div className="flex flex-col">
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${isInsufficientStock ? 'text-error' : 'text-primary'}`}>
                    Total Previsto para o Talhão:
                  </span>
                  {isInsufficientStock && (
                    <span className="text-[9px] font-black text-error uppercase">Estoque Insuficiente! Saldo: {selectedInput?.stock} {selectedInput?.unit}</span>
                  )}
                </div>
                <span className={`font-headline font-black ${isInsufficientStock ? 'text-error' : 'text-primary'}`}>
                  {totalPreview} {selectedInput?.unit}
                </span>
              </div>
            )}

            <div className="space-y-2">
              {data.inputs.map((input: any) => (
                <div key={input.inputId} className="bg-surface-container-lowest p-4 rounded-xl flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <FlaskConical size={18} className="text-tertiary" />
                    <div>
                      <p className="font-bold text-on-surface">{input.name}</p>
                      <p className="text-[10px] text-on-surface-variant font-bold uppercase">Dose: {formatNumber(input.dose)} {input.unit}/ha</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-headline font-extrabold text-on-surface-variant text-sm">{formatNumber(input.dose * area)} {input.unit}</p>
                      <p className="text-[9px] font-bold text-on-surface-variant uppercase">Total Planejado</p>
                    </div>
                    <div className="text-right">
                      <div className="relative">
                        <input 
                          type="text"
                          inputMode="decimal"
                          defaultValue={input.stockDeduction?.toString() || formatNumber(input.dose * area)}
                          onWheel={(e) => e.currentTarget.blur()}
                          onBlur={(e) => updateInputDeduction(input.inputId, e.target.value)}
                          className="w-24 bg-surface-container p-1 rounded text-right font-headline font-extrabold text-primary border-none focus:ring-1 focus:ring-primary"
                        />
                        <span className="text-[9px] font-bold text-primary uppercase block">Retirada ({input.unit})</span>
                      </div>
                    </div>
                    <button onClick={() => removeInput(input.inputId)} className="text-error opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-surface-container p-6 rounded-3xl space-y-6">
          <div className="text-[10px] font-black text-primary uppercase tracking-widest">Resumo de Carga</div>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-outline-variant/20">
              <span className="text-sm font-medium text-on-surface-variant">Volume Total</span>
              <span className="font-headline font-bold text-on-surface">{formatNumber(data.targetRate * area, 0)} {activityUnit}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-outline-variant/20">
              <span className="text-sm font-medium text-on-surface-variant">Área do Talhão</span>
              <span className="font-headline font-bold text-on-surface">{area} ha</span>
            </div>
          </div>
          <div className="bg-surface-container-highest p-4 rounded-xl flex items-center gap-3">
            <Info size={18} className="text-secondary" />
            <p className="text-[11px] text-on-surface-variant font-medium leading-tight">
              A vazão final será ajustada de acordo com os bicos na próxima etapa.
            </p>
          </div>
        </div>
      </div>

      <div className="pt-8 flex gap-4">
        <button onClick={onPrev} className="flex-1 bg-surface-container text-on-surface py-4 rounded-2xl font-bold transition-all">Voltar</button>
        <button 
          onClick={onNext} 
          disabled={data.inputs.length === 0}
          className="flex-[2] bg-primary text-on-primary py-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
        >
          Próximo Passo <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
};

const Step3 = ({ data, activityDefinitions, updateData, onNext, onPrev }: any) => {
  const [targetRateInput, setTargetRateInput] = useState(data.targetRate.toString());
  const [widthInput, setWidthInput] = useState(data.width.toString());
  const [testDistanceInput, setTestDistanceInput] = useState(data.testDistance.toString());

  const activityDef = activityDefinitions.find((a: any) => a.name === data.activity);
  const activityUnit = activityDef?.unit || 'L';
  const isSolid = data.loadType === 'solid';
  const isLiquid = isSolid ? false : (data.loadType === 'liquid' ? true : activityUnit === 'L');

  if (activityUnit === 'unit') {
    return (
      <div className="space-y-6">
        <div className="bg-surface-container-lowest p-12 rounded-3xl shadow-sm border border-outline-variant/10 flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
            <Beaker size={32} />
          </div>
          <h3 className="font-headline font-bold text-xl">Regulagem não necessária</h3>
          <p className="text-on-surface-variant max-w-md">
            Para atividades de plantio, a regulagem de bicos/vazão não se aplica. 
            Clique em "Próximo Passo" para revisar o resumo da OS.
          </p>
        </div>
        <div className="pt-8 flex gap-4">
          <button onClick={onPrev} className="flex-1 bg-surface-container text-on-surface py-4 rounded-2xl font-bold transition-all">Voltar</button>
          <button 
            onClick={onNext} 
            className="flex-[2] bg-primary text-on-primary py-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2"
          >
            Próximo Passo <ArrowRight size={20} />
          </button>
        </div>
      </div>
    );
  }

  // New calculation based on test distance:
  // Total Test Volume = (testDistance * width * targetRate) / 10000
  const totalTestVolume = (data.testDistance * data.width * data.targetRate) / 10000;
  const perNozzle = totalTestVolume / data.nozzles;
  const perNozzleSmall = perNozzle * 1000; // ml or g

  const labels = {
    targetRate: isLiquid ? 'Taxa Alvo (L/ha)' : 'Taxa Alvo (kg/ha)',
    nozzles: isLiquid ? 'Bicos' : 'Saídas',
    resultUnit: isLiquid ? 'ml/bico' : 'g/saída',
    totalUnit: isLiquid ? 'Litros' : 'Quilos',
    smallUnit: isLiquid ? 'ml' : 'g',
    mainUnit: isLiquid ? 'L' : 'kg'
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-7 space-y-4">
          <div className="bg-surface-container-lowest p-6 rounded-3xl shadow-sm border border-outline-variant/10">
            <h3 className="font-headline font-bold text-lg mb-6 flex items-center gap-2">
              <Beaker size={20} className="text-secondary" /> Parâmetros de Regulagem
            </h3>
            <div className="space-y-4">
              <div className="relative">
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1 ml-1">{labels.targetRate}</label>
                <input 
                  className="w-full bg-surface-container-highest border-none rounded-xl py-4 px-4 text-on-surface font-bold text-lg" 
                  type="text" 
                  inputMode="decimal"
                  value={targetRateInput}
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTargetRateInput(val);
                    const num = parseNumber(val);
                    if (!isNaN(num)) updateData('targetRate', num);
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1 ml-1">Largura Total (m)</label>
                  <input 
                    className="w-full bg-surface-container-highest border-none rounded-xl py-4 px-4 text-on-surface font-bold" 
                    type="text" 
                    inputMode="decimal"
                    value={widthInput}
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) => {
                      const val = e.target.value;
                      setWidthInput(val);
                      const num = parseNumber(val);
                      if (!isNaN(num)) updateData('width', num);
                    }}
                  />
                </div>
                <div className="relative">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1 ml-1">Distância de Teste (m)</label>
                  <input 
                    className="w-full bg-surface-container-highest border-none rounded-xl py-4 px-4 text-on-surface font-bold" 
                    type="text" 
                    inputMode="decimal"
                    value={testDistanceInput}
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTestDistanceInput(val);
                      const num = parseNumber(val);
                      if (!isNaN(num)) updateData('testDistance', num);
                    }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1 ml-1">{labels.nozzles}</label>
                <div className="flex items-center bg-surface-container-highest rounded-xl p-1">
                  <button 
                    onClick={() => updateData('nozzles', Math.max(1, data.nozzles - 1))}
                    className="w-12 h-12 flex items-center justify-center text-primary hover:bg-surface-container rounded-lg transition-colors"
                  >
                    -
                  </button>
                  <input 
                    className="flex-grow bg-transparent border-none text-center font-headline font-bold text-lg focus:ring-0" 
                    type="number" 
                    value={data.nozzles}
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) => updateData('nozzles', parseInt(e.target.value))}
                  />
                  <button 
                    onClick={() => updateData('nozzles', data.nozzles + 1)}
                    className="w-12 h-12 flex items-center justify-center text-primary hover:bg-surface-container rounded-lg transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="md:col-span-5">
          <div className="bg-primary text-on-primary p-8 rounded-[2.5rem] shadow-xl flex flex-col justify-between h-full relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
            <div className="relative z-10">
              <h4 className="font-headline font-medium opacity-80">{isLiquid ? 'Volume' : 'Peso'} esperado por {isLiquid ? 'bico' : 'saída'}:</h4>
              <div className="flex items-baseline gap-2 mt-4">
                <span className="text-6xl font-black tracking-tighter">{formatNumber(perNozzleSmall, 0)}</span>
                <span className="text-xl font-bold">{labels.resultUnit}</span>
              </div>
              <p className="text-xs mt-2 opacity-70">
                Total para o teste: <span className="font-bold">{formatNumber(totalTestVolume)} {labels.mainUnit}</span>
              </p>
            </div>
            <div className="relative z-10 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 mt-8">
              <p className="text-xs font-bold uppercase tracking-widest mb-1">Status da Regulagem</p>
              <p className="text-[10px] opacity-80">
                Meça a uma distância de {data.testDistance}m para validar a vazão real.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-8 flex gap-4">
        <button onClick={onPrev} className="flex-1 bg-surface-container text-on-surface py-4 rounded-2xl font-bold transition-all">Voltar</button>
        <button onClick={onNext} className="flex-[2] bg-primary text-on-primary py-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2">
          Validar e Continuar <CheckCircle2 size={20} />
        </button>
      </div>
    </div>
  );
};

const Step4 = ({ data, fields, operators, allInputs, activityDefinitions, onComplete, onPrev }: any) => {
  const osRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const field = fields.find((f: any) => String(f.id) === String(data.fieldId));
  const operator = operators.find((o: any) => String(o.id) === String(data.operatorId));
  const fieldArea = parseNumber(field?.area || 0);
  const totalVolume = data.targetRate * fieldArea;
  
  const tankCapacity = data.tankCapacity || 600;
  const areaPerTank = tankCapacity / data.targetRate;
  const totalTanks = totalVolume / tankCapacity;
  
  const activityDef = activityDefinitions.find((a: any) => a.name === data.activity);
  const isSimple = !!activityDef?.isSimpleActivity;
  const activityUnit = activityDef?.unit || 'L';
  const isSolid = data.loadType === 'solid';
  const isLiquid = isSolid ? false : (data.loadType === 'liquid' ? true : activityUnit === 'L');

  // Estimated time calculation
  let estimatedTimeText = '';
  if (activityDef?.dailyGoal && activityDef.dailyGoal > 0) {
    // If goal is hectares per day, use area. If it's units/volume per day, use volume.
    // Heuristic: if goal is > 50, it's likely volume/units. If <= 50, likely hectares.
    // However, better is to check if it's a simple activity or if it's planting.
    const isVolumeBased = (activityUnit === 'L' || activityUnit === 'kg') && activityDef.dailyGoal > 50;
    const estimatedDays = isVolumeBased 
      ? totalVolume / activityDef.dailyGoal 
      : fieldArea / activityDef.dailyGoal;

    if (estimatedDays >= 1) {
      estimatedTimeText = `${formatNumber(estimatedDays, 1)} dias`;
    } else {
      // If less than a day, show in hours (assuming 8h work day)
      const totalHours = estimatedDays * 8;
      const h = Math.floor(totalHours);
      const m = Math.round((totalHours - h) * 60);
      estimatedTimeText = h > 0 ? `${h}h ${m}min` : `${m}min`;
    }
  } else {
    // Fallback to speed-based calculation if no daily goal is set
    const haPerHour = (6.5 * data.width) / 10;
    const estimatedHours = (field?.area || 0) / haPerHour;
    const h = Math.floor(estimatedHours);
    const m = Math.round((estimatedHours - h) * 60);
    estimatedTimeText = `${h}h ${m}min`;
  }

  // Calibration Info
  const totalTestVolume = (data.testDistance * data.width * data.targetRate) / 10000;
  const perNozzle = totalTestVolume / data.nozzles;
  const perNozzleSmall = perNozzle * 1000;

  const handleDownloadPDF = async () => {
    if (!osRef.current) return;
    
    setIsGenerating(true);
    
    const element = osRef.current;
    const opt = {
      margin: 5,
      filename: `OS_${field?.name || 'Forestry'}_${format(new Date(), 'yyyy-MM-dd')}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false, letterRendering: true, windowWidth: 800 },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
      pagebreak: { mode: 'avoid-all' }
    };

    try {
      await html2pdf().set(opt).from(element).save();
      // Finalize OS after download
      await handleComplete();
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Ocorreu um erro ao gerar o PDF. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleComplete = async () => {
    setIsGenerating(true);
    try {
      await onComplete(data);
    } catch (error) {
      console.error('Error creating OS:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const currentDate = new Date().toLocaleString('pt-BR');

  return (
    <div className="space-y-6 printable-os-container">
      <div ref={osRef} className="bg-surface-container-lowest p-8 rounded-3xl shadow-sm border border-outline-variant space-y-4 printable-os">
        <div className="flex items-center justify-between mb-2 no-print">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="text-primary" />
            <h3 className="font-headline font-extrabold text-xl">Resumo da OS Florestal</h3>
          </div>
        </div>

        {/* Top Highlights Summary */}
        <div className="grid grid-cols-4 gap-3">
          {!isSimple && (
            <div className="bg-primary/5 p-3 rounded-2xl border border-primary/10 text-center">
              <p className="text-[10px] font-bold text-primary uppercase tracking-tighter mb-1">
                {activityUnit === 'unit' ? 'TAXA DE PLANTIO' : 'TAXA DE APLICAÇÃO'}
              </p>
              <p className="text-lg font-black text-on-surface leading-none">
                {formatNumber(data.targetRate)} 
              </p>
              <p className="text-[10px] font-medium opacity-70 mt-1 uppercase">{activityUnit === 'unit' ? 'mudas/ha' : `${activityUnit}/ha`}</p>
            </div>
          )}
          <div className="bg-secondary/5 p-3 rounded-2xl border border-secondary/10 text-center">
            <p className="text-[10px] font-bold text-secondary uppercase tracking-tighter mb-1">ÁREA TOTAL</p>
            <p className="text-lg font-black text-on-surface leading-none">
              {formatNumber(fieldArea)} 
            </p>
            <p className="text-[10px] font-medium opacity-70 mt-1 uppercase">ha</p>
          </div>
          {!isSimple && (
            <div className="bg-tertiary/5 p-3 rounded-2xl border border-tertiary/10 text-center">
              <p className="text-[10px] font-bold text-tertiary uppercase tracking-tighter mb-1">
                VOLUME TOTAL
              </p>
              <p className="text-lg font-black text-on-surface leading-none">
                {formatNumber(totalVolume, 0)} 
              </p>
              <p className="text-[10px] font-medium opacity-70 mt-1 uppercase">{activityUnit === 'unit' ? 'mudas' : (data.loadType === 'solid' ? 'kg' : activityUnit)}</p>
            </div>
          )}
          {!isSimple && (
            <div className="bg-surface-container p-3 rounded-2xl border border-outline-variant/20 text-center">
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter mb-1">TEMPO EST.</p>
              <p className="text-lg font-black text-on-surface leading-none">
                {estimatedTimeText.split(' ')[0]}
              </p>
              <p className="text-[10px] font-medium opacity-70 mt-1 uppercase">{estimatedTimeText.split(' ').slice(1).join(' ')}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-8">
          {/* Section 1: Basic Info & Calibration */}
          <div className="space-y-3">
            <p className="text-[11px] font-black text-primary uppercase tracking-widest border-b-2 border-primary/20 pb-2">Informações Gerais</p>
            <div className="space-y-2">
              <SummaryRow label="Talhão" value={field?.name || 'N/A'} primary large />
              <SummaryRow label="Atividade" value={data.activity} large />
              <SummaryRow label="Operador" value={operator?.name || 'N/A'} large />
            </div>
          </div>

          {!isSimple && activityUnit !== 'unit' && (
            <div className="space-y-3">
              <p className="text-[11px] font-black text-primary uppercase tracking-widest border-b-2 border-primary/20 pb-2">Parâmetros de Regulagem</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                <SummaryRow label="Largura" value={`${formatNumber(data.width)} m`} />
                <SummaryRow label="Dist. Teste" value={`${formatNumber(data.testDistance)} m`} />
                <SummaryRow label={isLiquid ? "Bicos" : "Saídas"} value={formatNumber(data.nozzles, 0)} />
                <SummaryRow label={isLiquid ? "V/Bico" : "Peso/Saída"} value={`${formatNumber(perNozzleSmall, 0)} ${isLiquid ? 'ml' : 'g'}`} />
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Inputs */}
        {!isSimple && data.inputs.length > 0 && (
          <div className="space-y-3">
            <p className="text-[11px] font-black text-primary uppercase tracking-widest border-b-2 border-primary/20 pb-2">Insumos Necessários</p>
            <div className="bg-surface-container-low rounded-3xl p-6 border border-outline-variant/20">
              <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                {data.inputs.map((i: any) => {
                  const currentInput = allInputs.find(ai => String(ai.id) === String(i.inputId));
                  const totalNeeded = i.dose * fieldArea;
                  const perTank = i.dose * areaPerTank;
                  const isLow = currentInput && totalNeeded > currentInput.stock;
                  
                  return (
                    <div key={i.inputId} className={`flex flex-col py-2 border-b border-outline-variant/30 last:border-0 ${isLow ? 'text-error' : ''}`}>
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-sm font-black ${isLow ? 'text-error' : 'text-on-surface'}`}>{i.name}</span>
                        <div className="text-right">
                          <p className={`text-base font-black ${isLow ? 'text-error' : 'text-primary'}`}>{formatQuantity(totalNeeded, i.unit === 'unit' ? 'mudas' : i.unit)}</p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-bold text-on-surface-variant uppercase">
                        <span>Dose: {formatQuantity(i.dose, i.unit === 'unit' ? 'mudas' : i.unit)}/ha</span>
                        {data.loadType !== 'none' && (
                          <span className="text-secondary font-black">
                            {data.loadType === 'solid' ? 'Na Caçamba' : 'No Tanque'}: {formatQuantity(perTank, i.unit)}
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

        {/* Section 3: Load Summary */}
        {!isSimple && data.loadType !== 'none' && (
          <div className="space-y-3 bg-primary/5 p-6 rounded-3xl border border-primary/10">
            <p className="text-[11px] font-black text-primary uppercase tracking-widest border-b-2 border-primary/20 pb-2 flex items-center gap-2">
              <Droplets size={16} /> Resumo de Operação
            </p>
            <div className="grid grid-cols-4 gap-6">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase">Capacidade</p>
                <p className="text-base font-black text-on-surface">{tankCapacity} {data.loadType === 'solid' ? 'kg' : 'L'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase">Rendimento</p>
                <p className="text-base font-black text-on-surface">{formatNumber(areaPerTank, 2)} ha/cargas</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase">Operações</p>
                <p className="text-base font-black text-on-surface">{formatNumber(totalTanks, 1)} viagens</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-primary uppercase">Volume Total</p>
                <p className="text-lg font-black text-primary">{formatNumber(totalVolume, 0)} {data.loadType === 'solid' ? 'kg' : activityUnit}</p>
              </div>
            </div>
          </div>
        )}

        <div className="pt-8 border-t-2 border-gray-100 flex justify-center">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fim do Resumo</p>
        </div>
      </div>

      <div className="pt-8 flex flex-col sm:flex-row gap-4 no-print">
        <button 
          onClick={onPrev}
          className="flex-1 bg-surface-container text-on-surface py-5 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          Voltar
        </button>
        <button 
          onClick={handleDownloadPDF}
          disabled={isGenerating}
          className="flex-1 bg-primary text-on-primary py-5 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
        >
          {isGenerating ? 'Processando...' : <><Download size={20} /> Baixar PDF e Finalizar</>}
        </button>
        <button onClick={handleComplete} disabled={isGenerating} className="flex-1 bg-surface-container text-on-surface py-5 rounded-2xl font-bold shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50">
          {isGenerating ? 'Salvando...' : 'Finalizar OS'} <CheckCircle2 size={20} />
        </button>
      </div>
    </div>
  );
};

const FormCard = ({ label, icon, children }: { label: string, icon: React.ReactNode, children: React.ReactNode }) => (
  <section className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/5">
    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3">{label}</label>
    <div className="relative">
      {children}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">
        {icon}
      </div>
    </div>
  </section>
);

const SummaryRow = ({ label, value, primary, large }: any) => (
  <div className={`flex justify-between items-end border-b border-outline-variant pb-1 gap-4 ${large ? 'py-2' : ''}`}>
    <span className={`${large ? 'text-xs' : 'text-[11px]'} font-medium text-on-surface-variant whitespace-nowrap`}>{label}</span>
    <span className={`font-headline font-bold ${large ? 'text-sm' : 'text-xs'} ${primary ? 'text-primary' : ''}`}>{value}</span>
  </div>
);
