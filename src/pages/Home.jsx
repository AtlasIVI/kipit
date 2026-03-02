import React, { useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sector } from 'recharts'
import { Wallet, Sprout, TrendingDown, Target } from 'lucide-react'

// Fonction pour dessiner le quartier "agrandi" au survol
const renderActiveShape = (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8} // On agrandit de 8px au survol
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        className="transition-all duration-300 ease-out"
      />
    </g>
  );
};

export default function Home() {
  // États pour gérer quel quartier est survolé pour chaque graphique
  const [activePlanned, setActivePlanned] = useState(null);
  const [activeReal, setActiveReal] = useState(null);

  const plannedData = [
    { name: 'Logement', value: 800, color: '#6366f1' },
    { name: 'Abonnements', value: 120, color: '#3b82f6' },
    { name: 'Courses', value: 300, color: '#f59e0b' },
    { name: 'Loisirs', value: 150, color: '#ec4899' },
  ];

  const realData = [
    { name: 'Logement', value: 800, color: '#6366f1' },
    { name: 'Abonnements', value: 125, color: '#3b82f6' },
    { name: 'Courses', value: 340, color: '#f59e0b' },
    { name: 'Loisirs', value: 80, color: '#ec4899' },
  ];

  return (
    <div className="p-4 pt-safe space-y-6 pb-24">
      {/* ... (Header et Cartes identiques au code précédent) ... */}
      
      <div className="bg-white dark:bg-zinc-900 p-5 rounded-[32px] border border-zinc-100 dark:border-zinc-800 space-y-6">
        <div className="flex items-center gap-2 px-1 text-zinc-500">
          <Target size={18} />
          <h3 className="text-sm font-bold uppercase tracking-wider">Analyse Budgétaire</h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Graphique Prévu */}
          <div className="space-y-3">
            <p className="text-[10px] text-center font-bold text-zinc-400 uppercase">Prévu</p>
            <div className="h-40 w-full"> {/* Hauteur augmentée */}
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    activeIndex={activePlanned}
                    activeShape={renderActiveShape}
                    data={plannedData}
                    innerRadius={35} // Plus grand
                    outerRadius={55} // Plus grand
                    paddingAngle={4}
                    dataKey="value"
                    onMouseEnter={(_, index) => setActivePlanned(index)}
                    onMouseLeave={() => setActivePlanned(null)}
                  >
                    {plannedData.map((entry, index) => (
                      <Cell key={`planned-${index}`} fill={entry.color} stroke="none" className="outline-none" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ display: 'none' }} /> {/* On cache le tooltip par défaut pour le style */}
                </PieChart>
              </ResponsiveContainer>
            </div>
            <p className="text-center font-mono text-sm font-bold">1 370 €</p>
          </div>

          {/* Graphique Réel */}
          <div className="space-y-3 border-l border-zinc-50 dark:border-zinc-800">
            <p className="text-[10px] text-center font-bold text-zinc-400 uppercase">Réel</p>
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    activeIndex={activeReal}
                    activeShape={renderActiveShape}
                    data={realData}
                    innerRadius={35}
                    outerRadius={55}
                    paddingAngle={4}
                    dataKey="value"
                    onMouseEnter={(_, index) => setActiveReal(index)}
                    onMouseLeave={() => setActiveReal(null)}
                  >
                    {realData.map((entry, index) => (
                      <Cell key={`real-${index}`} fill={entry.color} stroke="none" className="outline-none" />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <p className="text-center font-mono text-sm font-bold">1 345 €</p>
          </div>
        </div>
      </div>

      {/* Légende interactive */}
      <div className="space-y-2">
        {realData.map((cat, index) => (
          <div 
            key={cat.name} 
            onMouseEnter={() => setActiveReal(index)}
            onMouseLeave={() => setActiveReal(null)}
            className={`flex items-center justify-between p-4 rounded-2xl transition-colors ${activeReal === index ? 'bg-zinc-100 dark:bg-zinc-800' : 'bg-transparent'}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
              <span className={`text-sm ${activeReal === index ? 'font-bold' : 'font-medium'}`}>{cat.name}</span>
            </div>
            <span className="text-sm font-mono text-zinc-500">{cat.value} €</span>
          </div>
        ))}
      </div>
    </div>
  )
}