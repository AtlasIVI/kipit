import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Users, Sprout, Calendar, Tag } from 'lucide-react';

export default function AddTransaction() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const type = searchParams.get('type') || 'expense';

  // État du formulaire
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [isSplit, setIsSplit] = useState(false);
  const [reimbursement, setReimbursement] = useState('');

  // Calcul du coût réel pour toi
  const realCost = isSplit ? (parseFloat(amount || 0) - parseFloat(reimbursement || 0)) : amount;

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 pb-safe">
      {/* Header */}
      <div className="p-4 pt-safe flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold capitalize">
          {type === 'investment' ? 'Nouvel Investissement' : `Ajouter ${type === 'income' ? 'un revenu' : 'une dépense'}`}
        </h1>
        <div className="w-10" /> {/* Spacer */}
      </div>

      <div className="p-6 space-y-8">
        {/* Input Montant Principal */}
        <div className="text-center space-y-2">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Montant Total</p>
          <div className="flex items-center justify-center gap-2">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="text-5xl font-mono font-bold bg-transparent text-center outline-none w-full max-w-[250px] border-b-2 border-transparent focus:border-brand-500 pb-2"
              autoFocus
            />
            <span className="text-2xl font-bold text-zinc-400">€</span>
          </div>
        </div>

        {/* Toggle Split / Partage (Uniquement pour les dépenses) */}
        {type === 'expense' && (
          <div className={`p-4 rounded-[24px] transition-all border-2 ${isSplit ? 'bg-brand-50 border-brand-200 dark:bg-brand-900/20 dark:border-brand-800' : 'bg-zinc-50 border-transparent dark:bg-zinc-900'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${isSplit ? 'bg-brand-500 text-white' : 'bg-zinc-200 text-zinc-500'}`}>
                  <Users size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold">Dépense partagée ?</p>
                  <p className="text-[10px] text-zinc-500 uppercase font-bold">On m'a remboursé une partie</p>
                </div>
              </div>
              <button 
                onClick={() => setIsSplit(!isSplit)}
                className={`w-12 h-6 rounded-full transition-colors relative ${isSplit ? 'bg-brand-500' : 'bg-zinc-300'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${isSplit ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            {isSplit && (
              <div className="mt-6 pt-6 border-t border-brand-200 dark:border-brand-800 animate-in fade-in slide-in-from-top-2">
                <p className="text-xs font-bold text-brand-600 mb-2 uppercase">Montant du remboursement</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={reimbursement}
                    onChange={(e) => setReimbursement(e.target.value)}
                    placeholder="Ex: 70"
                    className="bg-white dark:bg-zinc-800 p-3 rounded-xl w-full font-mono font-bold outline-none border border-brand-100 dark:border-brand-700"
                  />
                  <span className="font-bold">€</span>
                </div>
                <div className="mt-4 p-3 bg-white/50 dark:bg-black/20 rounded-xl border border-dashed border-brand-300">
                  <p className="text-xs text-center font-medium">
                    Coût réel pour ta poche : <span className="font-mono font-bold text-brand-600">{realCost} €</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Détails complémentaires */}
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl">
            <Tag size={20} className="text-zinc-400" />
            <input
              type="text"
              placeholder="Description (ex: Resto entre amis)"
              className="bg-transparent w-full outline-none text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-4 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl">
            <Calendar size={20} className="text-zinc-400" />
            <input type="date" className="bg-transparent w-full outline-none text-sm text-zinc-500" defaultValue={new Date().toISOString().split('T')[0]} />
          </div>
        </div>

        {/* Bouton de validation */}
        <button 
          className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-5 rounded-[24px] shadow-xl shadow-brand-500/20 flex items-center justify-center gap-3 active:scale-95 transition-all"
          onClick={() => {
            // Logique de sauvegarde Supabase ici
            alert(`Enregistré : ${realCost}€ net`);
            navigate('/transactions');
          }}
        >
          <Check size={24} />
          Confirmer
        </button>
      </div>
    </div>
  );
}