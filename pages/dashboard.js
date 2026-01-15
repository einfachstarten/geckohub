// dashboard.js
import React from 'react';
import BenniMenu from '../components/BenniMenu';

const Dashboard = () => {
  return (
    <div className="flex flex-col h-screen">
      <header className="bg-slate-800/95 backdrop-blur-xl shadow-md p-4">
        <nav className="flex justify-between items-center">
          <h1 className="text-lg font-bold text-slate-100">Dashboard</h1>
          <BenniMenu onClick={() => alert('Benni clicked!')} />
        </nav>
      </header>
      <main className="flex-1 overflow-y-auto p-4">
        {/* Content goes here */}
      </main>
    </div>
  );
};

export default Dashboard;