import React from "react";
import { Lock, Mail, ArrowRight } from "lucide-react";
import { login } from "./actions";

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Shapes */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-light/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl"></div>

      <div className="w-full max-w-md relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl card-shadow border border-white/50">
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 flex justify-center">
              <img src="/logo.png" alt="Movida TCI Logo" className="h-12 w-auto object-contain" />
            </div>
            <h1 className="text-3xl font-bold text-text-main">Movida ERP</h1>
            <p className="text-text-muted mt-2 text-sm">Ingresa tus credenciales para acceder al sistema.</p>
          </div>

          <form action={login} className="space-y-5">
            {searchParams?.error && (
              <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm text-center">
                {searchParams.error}
              </div>
            )}
            
            <div className="space-y-1">
              <label className="text-sm font-semibold text-text-main ml-1">Correo Electrónico</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="w-5 h-5 text-slate-400" />
                </div>
                <input 
                  type="email" 
                  name="email"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-text-main"
                  placeholder="admin@movida.com"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-text-main ml-1">Contraseña</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-slate-400" />
                </div>
                <input 
                  type="password" 
                  name="password"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-text-main"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer text-text-muted">
                <input type="checkbox" className="rounded text-primary focus:ring-primary border-slate-300 w-4 h-4" />
                Recordarme
              </label>
              <a href="#" className="font-semibold text-primary hover:text-primary-light transition-colors">
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            <button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary-light text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-primary/25 mt-4"
            >
              Iniciar Sesión
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        </div>
        
        <p className="text-center text-text-muted text-sm mt-8">
          © 2026 Movida TCI. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}
