import { Outlet, Link } from 'react-router-dom';
import { BarChart3, PlusCircle } from 'lucide-react';

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <nav className="bg-white/70 backdrop-blur-md border-b border-white/20 shadow-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary-600">
            <BarChart3 className="w-6 h-6" />
            <span>PollVerse</span>
          </Link>
          <Link to="/create" className="flex items-center gap-2 text-sm font-medium bg-primary-600 text-white px-5 py-2 rounded-full shadow-md shadow-primary-500/20 hover:bg-primary-700 hover:shadow-lg hover:-translate-y-0.5 transition-all">
            <PlusCircle className="w-4 h-4" />
            <span>Create Poll</span>
          </Link>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
