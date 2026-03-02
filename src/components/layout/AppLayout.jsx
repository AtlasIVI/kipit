import { useState } from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
// AJOUT DE "Grid" DANS L'IMPORT CI-DESSOUS
import { Home, Wallet, PieChart, Settings, Plus, CreditCard, Grid } from 'lucide-react'; 
import TabBar from './TabBar';
import AddModal from '../ui/AddModal';

const SidebarItem = ({ to, icon: Icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 ${
        isActive
          ? 'bg-zinc-900 text-white shadow-lg dark:bg-white dark:text-zinc-900'
          : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:text-zinc-400'
      }`
    }
  >
    <Icon size={22} />
    <span className="font-medium">{label}</span>
  </NavLink>
);

export default function AppLayout() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const navItems = [
    { to: '/', icon: Home, label: 'Tableau de bord' },
    { to: '/transactions', icon: Wallet, label: 'Transactions' },
    { to: '/categories', icon: Grid, label: 'Budgets' },
    { to: '/reports', icon: PieChart, label: 'Rapports' },
    { to: '/subscriptions', icon: CreditCard, label: 'Abonnements' },
    { to: '/settings', icon: Settings, label: 'Paramètres' },
  ];

  return (
    <div className="flex h-screen bg-white dark:bg-zinc-950 overflow-hidden">
      
      {/* SIDEBAR (Desktop) */}
      <aside className="hidden lg:flex flex-col w-72 border-r border-zinc-100 dark:border-zinc-800 p-6 bg-white dark:bg-zinc-950">
        
        {/* LOGO CLIQUABLE VERS LE DASHBOARD */}
        <Link 
          to="/" 
          className="flex items-center gap-3 px-4 mb-10 hover:opacity-80 transition-opacity active:scale-95"
        >
          <div className="w-10 h-10 bg-zinc-900 dark:bg-white rounded-xl flex items-center justify-center text-white dark:text-zinc-900 shadow-sm">
            <Plus size={24} strokeWidth={3} />
          </div>
          <span className="text-2xl font-bold tracking-tight dark:text-white">Kipit</span>
        </Link>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <SidebarItem key={item.to} {...item} />
          ))}
        </nav>
      </aside>

      {/* CONTENU PRINCIPAL */}
      <div className="flex flex-col flex-1 h-screen relative overflow-hidden">
        <main className="flex-1 overflow-y-auto pb-24 lg:pb-0">
          <div className="max-w-screen-xl mx-auto p-4 md:p-8 lg:p-12">
            {/* L'Outlet est indispensable pour afficher Home, Transactions, etc. */}
            <Outlet />
          </div>
        </main>

        {/* TABBAR (Mobile) */}
        <div className="lg:hidden">
          <TabBar onAddClick={() => setIsAddModalOpen(true)} />
        </div>

        {/* Bouton d'ajout flottant (Desktop) */}
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="hidden lg:flex fixed bottom-8 right-8 w-14 h-14 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-transform z-40"
        >
          <Plus size={28} />
        </button>

        {/* Modale d'ajout */}
        {isAddModalOpen && (
          <AddModal onClose={() => setIsAddModalOpen(false)} />
        )}
      </div>
    </div>
  );
}