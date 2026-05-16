/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'manager' | 'operator';
  photoURL?: string;
  createdAt: string;
}

export interface Weather {
  temp: number;
  condition: string;
  humidity: number;
  windSpeed: number;
}

export interface ActivityCategory {
  id: string;
  name: string;
  icon?: string;
}

export interface ActivityDefinition {
  id: string;
  name: string;
  category: string;
  unit: 'L' | 'kg' | 'unit';
  dailyGoal?: number; // L/day or kg/day
  description?: string;
  bonusValue?: number;
  bonusUnit?: 'ha' | 'hour';
  isSimpleActivity?: boolean;
  followUpInterval?: number; // Days until next application
}

export interface Activity {
  id: string;
  type: string;
  title: string;
  location: string;
  machine: string;
  progress: number;
  estimatedTime?: string;
  status?: string;
}

export interface ProductionBonus {
  id: string;
  osId: string;
  date: string;
  activityName: string;
  fieldName: string;
  fieldArea: number;
  performedArea: number;
  paidArea: number;
  bonusValue: number;
  bonusUnit: 'ha' | 'hour';
  totalBonus: number;
}

export interface Attendance {
  id: string;
  date: string;
  workerId: string; // References Operator ID
  workerName: string;
  status: 'present' | 'absent' | 'leave';
  osId?: string; // Optional activity allocation
  activityName?: string;
  fieldName?: string;
  notes?: string;
}

export interface Operator {
  id: string;
  name: string;
  specialty: string;
  experience: string;
  status: 'Active' | 'Inactive' | 'Ativo' | 'Inativo';
  avatar: string;
  productionHistory?: ProductionBonus[];
  deletedProductionIds?: string[];
}

export interface Field {
  id: string;
  name: string;
  area: number;
  geneticMaterial: string; 
  image: string;
  plantingDate?: string;
  status?: string;
}

export interface InputItem {
  id: string;
  name: string;
  activeIngredient: string;
  type: string;
  brand: string;
  stock: number;
  minStock: number;
  unit: string;
}

export interface MaintenanceRecord {
  id: string;
  date: string;
  hours: number;
  description: string;
  type: 'preventive' | 'corrective';
  cost?: number;
}

export interface Machine {
  id: string;
  name: string;
  modelId: string;
  hours: number;
  lastRevisionHours?: number;
  revisionInterval?: number;
  maintenanceHistory?: MaintenanceRecord[];
  lastMaintenance: string;
  location: string;
  image: string;
  status: 'In Operation' | 'Maintenance' | 'Available' | 'Em Operação' | 'Manutenção' | 'Disponível';
}

export interface Implement {
  id: string;
  name: string;
  type: string;
  brand: string;
  width: number;
  nozzles: number;
  tankCapacity?: number;
  loadType?: 'liquid' | 'solid' | 'none';
  status: 'Available' | 'In Use' | 'Maintenance' | 'Disponível' | 'Em Uso' | 'Manutenção';
  location?: string;
  image: string;
}

export interface OSInput {
  inputId: string;
  name: string;
  inputName?: string;
  dose: number; // L/ha or kg/ha
  unit: string;
  stockDeduction?: number; // Manual deduction amount
}

export interface OSData {
  activity: string;
  fieldId: string;
  machineId: string;
  implementId: string;
  operatorId: string;
  targetRate: number;
  inputs: OSInput[];
  width: number;
  testDistance: number;
  nozzles: number;
  tankCapacity?: number;
  loadType?: 'liquid' | 'solid' | 'none';
  spacingWidth?: number;
  spacingLength?: number;
  planningId?: string;
}

export interface ServiceOrder {
  id: string;
  fieldId: string;
  operatorId: string;
  activity: string;
  targetRate: number;
  totalPlannedVolume: number;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
  completedAt?: string;
  totalApplied?: number;
  deviation?: number;
  inputs: OSInput[];
  machineId: string;
  implementId: string;
  width: number;
  testDistance: number;
  nozzles: number;
  tankCapacity?: number;
  loadType?: 'liquid' | 'solid' | 'none';
  spacingWidth?: number;
  spacingLength?: number;
  planningId?: string;
  fieldName?: string;
  fieldArea?: number;
  operatorName?: string;
  machineName?: string;
  implementName?: string;
}

export interface DailyLog {
  id: string;
  osId: string;
  date: string;
  amount: number;
  operatorId: string;
  horimetroInicial?: number;
  horimetroFinal?: number;
  performedArea?: number;
  helpers?: string[]; // IDs or names of additional collaborators
}

export interface PlanningInput {
  inputId: string;
  dose: number;
}

export interface PlanningItem {
  fieldId: string;
  inputs: PlanningInput[];
  area?: number;
}

export interface Planning {
  id: string;
  name: string;
  activityId: string;
  items: PlanningItem[];
  dailyGoal: number; // ha/day
  status: 'draft' | 'active' | 'completed';
  createdAt: string;
}

export interface CycleStep {
  planningId: string;
  activityName: string;
  order: number;
  expectedDays: number;
  status: 'pending' | 'in_progress' | 'completed' | 'delayed';
  startDate?: string;
  endDate?: string;
}

export interface ProductionCycle {
  id: string;
  name: string;
  fieldIds: string[];
  steps: CycleStep[];
  status: 'active' | 'completed' | 'delayed';
  createdAt: string;
}

export interface StockMovement {
  id: string;
  inputId: string;
  type: 'entry' | 'exit' | 'os_deduction';
  amount: number;
  date: string;
  invoiceNumber?: string; // NF
  recipient?: string; // Who received/used (Operator)
  location?: string; // Where it was used (Field)
  description?: string;
}
