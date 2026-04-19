import { Outlet, Link } from 'react-router-dom';
import { BarChart3, PlusCircle } from 'lucide-react';

export default function Layout() {
  return (
    <div className="min-h-screen text-slate-200 font-sans">
      <nav className="bg-slate-950/40 backdrop-blur-2xl border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-black text-2xl tracking-tighter text-white group">
            <div className="bg-gradient-to-br from-primary-500 to-indigo-600 p-1.5 rounded-lg shadow-lg group-hover:scale-110 transition-transform relative">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <span>PollVerse</span>
          </Link>
          <Link to="/create" className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest bg-white text-slate-950 px-6 py-3 rounded-xl shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:bg-primary-500 hover:text-white hover:-translate-y-1 transition-all duration-300">
            <PlusCircle className="w-4 h-4" />
            <span>Create Poll</span>
          </Link>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Outlet />
      </main>
    </div>
  );
}
