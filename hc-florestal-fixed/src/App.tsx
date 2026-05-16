/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc, setDoc, getDocs, writeBatch, where, getDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { parseNumber } from './constants';
import { TopBar } from './components/TopBar';
import { BottomNav } from './components/BottomNav';
import { Dashboard } from './components/Dashboard';
import { NewOSFlow } from './components/NewOSFlow';
import { Resources } from './components/Resources';
import { Activities } from './components/Activities';
import { PlanningComponent } from './components/Planning';
import { Login } from './components/Login';
import { UserManagement } from './components/UserManagement';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ConfirmDialog } from './components/ConfirmDialog';
import { Weather, Activity, Operator, Field, InputItem, Machine, Implement, ActivityDefinition, StockMovement, ServiceOrder, DailyLog, ActivityCategory, Planning, UserProfile, OSData, ProductionCycle } from './types';

/** Normaliza o campo osId de logs legados que usavam os_id */
const getLogOsId = (log: DailyLog): string => log.osId || (log as any).os_id || '';

const MOCK_WEATHER: Weather = {
  temp: 24,
  condition: 'Céu Limpo',
  humidity: 42,
  windSpeed: 12,
};

const INITIAL_CATEGORIES: ActivityCategory[] = [
  { id: 'pre_planting', name: 'Pré-Plantio', icon: 'Microscope' },
  { id: 'ant_control', name: 'Combate a Formiga', icon: 'Bug' },
  { id: 'planting', name: 'Plantio', icon: 'Sprout' },
  { id: 'spray', name: 'Pulverização', icon: 'Droplets' },
  { id: 'harvest', name: 'Colheita Florestal', icon: 'Trees' },
  { id: 'other', name: 'Outros', icon: 'LayoutGrid' },
];

const INITIAL_OPERATORS: Operator[] = [
  {
    id: '1',
    name: 'João Silva',
    specialty: 'Combate a Formiga',
    experience: '8 Anos',
    status: 'Ativo',
    avatar: 'https://picsum.photos/seed/op1/200/200',
  },
  {
    id: '2',
    name: 'Ricardo Santos',
    specialty: 'Operador de Harvester',
    experience: '5 Anos',
    status: 'Ativo',
    avatar: 'https://picsum.photos/seed/op2/200/200',
  },
];

const INITIAL_FIELDS: Field[] = [
  {
    id: 'T12',
    name: 'Talhão 12 - Norte',
    area: 120,
    geneticMaterial: 'Eucalyptus grandis',
    image: 'https://picsum.photos/seed/forest1/400/200',
  },
  {
    id: 'T04',
    name: 'Talhão 04 - Sul',
    area: 45,
    geneticMaterial: 'Pinus taeda',
    image: 'https://picsum.photos/seed/forest2/400/200',
  },
];

const INITIAL_INPUTS: InputItem[] = [
  {
    id: '1',
    name: 'Isca Mirex',
    activeIngredient: 'Sulfluramida',
    type: 'Inseticida',
    brand: 'Atta-Kill',
    stock: 500,
    minStock: 100,
    unit: 'kg',
  },
  {
    id: '2',
    name: 'Glifosato Florestal',
    activeIngredient: 'Glifosato',
    type: 'Herbicida',
    brand: 'Monsanto',
    stock: 1200,
    minStock: 200,
    unit: 'L',
  },
];

const INITIAL_MACHINES: Machine[] = [
  {
    id: '1',
    name: 'Trator Valtra A950',
    modelId: 'VAL-2023-01',
    hours: 1240,
    lastMaintenance: '2023-10-15',
    location: 'Talhão 12',
    image: 'https://picsum.photos/seed/tractor1/400/200',
    status: 'Em Operação',
  },
  {
    id: 'MANUAL',
    name: 'Equipe de Campo (Manual)',
    modelId: 'MAN-001',
    hours: 0,
    lastMaintenance: '-',
    location: 'Sede',
    image: 'https://picsum.photos/seed/manual-work/400/200',
    status: 'Disponível',
  },
];

const INITIAL_IMPLEMENTS: Implement[] = [
  {
    id: '1',
    name: 'Pulverizador Jacto 2000',
    type: 'Pulverizador',
    brand: 'Jacto',
    width: 24,
    nozzles: 48,
    status: 'Disponível',
    image: 'https://picsum.photos/seed/sprayer/400/200',
  },
  {
    id: 'MANUAL',
    name: 'Equipamento Manual / Costal',
    type: 'Manual',
    brand: 'Genérica',
    width: 1,
    nozzles: 1,
    status: 'Disponível',
    image: 'https://picsum.photos/seed/hand-tool/400/200',
  },
];

const INITIAL_ACTIVITY_DEFINITIONS: ActivityDefinition[] = [
  { id: '1', name: 'Combate a Formiga', category: 'ant_control', unit: 'kg', dailyGoal: 500 },
  { id: '2', name: 'Plantio', category: 'planting', unit: 'unit', dailyGoal: 1000 },
  { id: '3', name: 'Pulverização (Pré-emergente)', category: 'spray', unit: 'L', dailyGoal: 2000, followUpInterval: 30 },
  { id: '4', name: 'Colheita Florestal', category: 'harvest', unit: 'L', dailyGoal: 1500 },
  { id: '5', name: 'Adubação de Plantio', category: 'planting', unit: 'kg', dailyGoal: 1500 },
];

