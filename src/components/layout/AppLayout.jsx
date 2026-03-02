import { Outlet, NavLink } from 'react-router-dom';
import { Home, Wallet, PieChart, Settings, Plus, CreditCard } from 'lucide-react';
import TabBar from './TabBar';

// Composant pour les items de la Sidebar (Version Desktop)
const SidebarItem = ({ to, icon: Icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 ${
        isActive
          ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30'
          : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:text-zinc-400'
      }`
    }
  >
    <Icon size={22} />
    <span className="font-medium">{label}</span>
  </NavLink>
);

export default function AppLayout() {
  const navItems = [
    { to: '/', icon: Home, label: 'Tableau de bord' },
    { to: '/transactions', icon: Wallet, label: 'Transactions' },
    { to: '/reports', icon: PieChart, label: 'Rapports' },
    { to: '/subscriptions', icon: CreditCard, label: 'Abonnements' },
    { to: '/settings', icon: Settings, label: 'Paramètres' },
  ];

  return (
    <div className="flex h-screen bg-white dark:bg-zinc-950 overflow-hidden">
      
      {/* SIDEBAR : Visible uniquement sur PC (lg) */}
      <aside className="hidden lg:flex flex-col w-72 border-r border-zinc-100 dark:border-zinc-800 p-6 bg-white dark:bg-zinc-950">
        <div className="flex items-center gap-3 px-4 mb-10">
          <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
            <Plus size={24} strokeWidth={3} />
          </div>
          <span className="text-2xl font-bold tracking-tight dark:text-white">Kipit</span>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <SidebarItem key={item.to} {...item} />
          ))}
        </nav>

        {/* Pied de la Sidebar (Profil/Upgrade) */}
        <div className="mt-auto p-4 bg-zinc-50 dark:bg-zinc-900 rounded-3xl">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Plan Free</p>
          <button className="text-sm font-bold text-brand-600 dark:text-brand-400 hover:underline">
            Passer Premium →
          </button>
        </div>
      </aside>

      {/* CONTENU PRINCIPAL */}
      <div className="flex flex-col flex-1 h-screen relative overflow-hidden">
        
        <main className="flex-1 overflow-y-auto pb-24 lg:pb-0">
          {/* Conteneur de contenu : Limité sur mobile, large sur PC */}
          <div className="max-w-screen-xl mx-auto p-4 md:p-8 lg:p-12">
            <Outlet />
          </div>
        </main>

        {/* TABBAR : Visible uniquement sur Mobile/Tablette (max-lg) */}
        <div className="lg:hidden">
          <TabBar />
        </div>

        {/* Bouton d'ajout rapide pour Desktop (Optionnel car déjà en sidebar ou menu) */}
        <button className="hidden lg:flex fixed bottom-8 right-8 w-14 h-14 bg-brand-500 text-white rounded-full items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-transform z-50">
          <Plus size={28} />
        </button>
      </div>
    </div>
  );
}