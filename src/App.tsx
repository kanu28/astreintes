import React, { useState, useEffect, useRef } from 'react';
import { 
  Clipboard, 
  Check, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  User, 
  Briefcase, 
  Plus, 
  Trash2, 
  FileText,
  Activity,
  PhoneIncoming,
  Sparkles,
  Loader2,
  Send,
  CheckCircle,
  Settings,
  X,
  Server,
  LogOut,
  ShieldCheck,
  ArrowRight,
  Siren,
  ArrowUpRight,
  Info,
  Mail
} from 'lucide-react';

// --- Configuration par défaut ---
const DEFAULT_PROVIDER = 'gemini'; 
const DEFAULT_GEMINI_KEY = ""; 

// --- Configuration Emails ---
const ESCALATION_EMAILS: Record<string, string> = {
  'Manager de Garde': 'manager-astreinte@entreprise.com',
  'Expert N3': 'experts-n3@entreprise.com',
  'Fournisseur / Éditeur': 'support-vendor@externe.com',
  'Sécurité / SSI': 'soc@entreprise.com',
  'Autre': 'support@entreprise.com'
};

// Types
type Severity = 'critical' | 'major' | 'minor' | 'info';
type CallerType = 'Support Radio' | 'Support TV' | 'ATS' | 'Autre';
type EscalationTarget = 'Manager de Garde' | 'Expert N3' | 'Fournisseur / Éditeur' | 'Sécurité / SSI' | 'Autre';
type AiProvider = 'gemini' | 'custom';

interface EscalationData {
  active: boolean;
  target: EscalationTarget;
  targetName?: string;
  time: string;
}

interface Incident {
  id: string;
  time: string;
  date: string;
  title: string;
  severity: Severity;
  description: string;
  action: string;
  newActionInput: string;
  caller: CallerType;
  callerOther?: string;
  escalation: EscalationData;
}

interface ReportInfo {
  assignee: string;
  team: string;
  startDate: string;
  endDate: string;
  summary: string;
}

interface ApiConfig {
  provider: AiProvider;
  customUrl: string;
  customKey: string;
  customModelName: string;
}

interface UserCredentials {
  firstName: string;
  lastName: string;
  team: string;
}

// --- Composants UI Utilitaires ---

