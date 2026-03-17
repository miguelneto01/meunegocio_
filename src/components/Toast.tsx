import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

let addToastHandler: (msg: string, type: ToastType) => void = () => {};

export const showToast = (msg: string, type: ToastType = 'info') => {
  addToastHandler(msg, type);
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: ToastType }[]>([]);

  useEffect(() => {
    let idCounter = 0;
    addToastHandler = (msg, type) => {
      const id = idCounter++;
      setToasts(prev => [...prev, { id, msg, type }]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 3000);
    };
  }, []);

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border bg-white min-w-[250px] ${
              t.type === 'success' ? 'border-emerald-500 text-emerald-700' :
              t.type === 'error' ? 'border-red-500 text-red-700' :
              t.type === 'warning' ? 'border-amber-500 text-amber-700' :
              'border-blue-500 text-blue-700'
            }`}
          >
            {t.type === 'success' && <CheckCircle size={20} className="text-emerald-500" />}
            {t.type === 'error' && <AlertCircle size={20} className="text-red-500" />}
            {t.type === 'warning' && <AlertTriangle size={20} className="text-amber-500" />}
            {t.type === 'info' && <Info size={20} className="text-blue-500" />}
            <span className="font-medium">{t.msg}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