const USER_AVATAR = "https://picsum.photos/seed/manager/200/200";

const REGIONS = [
  { name: 'Serrana, SP', lat: -21.21, lon: -47.59 },
  { name: 'Três Lagoas, MS', lat: -20.78, lon: -51.70 },
  { name: 'Telemaco Borba, PR', lat: -24.32, lon: -50.61 },
  { name: 'Aracruz, ES', lat: -19.82, lon: -40.27 },
];

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isNewOSActive, setIsNewOSActive] = useState(false);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [allDailyLogs, setAllDailyLogs] = useState<DailyLog[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [inputs, setInputs] = useState<InputItem[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [implementsList, setImplementsList] = useState<Implement[]>([]);
  const [activityDefinitions, setActivityDefinitions] = useState<ActivityDefinition[]>([]);
  const [activityCategories, setActivityCategories] = useState<ActivityCategory[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [plannings, setPlannings] = useState<Planning[]>([]);
  const [productionCycles, setProductionCycles] = useState<ProductionCycle[]>([]);
  const [weather, setWeather] = useState<Weather>(MOCK_WEATHER);
  const [region, setRegion] = useState(REGIONS[0]);
  const [farmName, setFarmName] = useState('Unidade Refloresta');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isResetSecondConfirmOpen, setIsResetSecondConfirmOpen] = useState(false);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

        const response = await fetch(`/api/weather?lat=${region.lat}&lon=${region.lon}`, {
          signal: controller.signal,
          headers: {
            'Connection': 'close'
          }
        });
        
        clearTimeout(timeoutId);
        
        // Check if response is JSON
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          // If not JSON, maybe try direct fetch from client as fallback
          const directController = new AbortController();
          const directTimeoutId = setTimeout(() => directController.abort(), 8000);

          const directResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${region.lat}&longitude=${region.lon}&current_weather=true&hourly=relativehumidity_2m`, {
            signal: directController.signal,
            headers: {
              'Connection': 'close'
            }
          });
          
          clearTimeout(directTimeoutId);
          const data = await directResponse.json();
          processWeatherData(data);
          return;
        }

        const data = await response.json();
        processWeatherData(data);
      } catch (error) {
        console.error('Error fetching weather:', error);
      }
    };

    const processWeatherData = (data: any) => {
      if (data.current_weather) {
        const getWeatherCondition = (code: number) => {
          if (code === 0) return 'Céu Limpo';
          if (code <= 3) return 'Parcialmente Nublado';
          if (code <= 48) return 'Nevoeiro';
          if (code <= 67) return 'Chuva Leve';
          if (code <= 82) return 'Chuva Forte';
          if (code <= 99) return 'Tempestade';
          return 'Instável';
        };

        setWeather({
          temp: Math.round(data.current_weather.temperature),
          condition: getWeatherCondition(data.current_weather.weathercode),
          humidity: data.hourly?.relativehumidity_2m?.[0] || 45,
          windSpeed: Math.round(data.current_weather.windspeed),
        });
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 300000); // 5 mins
    return () => clearInterval(interval);
  }, [region]);

  const dashboardActivities: Activity[] = serviceOrders
    .filter(os => os.status === 'active')
    .map(os => {
      const field = fields.find(f => f.id === os.fieldId);
      const machine = machines.find(m => m.id === os.machineId);
      const implement = implementsList.find(i => i.id === os.implementId);
      const activityDef = activityDefinitions.find(a => a.name === os.activity);
      const logs = allDailyLogs.filter(log => getLogOsId(log) === os.id);
      const totalApplied = logs.reduce((sum, log) => sum + log.amount, 0);
      const totalHours = logs.reduce((sum, log) => sum + (log.horimetroFinal || (log as any).horimetro_final || 0) - (log.horimetroInicial || (log as any).horimetro_inicial || 0), 0);
      const progress = os.totalPlannedVolume > 0 
        ? Math.min(100, Math.round((totalApplied / os.totalPlannedVolume) * 100))
        : 0;

      return {
        id: os.id,
        type: (activityDef?.category || 'other') as any,
        title: os.activity,
        location: os.fieldName || field?.name || 'N/A',
        machine: `${os.machineName || machine?.name || 'N/A'} + ${os.implementName || implement?.name || 'N/A'}`,
        progress,
        status: progress === 100 ? 'Finalizando' : undefined,
        estimatedTime: totalHours > 0 ? `${totalHours.toFixed(1)}h acumuladas` : 'Iniciando'
      };
    });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (!user) {
        setUserProfile(null);
        setUsers([]);
        setIsAuthReady(true);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    let unsubProfile = () => {};

    const setupProfile = async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        let profile: UserProfile | null = null;
        
        // 1. Try to get by UID first (most efficient and secure)
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          profile = { ...userDoc.data(), uid: user.uid } as UserProfile;
          // Update photo and name if changed
          await updateDoc(userRef, {
            photoURL: user.photoURL || profile.photoURL,
            displayName: user.displayName || profile.displayName
          });
        } else {
          // 2. Try to search by email (for pending invites)
          try {
            const userSnap = await getDocs(query(collection(db, 'users'), where('email', '==', user.email)));
            if (!userSnap.empty) {
              const existingDoc = userSnap.docs[0];
              profile = { ...existingDoc.data(), uid: user.uid } as UserProfile;
              // Migrate document to UID if it wasn't already
              if (existingDoc.id !== user.uid) {
                await deleteDoc(doc(db, 'users', existingDoc.id));
                await setDoc(userRef, profile);
              }
            }
          } catch (e) {
            console.warn('Fallback email search failed:', e);
          }
        }
        
        // 3. Fallback to creating a new profile if still none
        if (!profile) {
          const isAdmin = user.email === 'herbeth.comelli@gmail.com';
          profile = {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || 'Usuário',
            role: isAdmin ? 'admin' : 'operator',
            photoURL: user.photoURL || undefined,
            createdAt: new Date().toISOString()
          };
          await setDoc(userRef, profile);
        }

        setUserProfile(profile);
        setIsAuthReady(true);

        unsubProfile = onSnapshot(userRef, (doc) => {
          if (doc.exists()) setUserProfile(doc.data() as UserProfile);
        });
      } catch (error) {
        console.error('Error setting up profile:', error);
        // Ensure app still loads even if profile fails, using a basic profile
        const basicProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || 'Usuário',
          role: user.email === 'herbeth.comelli@gmail.com' ? 'admin' : 'operator',
          createdAt: new Date().toISOString()
        };
        setUserProfile(basicProfile);
        setIsAuthReady(true);
      }
    };

    setupProfile();
    return () => unsubProfile();
  }, [user]);

  useEffect(() => {
    if (!userProfile) return;

    const unsubs: (() => void)[] = [];

    // Sync All Users if Admin
    if (userProfile.role === 'admin') {
      const qUsers = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const unsubUsers = onSnapshot(qUsers, (snapshot) => {
        setUsers(snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile)));
      }, (error) => {
        if (auth.currentUser) handleFirestoreError(error, OperationType.LIST, 'users');
      });
      unsubs.push(unsubUsers);
    }

    // Helper to sync collection
    const syncCollection = (collectionName: string, setter: (data: any) => void, initialData: any[]) => {
      const q = query(collection(db, collectionName));
      return onSnapshot(q, async (snapshot) => {
        if (snapshot.empty && initialData.length > 0 && (userProfile.role === 'admin' || userProfile.role === 'manager')) {
          // Seed from localStorage or initial constants if Firestore is empty
          const saved = localStorage.getItem(collectionName === 'fleet' ? 'fleet' : collectionName);
          const dataToSeed = saved ? JSON.parse(saved) : initialData;
          
          const batch = writeBatch(db);
          dataToSeed.forEach((item: any) => {
            const docRef = doc(db, collectionName, String(item.id));
            batch.set(docRef, item);
          });
          try {
            await batch.commit();
          } catch (e) {
            console.error(`Error seeding ${collectionName}:`, e);
          }
        } else {
          const list = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as any));
          setter(list);
        }
      }, (error) => {
        if (auth.currentUser) handleFirestoreError(error, OperationType.LIST, collectionName);
      });
    };

    unsubs.push(syncCollection('operators', setOperators, INITIAL_OPERATORS));
    unsubs.push(syncCollection('fields', setFields, INITIAL_FIELDS));
    unsubs.push(syncCollection('inputs', setInputs, INITIAL_INPUTS));
    unsubs.push(syncCollection('fleet', setMachines, INITIAL_MACHINES));
    unsubs.push(syncCollection('implements', setImplementsList, INITIAL_IMPLEMENTS));
    unsubs.push(syncCollection('activityDefinitions', setActivityDefinitions, INITIAL_ACTIVITY_DEFINITIONS));
    unsubs.push(syncCollection('activityCategories', setActivityCategories, INITIAL_CATEGORIES));
    unsubs.push(syncCollection('stockMovements', setStockMovements, []));
    unsubs.push(syncCollection('plannings', setPlannings, []));
    unsubs.push(syncCollection('productionCycles', setProductionCycles, []));

    const qOS = query(collection(db, 'serviceOrders'));
    const unsubOS = onSnapshot(qOS, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceOrder));
      setServiceOrders(list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));
    }, (error) => {
      if (auth.currentUser) handleFirestoreError(error, OperationType.LIST, 'serviceOrders');
    });
    unsubs.push(unsubOS);

    const qLogs = query(collection(db, 'dailyLogs'));
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DailyLog));
      setAllDailyLogs(list.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()));
    }, (error) => {
      if (auth.currentUser) handleFirestoreError(error, OperationType.LIST, 'dailyLogs');
    });
    unsubs.push(unsubLogs);

    // Sync Farm Name
    const farmRef = doc(db, 'settings', 'farm_config');
    const unsubFarm = onSnapshot(farmRef, (docSnap) => {
      if (docSnap.exists()) {
        setFarmName(docSnap.data().name);
      } else if (userProfile.role === 'admin' || userProfile.role === 'manager') {
        setDoc(farmRef, { name: 'Unidade Refloresta' });
      }
    }, (error) => {
      if (auth.currentUser) handleFirestoreError(error, OperationType.GET, 'settings/farm_config');
    });
    unsubs.push(unsubFarm);

    return () => unsubs.forEach(unsub => unsub());
  }, [userProfile?.uid, userProfile?.role]);

  const handleUpdateFarmName = async (newName: string) => {
    try {
      const farmRef = doc(db, 'settings', 'farm_config');
      await setDoc(farmRef, { name: newName }, { merge: true });
      setFarmName(newName);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/farm_config');
    }
  };

  const handleExportBackup = async () => {
    const collections = [
      'fields', 'inputs', 'fleet', 'implements', 'activityDefinitions', 
      'activityCategories', 'stockMovements', 'serviceOrders', 'dailyLogs', 
      'plannings', 'users', 'settings'
    ];
    
    const backupData: any = {};
    const loadingId = toast.loading('Exportando backup...');
    
    try {
      for (const colName of collections) {
        const snapshot = await getDocs(collection(db, colName));
        backupData[colName] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
      
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_gestor_florestal_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Backup exportado com sucesso!', { id: loadingId });
    } catch (error) {
      toast.error('Erro ao exportar backup.', { id: loadingId });
      console.error(error);
    }
  };

  const handleImportBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const loadingId = toast.loading('Importando dados...');
      try {
        const result = e.target?.result;
        if (!result || typeof result !== 'string') {
          throw new Error('Falha ao ler arquivo.');
        }

        const data = JSON.parse(result);
        if (!data || typeof data !== 'object') {
          throw new Error('Formato de backup inválido.');
        }
        
        for (const colName in data) {
          const items = data[colName];
          if (!Array.isArray(items)) continue;

          for (let i = 0; i < items.length; i += 500) {
            const batch = writeBatch(db);
            const chunk = items.slice(i, i + 500);
            chunk.forEach((item: any) => {
              const { id, ...rest } = item;
              if (!id) return;
              const docRef = doc(db, colName, id);
              batch.set(docRef, rest);
            });
            await batch.commit();
          }
        }
        
        toast.success('Dados importados com sucesso!', { id: loadingId });
        setTimeout(() => window.location.reload(), 1500);
      } catch (error) {
        toast.error('Erro ao importar dados. Verifique o arquivo.', { id: loadingId });
        console.error('Import error:', error);
      }
    };
    reader.onerror = () => {
      toast.error('Erro ao ler arquivo de backup.');
    };
    reader.readAsText(file);
  };

  const handleResetSystem = async () => {
    setIsResetSecondConfirmOpen(false);
    const loadingId = toast.loading('Resetando sistema...');
    try {
      const collections = [
        'fields', 'inputs', 'fleet', 'implements', 'activityDefinitions', 
        'activityCategories', 'stockMovements', 'serviceOrders', 'dailyLogs', 
        'plannings', 'users', 'settings'
      ];
      
      for (const colName of collections) {
        const snapshot = await getDocs(collection(db, colName));
        const docs = snapshot.docs;
        
        for (let i = 0; i < docs.length; i += 500) {
          const batch = writeBatch(db);
          const chunk = docs.slice(i, i + 500);
          chunk.forEach(docSnap => {
            // Don't delete current user
            if (colName === 'users' && docSnap.id === auth.currentUser?.uid) return;
            batch.delete(docSnap.ref);
          });
          await batch.commit();
        }
      }
      
      toast.success('Sistema resetado com sucesso!', { id: loadingId });
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      toast.error('Erro ao resetar sistema.', { id: loadingId });
      console.error(error);
    }
  };

  const handleTabChange = (id: string) => {
    if (id === 'new-os') {
      setIsNewOSActive(true);
    } else {
      setIsNewOSActive(false);
      setActiveTab(id);
    }
  };

  const handleNewOSComplete = async (data: any) => {
    const selectedField = fields.find(f => String(f.id) === String(data.fieldId));
    const selectedOperator = operators.find(o => String(o.id) === String(data.operatorId));
    const selectedMachine = machines.find(m => String(m.id) === String(data.machineId));
    const selectedImplement = implementsList.find(i => String(i.id) === String(data.implementId));
    const activityDef = activityDefinitions.find(a => a.name === data.activity);
    const isSimple = !!activityDef?.isSimpleActivity;
    const area = parseNumber(selectedField?.area || 0);
    const totalPlannedVolume = isSimple ? 0 : (data.targetRate * area);

    // Snapshot input names AND record actual deduction amount for correct stock return on deletion
    const snapshotInputs = (data.inputs || []).map((osInput: any) => {
      const input = inputs.find(i => i.id === osInput.inputId);
      const actualDeduction = osInput.stockDeduction !== undefined
        ? osInput.stockDeduction
        : (osInput.dose * area);
      return {
        ...osInput,
        inputName: input?.name || 'Insumo N/A',
        stockDeduction: actualDeduction  // always persist the real amount deducted
      };
    });

    // Deduct stock automatically in Firestore
    if (data.inputs && data.inputs.length > 0) {
      const batch = writeBatch(db);
      
      data.inputs.forEach((osInput: any) => {
        const input = inputs.find(i => i.id === osInput.inputId);
        if (input) {
          const amountUsed = osInput.stockDeduction !== undefined ? osInput.stockDeduction : (osInput.dose * area);
          const movementId = Math.random().toString(36).substr(2, 9);
          
          const movementRef = doc(db, 'stockMovements', movementId);
          batch.set(movementRef, {
            id: movementId,
            inputId: input.id,
            type: 'os_deduction',
            amount: amountUsed,
            date: new Date().toISOString(),
            recipient: selectedOperator?.name,
            location: selectedField?.name,
            description: `OS: ${data.activity} - Field: ${selectedField?.name || 'N/A'}`
          });

          const inputRef = doc(db, 'inputs', input.id);
          const newStock = Number(Math.max(0, input.stock - amountUsed).toFixed(4));
          batch.update(inputRef, { stock: newStock });
        }
      });

      try {
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'stockMovements');
      }
    }

    // Save the Service Order itself
    const osId = Date.now().toString();
    const newOS = {
      ...data,
      inputs: snapshotInputs,
      fieldName: selectedField?.name || 'Talhão N/A',
      fieldArea: selectedField?.area || 0,
      operatorName: selectedOperator?.name || 'Operador N/A',
      machineName: selectedMachine?.name || 'Máquina N/A',
      implementName: selectedImplement?.name || 'Implemento N/A',
      id: osId,
      status: 'active',
      createdAt: new Date().toISOString(),
      totalPlannedVolume,
      totalApplied: 0,
      progress: 0
    };

    try {
      await setDoc(doc(db, 'serviceOrders', osId), newOS);
      localStorage.removeItem('last_os_data');
      localStorage.removeItem('os_draft');
      setIsNewOSActive(false);
      setActiveTab('activities');
      toast.success('Ordem de Serviço criada com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'serviceOrders');
      toast.error('Erro ao salvar Ordem de Serviço.');
    }
  };

  const handleNewOSCancel = () => {
    localStorage.removeItem('last_os_data');
    localStorage.removeItem('os_draft');
    setIsNewOSActive(false);
    setActiveTab('dashboard');
  };

  const getPlanningProgress = (plan: Planning) => {
    const activity = activityDefinitions.find(a => a.id === plan.activityId);
    if (!activity) return 0;

    const totalArea = plan.items.reduce((sum, item) => {
      const field = fields.find(f => f.id === item.fieldId);
      return sum + (field?.area || 0);
    }, 0);

    const realizedArea = plan.items.reduce((sum, item) => {
      const field = fields.find(f => f.id === item.fieldId);
      if (!field) return sum;
      
      const matchingOS = serviceOrders.filter(os => 
        os.fieldId === item.fieldId && 
        os.activity === activity.name &&
        os.status !== 'cancelled' &&
        (os.planningId === plan.id || (!os.planningId && new Date(os.createdAt) >= new Date(plan.createdAt)))
      );

      if (matchingOS.some(os => os.status === 'completed')) {
        return sum + field.area;
      }

      const totalApplied = matchingOS.reduce((s, os) => {
        const logs = allDailyLogs.filter(l => getLogOsId(l) === os.id);
        return s + logs.reduce((sl, l) => sl + l.amount, 0);
      }, 0);

      const targetRate = matchingOS[0]?.targetRate || 1;
      return sum + Math.min(field.area, totalApplied / targetRate);
    }, 0);

    return totalArea > 0 ? Math.round((realizedArea / totalArea) * 100) : 0;
  };

  // CRUD Handlers
  const handleAdd = async (type: string, item: any) => {
    const id = Date.now().toString();
    const newItem: any = { 
      ...item, 
      id,
      createdAt: item.createdAt || new Date().toISOString(),
    };
    
    // Only set status if it's in the item or if it's a serviceOrder/planning that needs a default
    if (item.status) {
      newItem.status = item.status;
    } else if (type === 'serviceOrders') {
      newItem.status = 'pending';
    } else if (type === 'plannings') {
      newItem.status = 'active';
    }

    // Sanitize undefined values
    Object.keys(newItem).forEach(key => {
      if (newItem[key] === undefined) delete newItem[key];
    });

    try {
      await setDoc(doc(db, type, id), newItem);
      return id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, type);
      return null;
    }
  };

  const handleDelete = async (type: string, id: string) => {
    try {
      await deleteDoc(doc(db, type, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${type}/${id}`);
    }
  };

  const handleDeleteStockMovement = async (movementId: string) => {
    const movement = stockMovements.find(m => m.id === movementId);
    if (!movement) return;

    try {
      const batch = writeBatch(db);
      
      // 1. Delete the movement
      batch.delete(doc(db, 'stockMovements', movementId));

      // 2. Revert stock change
      const input = inputs.find(i => i.id === movement.inputId);
      if (input) {
        let newStock = input.stock;
        if (movement.type === 'entry') {
          newStock -= movement.amount;
        } else {
          newStock += movement.amount;
        }
        batch.update(doc(db, 'inputs', input.id), { stock: Number(newStock.toFixed(4)) });
      }

      await batch.commit();
      toast.success('Movimentação excluída e estoque atualizado!');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `stockMovements/${movementId}`);
      toast.error('Erro ao excluir movimentação.');
    }
  };

  const handleDeleteOS = async (osId: string) => {
    const os = serviceOrders.find(o => o.id === osId);
    if (!os) return;

    try {
      const batch = writeBatch(db);

      // 1. Calculate total applied from logs to return stock
      const osLogs = allDailyLogs.filter(l => l.osId === osId);
      
      // 2. Return stock for each input
      if (os.inputs && os.inputs.length > 0) {
        for (const osInput of os.inputs) {
          const input = inputs.find(i => i.id === osInput.inputId);
          if (input) {
            // Use stored stockDeduction (the actual amount deducted at OS creation)
            // Fall back to dose * area for older OS records that predate this fix
            const totalToReturn = (osInput.stockDeduction != null && osInput.stockDeduction > 0)
              ? osInput.stockDeduction
              : (osInput.dose != null ? osInput.dose * (os.fieldArea || 0) : 0);
            
            if (totalToReturn > 0) {
              const inputRef = doc(db, 'inputs', input.id);
              batch.update(inputRef, { stock: Number((input.stock + totalToReturn).toFixed(4)) });

              // Record stock movement (return)
              const movementId = Math.random().toString(36).substr(2, 9);
              const movementRef = doc(db, 'stockMovements', movementId);
              batch.set(movementRef, {
                id: movementId,
                inputId: input.id,
                type: 'entry',
                amount: totalToReturn,
                date: new Date().toISOString(),
                description: `Estorno de OS excluída: ${os.activity} (ID: ${osId})`
              });
            }
          }
        }
      }

      // 3. Revert Operator Production History
      const operator = operators.find(o => o.id === os.operatorId);
      if (operator && operator.productionHistory) {
        const updatedHistory = operator.productionHistory.filter(h => h.osId !== osId);
        if (updatedHistory.length !== operator.productionHistory.length) {
          batch.update(doc(db, 'operators', operator.id), { productionHistory: updatedHistory });
        }
      }

      // 4. Delete all daily logs
      osLogs.forEach(log => {
        batch.delete(doc(db, 'dailyLogs', log.id));
      });

      // 5. Delete the OS
      batch.delete(doc(db, 'serviceOrders', osId));

      // 6. Reset location and sync hours if no more active OS for this machine/implement
      const resetAndSync = (type: 'fleet' | 'implements', id: string) => {
        const otherActiveOS = serviceOrders.filter(osItem => 
          osItem.id !== osId && 
          osItem.status === 'active' && 
          (type === 'fleet' ? osItem.machineId === id : osItem.implementId === id)
        );
        
        // Calculate new max hours from logs of other OS
        const otherOSIds = serviceOrders.filter(osItem => 
          osItem.id !== osId && 
          (type === 'fleet' ? osItem.machineId === id : osItem.implementId === id)
        ).map(o => o.id);
        const remainingLogs = allDailyLogs.filter(l => l.osId !== osId && otherOSIds.includes(l.osId));
        const maxHours = remainingLogs.length > 0 ? Math.max(0, ...remainingLogs.map(l => l.horimetroFinal || 0)) : null;

        const updateData: any = {};
        if (maxHours !== null && type === 'fleet') updateData.hours = maxHours;

        if (otherActiveOS.length === 0) {
          updateData.location = 'Unidade';
        } else {
          const otherField = fields.find(f => f.id === otherActiveOS[0].fieldId);
          updateData.location = otherField?.name || 'Unidade';
        }
        
        batch.update(doc(db, type, id), updateData);
      };

      if (os.machineId) resetAndSync('fleet', os.machineId);
      if (os.implementId) resetAndSync('implements', os.implementId);

      // Remove production history for all operators
      operators.forEach(op => {
        if (op.productionHistory?.some(r => r.osId === osId)) {
          const updatedHistory = op.productionHistory.filter(r => r.osId !== osId);
          batch.update(doc(db, 'operators', op.id), { productionHistory: updatedHistory });
        }
      });

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `serviceOrders/${osId}`);
    }
  };

  const handleEdit = async (type: string, item: any) => {
    const sanitizedItem = { ...item };
    Object.keys(sanitizedItem).forEach(key => {
      if (sanitizedItem[key] === undefined) delete sanitizedItem[key];
    });

    try {
      await updateDoc(doc(db, type, item.id), sanitizedItem);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${type}/${item.id}`);
    }
  };

  const handleStockMovement = async (movement: Omit<StockMovement, 'id' | 'date'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const date = new Date().toISOString();
    const newMovement: StockMovement = {
      ...movement,
      id,
      date
    };
    
    try {
      await setDoc(doc(db, 'stockMovements', id), newMovement);
      
      const input = inputs.find(i => i.id === movement.inputId);
      if (input) {
        const newStock = Number((movement.type === 'entry' 
          ? input.stock + movement.amount 
          : Math.max(0, input.stock - movement.amount)).toFixed(4));
        
        await updateDoc(doc(db, 'inputs', input.id), { stock: newStock });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'stockMovements');
    }
  };

  const handleImportCSV = async (type: string, items: any[]) => {
    const batch = writeBatch(db);
    items.forEach(item => {
      const id = item.id || Math.random().toString(36).substr(2, 9);
      const docRef = doc(db, type, id);
      batch.set(docRef, { ...item, id });
    });
    
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, type);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const sortedFields = [...fields].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
  const sortedOperators = [...operators].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
  const sortedInputs = [...inputs].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
  const sortedMachines = [...machines].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
  const sortedImplements = [...implementsList].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
  const sortedActivityDefs = [...activityDefinitions].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background text-on-background">
        <TopBar 
          userAvatar={user.photoURL || USER_AVATAR} 
          userName={userProfile?.displayName || user.displayName || undefined} 
          role={userProfile?.role}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
        
        <main className="pt-24 pb-32 px-4 md:px-8 max-w-7xl mx-auto">
        {isNewOSActive ? (
          <NewOSFlow 
            operators={sortedOperators}
            fields={sortedFields}
            inputs={sortedInputs}
            machines={sortedMachines}
            implementsList={sortedImplements}
            activityDefinitions={sortedActivityDefs}
            onComplete={handleNewOSComplete} 
            onCancel={handleNewOSCancel} 
          />
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <Dashboard 
                activities={dashboardActivities} 
                onNewOS={() => setIsNewOSActive(true)}
                onViewAll={() => setActiveTab('activities')}
                inputs={inputs}
                machines={machines}
                plannings={plannings}
                farmName={farmName}
                onEditFarmName={handleUpdateFarmName}
                onTabChange={handleTabChange}
                getPlanningProgress={getPlanningProgress}
                fields={fields}
                serviceOrders={serviceOrders}
                allDailyLogs={allDailyLogs}
                activityDefinitions={activityDefinitions}
              />
            )}
            {activeTab === 'resources' && (
              <Resources 
                role={userProfile?.role}
                operators={sortedOperators}
                fields={sortedFields}
                inputs={sortedInputs}
                machines={sortedMachines}
                implementsList={sortedImplements}
                activityDefinitions={sortedActivityDefs}
                activityCategories={activityCategories}
                stockMovements={stockMovements}
                serviceOrders={serviceOrders}
                plannings={plannings}
                dailyLogs={allDailyLogs}
                onAdd={handleAdd}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onStockMovement={handleStockMovement}
                onDeleteStockMovement={handleDeleteStockMovement}
                onImportCSV={handleImportCSV}
              />
            )}
            {activeTab === 'planning' && (
              <PlanningComponent 
                role={userProfile?.role}
                fields={sortedFields}
                inputs={sortedInputs}
                activityDefinitions={sortedActivityDefs}
                activityCategories={activityCategories}
                plannings={plannings}
                productionCycles={productionCycles}
                serviceOrders={serviceOrders}
                dailyLogs={allDailyLogs}
                onAdd={handleAdd}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onStartOS={(plan, fieldId) => {
                  const activity = sortedActivityDefs.find(a => a.id === plan.activityId);
                  if (!activity) return;
                  
                  const initialOSData: OSData = {
                    activity: activity.name,
                    fieldId: fieldId,
                    machineId: '',
                    implementId: '',
                    operatorId: '',
                    targetRate: 150,
                    inputs: plan.items.find(i => i.fieldId === fieldId)?.inputs.map(input => {
                      const inputDef = sortedInputs.find(si => si.id === input.inputId);
                      return {
                        id: Math.random().toString(36).substr(2, 9),
                        inputId: input.inputId,
                        name: inputDef?.name || '',
                        unit: inputDef?.unit || '',
                        dose: input.dose,
                        totalPlanned: 0,
                        stockDeduction: 0
                      };
                    }) || [],
                    width: 24,
                    testDistance: 50,
                    nozzles: 48,
                    spacingWidth: 3,
                    spacingLength: 2,
                    planningId: plan.id
                  };
                  
                  // Save to localStorage so NewOSFlow can pick it up
                  localStorage.setItem('os_draft', JSON.stringify(initialOSData));
                  setActiveTab('new-os');
                  setIsNewOSActive(true);
                }}
              />
            )}
            {activeTab === 'activities' && (
              <Activities 
                role={userProfile?.role}
                fields={sortedFields}
                operators={sortedOperators}
                inputs={sortedInputs}
                serviceOrders={serviceOrders}
                dailyLogs={allDailyLogs}
                activityDefinitions={sortedActivityDefs}
                machines={sortedMachines}
                implementsList={sortedImplements}
                onDeleteOS={handleDeleteOS}
                onAddLog={(log) => handleAdd('dailyLogs', log)}
                onUpdateLog={(log) => handleEdit('dailyLogs', log)}
                onDeleteLog={(id) => handleDelete('dailyLogs', id)}
                onUpdateOS={(id, data) => handleEdit('serviceOrders', { ...data, id })}
                onUpdateMachine={(id, data) => handleEdit('fleet', { ...data, id })}
                onUpdateImplement={(id, data) => handleEdit('implements', { ...data, id })}
                onUpdateOperator={(id, data) => handleEdit('operators', { ...data, id })}
                onUpdateField={(id, data) => handleEdit('fields', { ...data, id })}
              />
            )}
          </>
        )}
      </main>

      <BottomNav activeTab={isNewOSActive ? 'new-os' : activeTab} onTabChange={handleTabChange} />

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-surface-container-lowest w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden border border-outline-variant/30 max-h-[90vh] flex flex-col">
            <div className="p-8 overflow-y-auto flex-1">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-black text-on-surface tracking-tighter">Configurações</h2>
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-2 hover:bg-surface-container-highest rounded-full transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              
              <div className="space-y-10">
                <section>
                  <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-4">Geral</h3>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Nome da Unidade</label>
                      <input 
                        type="text" 
                        defaultValue={farmName}
                        onBlur={(e) => handleUpdateFarmName(e.target.value)}
                        className="w-full bg-surface-container-highest border-none rounded-2xl py-4 px-5 text-on-surface font-bold focus:ring-2 focus:ring-primary transition-all"
                        placeholder="Ex: Unidade Refloresta"
                      />
                    </div>
                  </div>
                </section>

                {userProfile?.role === 'admin' && (
                  <section className="pt-10 border-t border-outline-variant/10">
                    <UserManagement 
                      role={userProfile?.role}
                      users={users}
                      onAdd={(u) => handleAdd('users', u)}
                      onDelete={(id) => handleDelete('users', id)}
                      onEdit={(u) => handleEdit('users', u)}
                    />
                  </section>
                )}

                {userProfile?.role === 'admin' && (
                  <section className="pt-10 border-t border-outline-variant/10">
                    <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-4">Dados e Backup</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button 
                        onClick={handleExportBackup}
                        className="flex items-center justify-center gap-3 py-4 bg-surface-container-highest text-on-surface rounded-2xl font-bold text-sm hover:bg-primary/10 hover:text-primary transition-all border border-outline-variant/10"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Exportar Backup
                      </button>
                      
                      <label className="flex items-center justify-center gap-3 py-4 bg-surface-container-highest text-on-surface rounded-2xl font-bold text-sm hover:bg-primary/10 hover:text-primary transition-all border border-outline-variant/10 cursor-pointer">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        Importar Backup
                        <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
                      </label>

                      <button 
                        onClick={() => setIsResetConfirmOpen(true)}
                        className="md:col-span-2 flex items-center justify-center gap-3 py-4 bg-error/10 text-error rounded-2xl font-bold text-sm hover:bg-error hover:text-on-error transition-all border border-error/20"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Resetar Sistema (Limpar Tudo)
                      </button>
                    </div>
                  </section>
                )}

                <section className="pt-10 border-t border-outline-variant/10">
                  <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-4">Sobre o Sistema</h3>
                  <div className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/10">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-bold text-on-surface">Versão da Plataforma</span>
                      <span className="text-xs font-black bg-primary/10 text-primary px-3 py-1 rounded-full">v2.5.4</span>
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      GESTOR FLORESTAL - Sistemas de Gestão Florestal de Alta Precisão. 
                      Desenvolvido para otimização de recursos e rastreabilidade total das operações de campo.
                    </p>
                  </div>
                </section>
              </div>
            </div>

            <div className="p-6 bg-surface-container-low border-t border-outline-variant/10">
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="w-full py-4 bg-primary text-on-primary rounded-2xl font-black text-sm uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-primary/20"
              >
                Salvar e Fechar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Reset Confirmation Dialogs */}
      <ConfirmDialog 
        isOpen={isResetConfirmOpen}
        title="Resetar Sistema?"
        message="VOCÊ TEM CERTEZA? Isso excluirá TODOS os dados do sistema. Esta ação não pode ser desfeita."
        confirmLabel="Sim, Continuar"
        cancelLabel="Cancelar"
        onConfirm={() => {
          setIsResetConfirmOpen(false);
          setIsResetSecondConfirmOpen(true);
        }}
        onCancel={() => setIsResetConfirmOpen(false)}
      />

      <ConfirmDialog 
        isOpen={isResetSecondConfirmOpen}
        title="Último Aviso!"
        message="Todos os talhões, insumos, máquinas e históricos serão EXCLUÍDOS PERMANENTEMENTE. Você realmente deseja continuar?"
        confirmLabel="EXCLUIR TUDO"
        cancelLabel="Voltar"
        onConfirm={handleResetSystem}
        onCancel={() => setIsResetSecondConfirmOpen(false)}
      />
      </div>
    </ErrorBoundary>
  );
}
