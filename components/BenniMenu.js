// BenniMenu.js
import React from 'react';

const BenniMenu = ({ onClick }) => {
  return (
    <div className="px-4 py-2 bg-slate-800/95 backdrop-blur-xl rounded-lg shadow-md cursor-pointer hover:bg-slate-800" onClick={onClick}>
      <span className="text-sm font-bold text-slate-100">Benni</span>
    </div>
  );
};

export default BenniMenu;