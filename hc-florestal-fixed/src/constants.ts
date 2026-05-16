import { LucideIcon } from 'lucide-react';
import { 
  LayoutDashboard, 
  BrainCircuit, 
  PlusCircle, 
  CalendarDays, 
  ClipboardCheck 
} from 'lucide-react';

export const parseNumber = (value: string | number): number => {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  
  let valStr = value.toString().trim();
  
  // Handle both comma and dot as decimal separators
  if (valStr.includes(',')) {
    // If it has a comma, it's likely Brazilian format: 1.234,56
    valStr = valStr.replace(/\./g, '').replace(',', '.');
  } else {
    // If it only has dots, check if it's likely thousands or decimals
    const parts = valStr.split('.');
    if (parts.length > 2) {
      // Multiple dots: 1.234.567 -> 1234567
      valStr = valStr.replace(/\./g, '');
    }
    // If only one dot, we treat it as decimal (e.g., 1.5 or 1.500)
    // We avoid the 3-digit heuristic as it breaks precision inputs (e.g. 1.500)
  }
  
  const result = parseFloat(valStr);
  return isNaN(result) ? 0 : result;
};

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
  { id: 'resources', label: 'Recursos', icon: BrainCircuit },
  { id: 'new-os', label: 'Nova OS', icon: PlusCircle },
  { id: 'planning', label: 'Planejamento', icon: CalendarDays },
  { id: 'activities', label: 'Atividades', icon: ClipboardCheck },
];