const IncidentSeverityBadge = ({ severity }: { severity: Severity }) => {
  const styles = {
    critical: 'bg-red-100 text-red-800 border-red-200',
    major: 'bg-orange-100 text-orange-800 border-orange-200',
    minor: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${styles[severity]}`}>
      {severity.toUpperCase()}
    </span>
  );
};

const AutoResizeTextarea = ({ value, onChange, placeholder, className, style }: { 
  value: string, 
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void, 
  placeholder?: string, 
  className?: string,
  style?: React.CSSProperties
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      rows={1}
      style={{ ...style, overflow: 'hidden', resize: 'none' }}
    />
  );
};

// --- PAGE DE LOGIN ---

const LoginPage = ({ onLogin }: { onLogin: (creds: UserCredentials) => void }) => {
  const [creds, setCreds] = useState<UserCredentials>({
    firstName: '',
    lastName: '',
    team: 'Tech / Infra'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (creds.firstName && creds.lastName) {
      onLogin(creds);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl z-10 overflow-hidden">
        <div className="bg-slate-50 p-8 text-center border-b border-slate-100">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-4 shadow-sm">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Portail Astreinte</h1>
          <p className="text-slate-500 text-sm mt-1">Connexion sécurisée intervenant</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Prénom</label>
              <input type="text" required className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Jean" value={creds.firstName} onChange={e => setCreds({...creds, firstName: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nom</label>
              <input type="text" required className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Dupont" value={creds.lastName} onChange={e => setCreds({...creds, lastName: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Équipe / Service</label>
            <input type="text" className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="DevOps / Backend" value={creds.team} onChange={e => setCreds({...creds, team: e.target.value})} />
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-lg shadow-lg flex items-center justify-center gap-2 mt-2">
            Accéder au Rapport <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

// --- APPLICATION PRINCIPALE ---

const ReportGenerator = ({ user, onLogout }: { user: UserCredentials, onLogout: () => void }) => {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const [apiConfig, setApiConfig] = useState<ApiConfig>({
    provider: DEFAULT_PROVIDER,
    customUrl: 'https://api.openai.com/v1/chat/completions',
    customKey: '',
    customModelName: 'gpt-4o'
  });
  
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [enhancingId, setEnhancingId] = useState<string | null>(null);
  const [enhancingActionId, setEnhancingActionId] = useState<string | null>(null);
  const [generatingTitleId, setGeneratingTitleId] = useState<string | null>(null);
  const [finishingIncidentId, setFinishingIncidentId] = useState<string | null>(null);

  const [info, setInfo] = useState<ReportInfo>({
    assignee: `${user.firstName} ${user.lastName}`,
    team: user.team,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    summary: 'Semaine calme, aucun incident majeur à signaler.',
  });

  const [incidents, setIncidents] = useState<Incident[]>([]);

  // --- LOGIQUE API ---
  const callAI = async (prompt: string): Promise<string> => {
    try {
      if (apiConfig.provider === 'gemini') {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${DEFAULT_GEMINI_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
          }
        );
        if (!response.ok) throw new Error(`Gemini Error: ${response.status}`);
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      } else {
        const response = await fetch(apiConfig.customUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiConfig.customKey}`,
          },
          body: JSON.stringify({
            model: apiConfig.customModelName,
            messages: [
              { role: "system", content: "Tu es un outil de reformulation technique strict." },
              { role: "user", content: prompt }
            ],
            temperature: 0.3
          }),
        });
        if (!response.ok) throw new Error(`Custom API Error: ${response.status}`);
        const data = await response.json();
        return data.choices?.[0]?.message?.content || data.response || ""; 
      }
    } catch (error) {
      console.error("AI API call failed:", error);
      return "";
    }
  };

  // --- Handlers ---
  const handleInfoChange = (field: keyof ReportInfo, value: string) => setInfo(prev => ({ ...prev, [field]: value }));
  const addIncident = () => setIncidents([...incidents, { id: Math.random().toString(36).substr(2, 9), date: new Date().toISOString().split('T')[0], time: '00:00', title: '', severity: 'minor', description: '', action: '', newActionInput: '', caller: 'Support Radio', callerOther: '', escalation: { active: false, target: 'Expert N3', time: '00:00' } }]);
  const updateIncident = (id: string, field: keyof Incident, value: any) => setIncidents(incidents.map(inc => inc.id === id ? { ...inc, [field]: value } : inc));
  const updateEscalation = (id: string, field: keyof EscalationData, value: any) => setIncidents(incidents.map(inc => inc.id === id ? { ...inc, escalation: { ...inc.escalation, [field]: value } } : inc));
  const toggleEscalation = (id: string) => setIncidents(incidents.map(inc => { if (inc.id === id) { const newState = !inc.escalation.active; const now = new Date(); const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`; return { ...inc, escalation: { ...inc.escalation, active: newState, time: newState ? currentTime : inc.escalation.time } }; } return inc; }));
  const removeIncident = (id: string) => setIncidents(incidents.filter(inc => inc.id !== id));
  const addIteration = (id: string, currentHistory: string, newEntry: string) => { if (!newEntry.trim()) return; const now = new Date(); const entry = `[${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}] ${newEntry.trim()}`; setIncidents(incidents.map(inc => inc.id === id ? { ...inc, action: currentHistory ? currentHistory + '\n' + entry : entry, newActionInput: '' } : inc)); };

  // --- AI HELPERS ---
  const generateGlobalSummary = async (customIncidents?: Incident[]) => {
    const sourceIncidents = customIncidents || incidents;
    if (sourceIncidents.length === 0) return;
    setIsSummarizing(true);
    
    const incidentsText = sourceIncidents.map(inc => 
      `- [${inc.severity}] ${inc.title || 'Incident sans titre'}: ${inc.description || 'Pas de description'}`
    ).join('\n');
    
    const prompt = `Rédige un résumé exécutif technique en français (max 3 lignes) pour ces incidents. Ton: Factuel strict. Pas d'intro, pas de conclusion. Texte brut uniquement.\n\n${incidentsText}`;
    
    const result = await callAI(prompt);
    if (result) handleInfoChange('summary', result.trim());
    setIsSummarizing(false);
  };

  const enhanceDescription = async (id: string, text: string) => { 
    if (!text) return; 
    setEnhancingId(id); 
    const r = await callAI(`Reformule le texte suivant pour un rapport technique. Corrige les fautes. Sois concis et factuel. Renvoie UNIQUEMENT le texte reformulé.\n\nTexte: "${text}"`); 
    if (r) updateIncident(id, 'description', r.trim()); 
    setEnhancingId(null); 
  };

  const enhanceNewAction = async (id: string, text: string) => { 
    if (!text) return; 
    setEnhancingActionId(id); 
    const r = await callAI(`Reformule cette ligne de log technique. Corrige les fautes. Reste très court. Renvoie UNIQUEMENT le texte reformulé.\n\nTexte: "${text}"`); 
    if (r) updateIncident(id, 'newActionInput', r.trim()); 
    setEnhancingActionId(null); 
  };

  const generateTitle = async (id: string, text: string) => { 
    if (!text) { alert("Description vide"); return; } 
    setGeneratingTitleId(id); 
    const r = await callAI(`Génère un titre d'incident technique (max 6 mots) basé sur cette description. Pas de ponctuation finale. Texte brut uniquement.\n\nDescription: "${text}"`); 
    if (r) updateIncident(id, 'title', r.trim()); 
    setGeneratingTitleId(null); 
  };

  const handleFinishIncident = async (incident: Incident) => {
    setFinishingIncidentId(incident.id);
    let finalTitle = incident.title;
    if (!finalTitle.trim() && incident.description.trim()) {
       const generatedTitle = await callAI(`Génère un titre d'incident technique (max 6 mots) basé sur cette description. Pas de ponctuation finale. Texte brut uniquement.\n\nDescription: "${incident.description}"`);
       if (generatedTitle) { 
           finalTitle = generatedTitle.trim(); 
           updateIncident(incident.id, 'title', finalTitle); 
       }
    }
    const updatedList = incidents.map(i => i.id === incident.id ? { ...i, title: finalTitle } : i);
    await generateGlobalSummary(updatedList);
    setFinishingIncidentId(null);
  };

  const stats = { critical: incidents.filter(i => i.severity === 'critical').length, major: incidents.filter(i => i.severity === 'major').length, minor: incidents.filter(i => i.severity === 'minor').length, escalations: incidents.filter(i => i.escalation.active).length, total: incidents.length };
  
  const generateMarkdown = () => {
    const severityEmoji = { critical: '🔴', major: '🟠', minor: '🟡', info: '🔵' };
    let md = `*Rapport d'Astreinte*\n*Intervenant:* ${info.assignee}\n*Équipe:* ${info.team}\n*Période:* ${info.startDate} au ${info.endDate}\n\n*Résumé Global:*\n${info.summary}\n\n*Métriques:*\n- Total: ${stats.total}\n- Critiques: ${stats.critical} | Majeurs: ${stats.major}\n- 🚨 Escalades: ${stats.escalations}\n\n`;
    if (incidents.length > 0) {
      md += `*Détail des interventions:*\n`;
      incidents.forEach(inc => {
        const callerDisplay = inc.caller === 'Autre' ? (inc.callerOther || 'Autre') : inc.caller;
        const escalationBlock = inc.escalation.active ? `\n🚨 **ESCALADE** -> Vers : *${inc.escalation.target === 'Autre' ? inc.escalation.targetName : inc.escalation.target}* à ${inc.escalation.time}` : '';
        md += `\n-------------------\n${severityEmoji[inc.severity]} *${inc.title || 'Incident sans titre'}*\n📅 ${inc.date} à ${inc.time}\n👤 *Appelant:* ${callerDisplay}\n📝 *Description:* ${inc.description}${escalationBlock}\n✅ *Suivi:*\n${(inc.action || '').split('\n').map(l => `> ${l}`).join('\n')}\n`;
      });
    } else { md += `\n✅ RAS.`; }
    return md;
  };

  const copyToClipboard = () => {
    const text = generateMarkdown();
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch (err) { console.error('Failed to copy', err); }
    document.body.removeChild(textArea);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Settings Modal */}
      {showSettings && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-lg p-6 w-full max-w-md"><h2 className="font-bold mb-4">Settings</h2><button onClick={() => setShowSettings(false)} className="bg-slate-200 px-4 py-2 rounded">Fermer</button></div></div>}

      <header className="bg-slate-900 text-white p-4 shadow-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2"><Activity className="text-blue-400" size={24} /><h1 className="text-xl font-bold hidden sm:block">Rapport d'Astreinte</h1></div>
          <div className="flex items-center gap-2">
             <div className="hidden md:flex items-center mr-4 bg-slate-800 px-3 py-1.5 rounded-full text-xs text-slate-300 border border-slate-700"><div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>{user.firstName} {user.lastName}</div>
             <button onClick={() => setActiveTab('edit')} className={`px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'edit' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>Éditeur</button>
             <button onClick={() => setActiveTab('preview')} className={`px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'preview' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>Aperçu</button>
             <button onClick={() => setShowSettings(true)} className="px-2 sm:px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"><Settings size={18} /></button>
             <button onClick={onLogout} className="ml-1 px-2 sm:px-3 py-2 rounded-md bg-red-900/30 hover:bg-red-900/50 text-red-200 border border-red-900/50 transition-colors"><LogOut size={18} /></button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-6">
        {/* =================== EDIT VIEW =================== */}
        {activeTab === 'edit' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Col */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 sticky top-24">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><User size={18} /> Informations Générales</h2>
                <div className="space-y-4">
                  <div><label className="block text-sm font-medium text-slate-600 mb-1">Intervenant</label><input type="text" className="w-full p-2 border border-slate-300 rounded outline-none focus:border-blue-500 bg-slate-50 text-slate-600 font-medium" value={info.assignee} onChange={(e) => handleInfoChange('assignee', e.target.value)} /></div>
                  <div><label className="block text-sm font-medium text-slate-600 mb-1">Équipe</label><input type="text" className="w-full p-2 border border-slate-300 rounded outline-none focus:border-blue-500 bg-slate-50 text-slate-600" value={info.team} onChange={(e) => handleInfoChange('team', e.target.value)} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-sm font-medium text-slate-600 mb-1">Début</label><input type="date" className="w-full p-2 border border-slate-300 rounded text-sm" value={info.startDate} onChange={(e) => handleInfoChange('startDate', e.target.value)} /></div>
                    <div><label className="block text-sm font-medium text-slate-600 mb-1">Fin</label><input type="date" className="w-full p-2 border border-slate-300 rounded text-sm" value={info.endDate} onChange={(e) => handleInfoChange('endDate', e.target.value)} /></div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1"><label className="block text-sm font-medium text-slate-600">Résumé de la période</label><button onClick={() => generateGlobalSummary()} disabled={isSummarizing || incidents.length === 0} className="text-xs flex items-center gap-1 text-purple-600 hover:text-purple-800 font-medium disabled:opacity-50 transition-colors">{isSummarizing ? <Loader2 className="animate-spin" size={12}/> : <Sparkles size={12} />} {isSummarizing ? 'Génération...' : 'Générer avec IA'}</button></div>
                    <textarea className="w-full p-2 border border-slate-300 rounded h-32 text-sm outline-none resize-none" placeholder="Globalement calme..." value={info.summary} onChange={(e) => handleInfoChange('summary', e.target.value)} />
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div><div className="text-xl font-bold text-slate-800">{stats.total}</div><div className="text-[10px] uppercase text-slate-500">Total</div></div>
                      <div><div className="text-xl font-bold text-red-600">{stats.critical}</div><div className="text-[10px] uppercase text-red-500">Critiques</div></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Col */}
            <div className="lg:col-span-2 space-y-6">
               <div className="flex justify-between items-center">
                 <h2 className="text-lg font-semibold flex items-center gap-2"><AlertTriangle size={18} /> Journal des Incidents</h2>
                 <button onClick={addIncident} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"><Plus size={16} /> Ajouter un incident</button>
               </div>
               {incidents.length === 0 ? (
                 <div className="bg-white border-2 border-dashed border-slate-300 rounded-lg p-12 text-center text-slate-500"><CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-3" /><p className="font-medium">Aucun incident. Semaine calme !</p></div>
               ) : (
                 <div className="space-y-4">
                   {incidents.map((inc) => (
                     <div key={inc.id} className={`bg-white p-5 rounded-lg shadow-sm border relative group transition-colors ${inc.escalation.active ? 'border-orange-300 ring-1 ring-orange-100' : 'border-slate-200'}`}>
                        <button onClick={() => removeIncident(inc.id)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                          <div className="md:col-span-3 space-y-3">
                            <div>
                              <label className="block text-xs font-semibold text-slate-400 mb-1">DATE & HEURE</label>
                              <div className="flex flex-wrap xl:flex-nowrap gap-2">
                                <input type="date" className="w-full text-sm border-slate-300 rounded p-1" value={inc.date} onChange={(e) => updateIncident(inc.id, 'date', e.target.value)} />
                                <input type="time" className="w-full xl:w-24 text-sm border-slate-300 rounded p-1" value={inc.time} onChange={(e) => updateIncident(inc.id, 'time', e.target.value)} />
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-400 mb-1">SÉVÉRITÉ</label>
                              <select className="w-full text-sm border-slate-300 rounded p-1.5 bg-white" value={inc.severity} onChange={(e) => updateIncident(inc.id, 'severity', e.target.value as Severity)}>
                                <option value="critical">Critique (P1)</option>
                                <option value="major">Majeur (P2)</option>
                                <option value="minor">Mineur (P3)</option>
                                <option value="info">Information</option>
                              </select>
                            </div>
                            <div className="pt-2">
                                <button onClick={() => toggleEscalation(inc.id)} className={`w-full text-xs py-2 px-2 rounded border flex items-center justify-center gap-1 transition-all ${inc.escalation.active ? 'bg-orange-50 text-orange-700 border-orange-200 font-semibold' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}>
                                  {inc.escalation.active ? <Siren size={14}/> : <ArrowUpRight size={14}/>} {inc.escalation.active ? 'Escalade Active' : 'Déclencher Escalade'}
                                </button>
                            </div>
                          </div>
                          
                          <div className="md:col-span-9 space-y-3">
                            {inc.escalation.active && (
                              <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                                <div className="bg-blue-50 border border-blue-100 rounded p-2 text-xs text-blue-800 flex items-start gap-2">
                                  <Info size={14} className="mt-0.5 shrink-0"/>
                                  <p><strong>Conseil SRE :</strong> Décrivez précisément l'impact actuel et listez chronologiquement les actions techniques déjà effectuées pour aider le niveau supérieur.</p>
                                </div>
                                <div className="bg-orange-50 border border-orange-200 rounded-md p-3 flex flex-wrap items-center gap-3">
                                  <div className="flex items-center gap-2 text-orange-800 text-sm font-semibold"><Siren size={16} className="animate-pulse"/> ESCALADE</div>
                                  <div className="h-4 w-px bg-orange-200 hidden sm:block"></div>
                                  <div className="flex items-center gap-2 flex-1">
                                    <span className="text-xs text-orange-700 font-medium uppercase">Vers:</span>
                                    <select className="text-sm border-orange-200 rounded p-1 bg-white text-orange-900" value={inc.escalation.target} onChange={(e) => updateEscalation(inc.id, 'target', e.target.value)}>
                                      {Object.keys(ESCALATION_EMAILS).map(k => <option key={k} value={k}>{k}</option>)}
                                    </select>
                                    {inc.escalation.target === 'Autre' && (<input type="text" className="text-sm border-orange-200 rounded p-1 w-32" placeholder="Qui ?" value={inc.escalation.targetName} onChange={(e) => updateEscalation(inc.id, 'targetName', e.target.value)} />)}
                                  </div>
                                  <div className="flex items-center gap-2"><span className="text-xs text-orange-700 font-medium uppercase">Heure:</span><input type="time" className="text-sm border-orange-200 rounded p-1 w-20 bg-white" value={inc.escalation.time} onChange={(e) => updateEscalation(inc.id, 'time', e.target.value)} /></div>
                                </div>
                              </div>
                            )}

                            <div className="flex gap-2 items-end">
                              <div className="flex-1"><input type="text" className="w-full font-medium text-slate-800 border-0 border-b border-slate-200 focus:border-blue-500 outline-none px-0 py-1" placeholder="Titre de l'incident" value={inc.title} onChange={(e) => updateIncident(inc.id, 'title', e.target.value)} /></div>
                              <button onClick={() => generateTitle(inc.id, inc.description)} disabled={generatingTitleId === inc.id || !inc.description} className="text-purple-600 hover:text-purple-800 disabled:opacity-30 mb-1">{generatingTitleId === inc.id ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={16} />}</button>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-md border border-slate-100 flex flex-wrap items-center gap-3">
                               <div className="flex items-center gap-2 text-slate-500"><PhoneIncoming size={16} /><span className="text-xs font-bold uppercase tracking-wide">Appelant:</span></div>
                               <select className="text-sm border-slate-300 rounded border p-1 bg-white" value={inc.caller} onChange={(e) => updateIncident(inc.id, 'caller', e.target.value)}><option value="Support Radio">Support Radio</option><option value="Support TV">Support TV</option><option value="ATS">ATS</option><option value="Autre">Autre...</option></select>
                               {inc.caller === 'Autre' && (<input type="text" className="flex-1 text-sm border-slate-300 rounded border p-1 min-w-[150px]" placeholder="Préciser..." value={inc.callerOther} onChange={(e) => updateIncident(inc.id, 'callerOther', e.target.value)} />)}
                            </div>
                            <div className="relative">
                              <textarea className="w-full text-sm text-slate-600 border border-slate-200 rounded p-2 resize-none h-24 pr-8" placeholder="Description du problème..." value={inc.description} onChange={(e) => updateIncident(inc.id, 'description', e.target.value)} />
                              <button onClick={() => enhanceDescription(inc.id, inc.description)} disabled={enhancingId === inc.id || !inc.description} className="absolute right-2 bottom-2 text-purple-400 hover:text-purple-600 bg-white p-1 rounded-full shadow-sm border border-slate-100 disabled:opacity-30">{enhancingId === inc.id ? <Loader2 className="animate-spin" size={14}/> : <Sparkles size={14} />}</button>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                              <div className="flex flex-col">
                                <div className="mb-4 relative">
                                  <textarea className="w-full text-sm border border-slate-300 rounded p-2 pr-24 resize-none h-20" placeholder="Nouvelle itération..." value={inc.newActionInput} onChange={(e) => updateIncident(inc.id, 'newActionInput', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addIteration(inc.id, inc.action, inc.newActionInput); }}} />
                                  <div className="absolute right-2 bottom-2 flex gap-1 items-center">
                                    <button onClick={() => enhanceNewAction(inc.id, inc.newActionInput)} disabled={enhancingActionId === inc.id || !inc.newActionInput} className="text-purple-400 hover:text-purple-600 bg-white p-1 rounded-full shadow-sm border border-slate-100 disabled:opacity-30 mr-2">{enhancingActionId === inc.id ? <Loader2 className="animate-spin" size={14}/> : <Sparkles size={14} />}</button>
                                    <button onClick={() => addIteration(inc.id, inc.action, inc.newActionInput)} disabled={!inc.newActionInput.trim()} className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1"><Send size={14} /> Ajouter</button>
                                  </div>
                                </div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1">HISTORIQUE DES ACTIONS</label>
                                <AutoResizeTextarea className="w-full text-sm border border-slate-200 rounded p-2 font-mono text-xs leading-relaxed bg-slate-50 focus:bg-white" placeholder="Historique vide..." value={inc.action || ''} onChange={(e) => updateIncident(inc.id, 'action', e.target.value)} style={{ minHeight: '60px' }} />
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-3 flex justify-end border-t border-slate-100 pt-3">
                          <button
                            onClick={() => handleFinishIncident(inc)}
                            disabled={finishingIncidentId === inc.id || isSummarizing}
                            className={`flex items-center gap-2 text-xs transition-colors px-4 py-2 rounded-md font-medium shadow-sm border ${
                               finishingIncidentId === inc.id 
                                ? 'bg-slate-100 text-slate-500 cursor-wait'
                                : 'bg-white text-slate-500 hover:text-green-600 hover:bg-green-50 border-slate-200'
                              } disabled:opacity-50`}
                            title="Clore l'incident et mettre à jour le résumé"
                          >
                            {finishingIncidentId === inc.id ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                            <span>
                              {finishingIncidentId === inc.id ? 'Mise à jour...' : 'Terminer & Mettre à jour le résumé'}
                            </span>
                          </button>
                        </div>
                     </div>
                   ))}
                 </div>
               )}
            </div>
          </div>
        )}

        {/* =================== PREVIEW VIEW =================== */}
        {activeTab === 'preview' && (
          <div className="max-w-4xl mx-auto animate-in fade-in duration-300">
            <div className="bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                 <h2 className="font-semibold text-slate-700 flex items-center gap-2"><FileText size={18} /> Aperçu du Rapport</h2>
                 <button onClick={copyToClipboard} className={`flex items-center gap-2 px-6 py-2 rounded-md font-medium transition-all transform active:scale-95 shadow-sm ${copied ? 'bg-green-600 text-white' : 'bg-indigo-600 text-white'}`}>
                   {copied ? <Check size={18} /> : <Clipboard size={18} />} {copied ? 'Copié !' : 'Copier le rapport (Markdown)'}
                 </button>
              </div>
              <div className="p-8 md:p-12 bg-white text-slate-800 leading-relaxed">
                <div className="border-b-2 border-slate-100 pb-6 mb-6">
                  <h1 className="text-3xl font-bold text-slate-900 mb-2">Rapport d'Astreinte</h1>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-500">
                    <div className="flex items-center gap-2"><User size={16} /> {info.assignee}</div>
                    <div className="flex items-center gap-2"><Briefcase size={16} /> {info.team}</div>
                    <div className="flex items-center gap-2 md:col-span-2"><Calendar size={16} /> Du {new Date(info.startDate).toLocaleDateString('fr-FR')} au {new Date(info.endDate).toLocaleDateString('fr-FR')}</div>
                  </div>
                </div>
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-slate-900 mb-3 uppercase tracking-wide text-xs border-l-4 border-blue-500 pl-3">Résumé Exécutif</h3>
                  <p className="text-slate-600 whitespace-pre-line bg-slate-50 p-4 rounded-md">{info.summary || "Aucun résumé saisi."}</p>
                </div>
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-slate-900 mb-3 uppercase tracking-wide text-xs border-l-4 border-indigo-500 pl-3">Métriques</h3>
                  <div className="flex gap-4">
                    <div className="bg-slate-50 px-4 py-2 rounded border border-slate-100"><span className="font-bold text-slate-900">{stats.total}</span> <span className="text-slate-500">Incidents au total</span></div>
                    {stats.critical > 0 && (<div className="bg-red-50 px-4 py-2 rounded border border-red-100 text-red-700"><span className="font-bold">{stats.critical}</span> Critiques</div>)}
                    {stats.escalations > 0 && (<div className="bg-orange-50 px-4 py-2 rounded border border-orange-100 text-orange-700 flex items-center gap-2"><Siren size={16}/><span className="font-bold">{stats.escalations}</span> Escalades</div>)}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-4 uppercase tracking-wide text-xs border-l-4 border-slate-500 pl-3">Détail des Interventions</h3>
                  {incidents.length === 0 ? (<p className="italic text-slate-500">Rien à signaler.</p>) : (
                    <div className="space-y-6">
                      {incidents.map((inc) => (
                        <div key={inc.id} className={`border rounded-lg overflow-hidden ${inc.escalation.active ? 'border-orange-200 ring-2 ring-orange-50' : 'border-slate-200'}`}>
                          <div className={`p-3 border-b flex flex-wrap justify-between items-start gap-y-2 gap-x-4 ${inc.escalation.active ? 'bg-orange-50/50 border-orange-100' : 'bg-slate-50 border-slate-200'}`}>
                             <div className="flex items-start gap-3 flex-1 min-w-[200px]">
                               <div className="mt-0.5 shrink-0"><IncidentSeverityBadge severity={inc.severity} /></div>
                               <span className="font-semibold text-slate-800 break-words leading-tight">{inc.title || 'Incident sans titre'}</span>
                             </div>
                             <div className="flex items-center gap-4 shrink-0">
                                <div className="text-xs text-slate-600 flex items-center gap-1 bg-white px-2 py-1 rounded border border-slate-200"><PhoneIncoming size={12} /><span>Appelant: {inc.caller === 'Autre' ? (inc.callerOther || 'Autre') : inc.caller}</span></div>
                                <div className="text-xs text-slate-500 flex items-center gap-1 whitespace-nowrap"><Clock size={14} /> {new Date(inc.date).toLocaleDateString('fr-FR')} {inc.time}</div>
                             </div>
                          </div>
                          <div className="p-4 space-y-3 text-sm">
                            {inc.escalation.active && (
                              <div className="bg-orange-50 text-orange-800 p-2 rounded text-xs font-bold border border-orange-100 flex items-center gap-2">
                                <Siren size={14}/>
                                ESCALADE : {inc.escalation.target === 'Autre' ? inc.escalation.targetName : inc.escalation.target} à {inc.escalation.time}
                              </div>
                            )}
                            <div><span className="font-semibold text-slate-700 block mb-1">Description:</span><p className="text-slate-600">{inc.description || 'N/A'}</p></div>
                            <div className="grid grid-cols-1 gap-4 pt-2 border-t border-slate-100 mt-2">
                               <div><span className="font-semibold text-slate-700 block mb-1">Suivi:</span><div className="text-slate-600 whitespace-pre-line bg-slate-50 p-2 rounded text-xs font-mono">{inc.action || 'N/A'}</div></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-slate-100 p-4 text-center text-xs text-slate-500 border-t border-slate-200">Généré automatiquement via l'outil Rapport d'Astreinte</div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<UserCredentials | null>(null);
  if (!user) return <LoginPage onLogin={setUser} />;
  return <ReportGenerator user={user} onLogout={() => setUser(null)} />;
}