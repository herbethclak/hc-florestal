import React, { useState } from 'react';
import { UserProfile } from '../types';
import { UserPlus, Shield, User as UserIcon, Trash2, Mail, Calendar, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface UserManagementProps {
  users: UserProfile[];
  onAdd: (user: Partial<UserProfile>) => void;
  onDelete: (uid: string) => void;
  onEdit: (user: UserProfile) => void;
  role?: 'admin' | 'manager' | 'operator';
}

export const UserManagement: React.FC<UserManagementProps> = ({ users, onAdd, onDelete, onEdit, role }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'manager' | 'operator'>('operator');
  const [newName, setNewName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ uid: string, name: string } | null>(null);

  const canDelete = role === 'admin' || role === 'manager';

  const handleDeleteClick = (uid: string, name: string) => {
    if (!canDelete) return;
    setShowDeleteConfirm({ uid, name });
  };

  const confirmDelete = () => {
    if (!showDeleteConfirm || !canDelete) return;
    onDelete(showDeleteConfirm.uid);
    setShowDeleteConfirm(null);
  };

  const handleAdd = () => {
    if (!newEmail) return;
    onAdd({
      email: newEmail,
      displayName: newName || newEmail.split('@')[0],
      role: newRole,
      uid: `pending_${Date.now()}`, // Temporary ID until they log in
      createdAt: new Date().toISOString()
    });
    setNewEmail('');
    setNewName('');
    setIsAdding(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black tracking-tight text-on-surface">Gestão de Acesso</h3>
          <p className="text-xs text-on-surface-variant font-bold uppercase tracking-widest opacity-60">Controle de usuários e permissões</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-full font-bold text-xs uppercase tracking-widest hover:scale-105 transition-transform"
        >
          <UserPlus size={16} /> Adicionar Usuário
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-surface-container-high rounded-3xl p-6 border border-outline-variant/30 overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">E-mail Google</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={16} />
                  <input 
                    type="email" 
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-surface-container-highest border-none rounded-2xl py-3 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-primary"
                    placeholder="example@gmail.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Nome Completo</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={16} />
                  <input 
                    type="text" 
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-surface-container-highest border-none rounded-2xl py-3 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-primary"
                    placeholder="Nome do colaborador"
                  />
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Nível de Acesso</label>
              <div className="flex gap-2">
                {(['admin', 'manager', 'operator'] as const).map((role) => (
                  <button
                    key={role}
                    onClick={() => setNewRole(role)}
                    className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      newRole === role 
                        ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' 
                        : 'bg-surface-container-highest text-on-surface-variant hover:bg-surface-container-highest/80'
                    }`}
                  >
                    {role === 'admin' ? 'Administrador' : role === 'manager' ? 'Gerente' : 'Operador'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={handleAdd}
                className="flex-1 bg-primary text-on-primary py-3 rounded-2xl font-black text-xs uppercase tracking-widest"
              >
                Confirmar Cadastro
              </button>
              <button 
                onClick={() => setIsAdding(false)}
                className="px-6 bg-surface-container-highest text-on-surface-variant py-3 rounded-2xl font-black text-xs uppercase tracking-widest"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-3">
        {users.map((user) => (
          <div 
            key={user.uid}
            className="bg-surface-container-low p-4 rounded-3xl border border-outline-variant/10 flex items-center justify-between group hover:border-primary/30 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-surface-container-highest flex items-center justify-center overflow-hidden">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="text-on-surface-variant" size={24} />
                )}
              </div>
              <div>
                <h4 className="font-black text-on-surface tracking-tight">{user.displayName}</h4>
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                    <Mail size={10} /> {user.email}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                    user.role === 'admin' ? 'bg-primary/10 text-primary' : 
                    user.role === 'manager' ? 'bg-secondary/10 text-secondary' : 
                    'bg-outline-variant/20 text-on-surface-variant'
                  }`}>
                    {user.role}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {canDelete && (
                <button 
                  onClick={() => handleDeleteClick(user.uid, user.displayName || user.email)}
                  className="p-2 text-error hover:bg-error/10 rounded-xl transition-colors"
                  title="Remover acesso"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          </div>
        ))}

        {users.length === 0 && (
          <div className="text-center py-12 bg-surface-container-lowest rounded-[32px] border-2 border-dashed border-outline-variant/20">
            <Shield className="mx-auto text-on-surface-variant/20 mb-4" size={48} />
            <p className="text-sm font-bold text-on-surface-variant uppercase tracking-widest opacity-40">Nenhum usuário cadastrado</p>
          </div>
        )}
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-[2.5rem] w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-error/10 text-error rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={40} />
              </div>
              <h3 className="text-2xl font-headline font-black text-on-surface mb-2">Confirmar Exclusão</h3>
              <p className="text-on-surface-variant font-medium mb-8">
                Tem certeza que deseja remover o acesso de <span className="font-bold text-on-surface">"{showDeleteConfirm.name}"</span>? Esta ação não pode ser desfeita.
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
                  Remover
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
