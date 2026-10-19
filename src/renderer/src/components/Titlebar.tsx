import { Minus, Square, X } from 'lucide-react';

export function Titlebar() {
  const handleMinimize = () => {
    window.desktopAPI.minimizeWindow();
  };

  const handleMaximize = () => {
    window.desktopAPI.maximizeWindow();
  };

  const handleClose = () => {
    window.desktopAPI.closeWindow(); // Esto la ocultará al tray
  };

  return (
    <div className="flex justify-between items-center h-10 bg-neutral-950 text-neutral-300 select-none [-webkit-app-region:drag] w-full border-b border-neutral-800">
      
      {/* Branding / Logo */}
      <div className="flex items-center px-4 space-x-3">
        <div className="w-3 h-3 bg-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.5)]"></div>
        <span className="text-xs font-semibold tracking-wide text-neutral-100 uppercase">
          AndoPages <span className="text-neutral-500">Dashboard</span>
        </span>
      </div>

      {/* Window Controls */}
      <div className="flex h-full [-webkit-app-region:no-drag]">
        <button 
          onClick={handleMinimize}
          className="px-4 h-full flex items-center justify-center hover:bg-neutral-800 transition-colors"
        >
          <Minus size={16} strokeWidth={1.5} />
        </button>
        <button 
          onClick={handleMaximize}
          className="px-4 h-full flex items-center justify-center hover:bg-neutral-800 transition-colors"
        >
          <Square size={14} strokeWidth={1.5} />
        </button>
        <button 
          onClick={handleClose}
          className="px-4 h-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors group"
        >
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>
      
    </div>
  );
}
