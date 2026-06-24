import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send, Bot, User, Sparkles, Code2, Terminal, BookOpen, Loader2,
  Plus, MessageSquare, Trash2, Pencil, FolderCode, GraduationCap,
  PanelLeftClose, PanelLeft, ChevronDown, ChevronRight,
  Paperclip, Image as ImageIcon, FileText, Download, X,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

const API_URL = "https://aura-jwp9.onrender.com/api/run";
const STORAGE_KEY = "aura-chat-conversations";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_FILES = 4;
const ACCEPTED_TYPES = [
  "image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml",
  "application/pdf",
];

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function loadConversations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveConversations(conversations) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch {
    /* storage full */
  }
}

function generateTitle(firstMessage) {
  const max = 35;
  const clean = firstMessage.replace(/\n/g, " ").trim();
  return clean.length > max ? clean.slice(0, max) + "..." : clean;
}

function formatDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Ahora";
  if (diffMins < 60) return `Hace ${diffMins}m`;
  if (diffHours < 24) return `Hace ${diffHours}h`;
  if (diffDays < 7) return `Hace ${diffDays}d`;
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function stripMarkdownFences(code) {
  const match = code.match(/^```[\w]*\n?([\s\S]*?)```$/);
  if (match) return match[1].trim();
  return code.trim();
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTES DE CÓDIGO / TERMINAL
// ═══════════════════════════════════════════════════════════════════════════════

function CodeBlock({ code, label, icon }) {
  const [copied, setCopied] = useState(false);
  const cleanCode = stripMarkdownFences(code);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cleanCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* */ }
  };

  return (
    <div className="rounded-lg overflow-hidden border border-zinc-700/50 my-2">
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-800/80 border-b border-zinc-700/50">
        <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium">
          {icon}{label}
        </div>
        <button onClick={handleCopy} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-0.5 rounded hover:bg-zinc-700/50">
          {copied ? "Copiado ✓" : "Copiar"}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm leading-relaxed bg-[#0d1117]">
        <code className="font-mono text-zinc-300 whitespace-pre">{cleanCode}</code>
      </pre>
    </div>
  );
}

function TerminalBlock({ output }) {
  return (
    <div className="rounded-lg overflow-hidden border border-green-900/40 my-2">
      <div className="flex items-center gap-2 px-3 py-2 bg-green-950/40 border-b border-green-900/30">
        <Terminal className="w-3.5 h-3.5 text-green-500" />
        <span className="text-green-500/80 text-xs font-medium">Salida de Consola</span>
      </div>
      <pre className="p-4 overflow-x-auto text-sm leading-relaxed bg-[#0a0a0a]">
        <code className="font-mono text-green-400 whitespace-pre">{output}</code>
      </pre>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BURBUJA DE RESPUESTA IA (3 SECCIONES)
// ═══════════════════════════════════════════════════════════════════════════════

function AiMessageBubble({ data }) {
  return (
    <div className="space-y-3">
      {/* Explicación Feynman */}
      <div className="flex items-start gap-2">
        <BookOpen className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-xs font-semibold text-amber-400/80 mb-1.5 uppercase tracking-wider">
            Explicación Feynman
          </p>
          <p className="text-zinc-300 leading-relaxed text-sm whitespace-pre-wrap">{data.explicacion}</p>
        </div>
      </div>
      <div className="border-t border-zinc-700/40" />

      {/* Código Final */}
      <div className="flex items-start gap-2">
        <Code2 className="w-4 h-4 text-sky-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-sky-400/80 mb-1.5 uppercase tracking-wider">Código Final</p>
          <CodeBlock code={data.codigo} label="source" icon={<Code2 className="w-3 h-3" />} />
        </div>
      </div>
      <div className="border-t border-zinc-700/40" />

      {/* Salida de Consola */}
      <div className="flex items-start gap-2">
        <Terminal className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-green-400/80 mb-1.5 uppercase tracking-wider">Salida de Consola</p>
          <TerminalBlock output={data.consola} />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// INDICADOR DE ESCRITURA
// ═══════════════════════════════════════════════════════════════════════════════

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 px-4 py-3">
      <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
      <span className="text-zinc-500 text-sm">Pensando...</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PREVIEW DE ARCHIVOS ADJUNTOS EN BURBUJAS
// ═══════════════════════════════════════════════════════════════════════════════

function ChatAttachmentPreview({ attachment }) {
  if (attachment.type === "image") {
    return (
      <div className="mb-2 rounded-xl overflow-hidden border border-zinc-600/30 max-w-[300px]">
        <img
          src={attachment.dataUrl}
          alt={attachment.name}
          className="w-full h-auto max-h-[280px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => window.open(attachment.dataUrl, "_blank")}
        />
        <div className="px-2.5 py-1.5 bg-zinc-800/60 flex items-center gap-1.5">
          <ImageIcon className="w-3 h-3 text-zinc-500" />
          <span className="text-[10px] text-zinc-400 truncate">{attachment.name}</span>
          <span className="text-[10px] text-zinc-600 ml-auto">{formatFileSize(attachment.size)}</span>
        </div>
      </div>
    );
  }

  // PDF
  return (
    <div className="mb-2 flex items-center gap-3 bg-zinc-800/50 border border-zinc-700/40 rounded-xl px-3 py-2.5 max-w-[300px]">
      <div className="w-10 h-10 rounded-lg bg-red-950/40 flex items-center justify-center flex-shrink-0">
        <FileText className="w-5 h-5 text-red-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-zinc-300 truncate">{attachment.name}</p>
        <p className="text-[10px] text-zinc-600">{formatFileSize(attachment.size)}</p>
      </div>
      <a
        href={attachment.dataUrl}
        download={attachment.name}
        className="p-1.5 rounded-lg hover:bg-zinc-700/50 text-zinc-500 hover:text-zinc-300 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <Download className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PREVIEW DE ARCHIVOS EN INPUT (ANTES DE ENVIAR)
// ═══════════════════════════════════════════════════════════════════════════════

function InputFilePreview({ files, onRemove }) {
  if (files.length === 0) return null;

  return (
    <div className="flex gap-2 pb-2 overflow-x-auto">
      {files.map((f) => (
        <div key={f.id} className="relative group flex-shrink-0">
          {f.type === "image" ? (
            <div className="w-20 h-20 rounded-lg overflow-hidden border border-zinc-700/50 relative">
              <img src={f.dataUrl} alt={`Vista previa de ${f.name}`} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-[9px] text-white px-1 truncate max-w-full">{f.name}</span>
              </div>
            </div>
          ) : (
            <div className="w-20 h-20 rounded-lg border border-zinc-700/50 bg-zinc-800/60 flex flex-col items-center justify-center gap-1 p-1">
              <FileText className="w-6 h-6 text-red-400" />
              <span className="text-[9px] text-zinc-400 truncate max-w-full text-center leading-tight">{f.name}</span>
            </div>
          )}
          <button
            onClick={() => onRemove(f.id)}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-zinc-800 border border-zinc-600 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-red-600 hover:border-red-600 transition-colors z-10"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PANTALLA DE BIENVENIDA
// ═══════════════════════════════════════════════════════════════════════════════

function WelcomeScreen({ onSuggestionClick }) {
  const suggestions = [
    "Explícame cómo funciona async/await en JavaScript",
    "Crea una función de ordenamiento quicksort en Python",
    "¿Qué es un closure en JavaScript y un ejemplo?",
    "Genera un componente React de un contador",
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center mb-6 shadow-lg shadow-zinc-900/50">
        <Sparkles className="w-8 h-8 text-zinc-300" />
      </div>
      <h1 className="text-2xl font-semibold text-zinc-100 mb-2">Aura Chat</h1>
      <p className="text-zinc-500 text-sm mb-8 max-w-md">
        Tu asistente de código con IA. Pregunta cualquier duda de programación y recibe una explicación Feynman, código funcional y su salida.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onSuggestionClick(s)}
            className="text-left text-sm text-zinc-400 hover:text-zinc-200 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-600/50 rounded-xl px-4 py-3 transition-all duration-200"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ITEM DE CONVERSACIÓN EN SIDEBAR
// ═══════════════════════════════════════════════════════════════════════════════

function ConversationItem({ conversation, isActive, onSelect, onDelete, onRename, onChangeType }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(conversation.title);
  const [showMenu, setShowMenu] = useState(false);

  const handleRenameSubmit = () => {
    const trimmed = editValue.trim();
    if (trimmed) onRename(trimmed);
    setIsEditing(false);
  };

  const handleRenameKeyDown = (e) => {
    if (e.key === "Enter") handleRenameSubmit();
    if (e.key === "Escape") { setIsEditing(false); setEditValue(conversation.title); }
  };

  const hasAttachments = conversation.messages.some((m) => m.attachments && m.attachments.length > 0);

  return (
    <div
      className={`group relative flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 ${
        isActive ? "bg-zinc-700/60 text-zinc-100" : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
      }`}
      onClick={() => { if (!isEditing) onSelect(); }}
    >
      <div className="relative">
        <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
        {hasAttachments && <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-sky-500" />}
      </div>

      {isEditing ? (
        <div className="flex-1 flex items-center gap-1">
          <input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleRenameKeyDown}
            onBlur={handleRenameSubmit}
            autoFocus
            className="flex-1 bg-zinc-800 text-zinc-100 text-xs rounded px-2 py-1 outline-none border border-zinc-600 focus:border-zinc-500"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : (
        <div className="flex-1 min-w-0">
          <p className="text-xs truncate">{conversation.title}</p>
          <p className="text-[10px] text-zinc-600 mt-0.5">{formatDate(conversation.updatedAt)}</p>
        </div>
      )}

      <div className={`flex items-center gap-0.5 ${isActive || showMenu ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition-opacity`}>
        <button
          onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
          className="p-1 rounded hover:bg-zinc-600/50 text-zinc-500 hover:text-zinc-300"
        >
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setShowMenu(false); }} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-zinc-800 border border-zinc-700/60 rounded-lg shadow-xl shadow-zinc-950/60 py-1 min-w-[180px]">
            <button
              onClick={(e) => { e.stopPropagation(); setEditValue(conversation.title); setIsEditing(true); setShowMenu(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-700/50 transition-colors"
            >
              <Pencil className="w-3 h-3" /> Renombrar
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onChangeType(conversation.type === "codigo" ? "estudio" : "codigo"); setShowMenu(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-700/50 transition-colors"
            >
              {conversation.type === "codigo" ? <GraduationCap className="w-3 h-3" /> : <FolderCode className="w-3 h-3" />}
              Mover a {conversation.type === "codigo" ? "Estudio" : "Código"}
            </button>
            <div className="border-t border-zinc-700/40 my-1" />
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); setShowMenu(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-950/30 transition-colors"
            >
              <Trash2 className="w-3 h-3" /> Eliminar
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIDEBAR
// ═══════════════════════════════════════════════════════════════════════════════

function Sidebar({
  conversations, activeId, isOpen,
  onSelectConversation, onNewConversation, onDeleteConversation,
  onRenameConversation, onChangeType, onClose,
}) {
  const [codeOpen, setCodeOpen] = useState(true);
  const [studyOpen, setStudyOpen] = useState(true);

  const codeConvs = conversations.filter((c) => c.type === "codigo");
  const studyConvs = conversations.filter((c) => c.type === "estudio");

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={onClose} />}

      <aside
        className={`fixed md:relative z-40 top-0 left-0 h-full w-[280px] bg-zinc-950 border-r border-zinc-800/60 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0 md:hidden"
        }`}
      >
        {/* Brand */}
        <div className="px-4 py-4 border-b border-zinc-800/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5 text-zinc-300" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-zinc-100 tracking-tight">Aura Chat</h1>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest">AI Assistant</p>
            </div>
          </div>
        </div>

        {/* Nueva conversación */}
        <div className="px-3 pt-3 pb-2">
          <button
            onClick={onNewConversation}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-zinc-800 hover:bg-zinc-700/80 border border-zinc-700/50 hover:border-zinc-600/50 rounded-xl text-xs font-medium text-zinc-300 transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            Nueva conversación
          </button>
        </div>

        {/* Lista de conversaciones */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
          {codeConvs.length > 0 && (
            <div>
              <button
                onClick={() => setCodeOpen(!codeOpen)}
                className="flex items-center gap-2 px-2 py-1.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider hover:text-zinc-400 transition-colors w-full"
              >
                <FolderCode className="w-3.5 h-3.5" />
                <span className="flex-1 text-left">Proyectos de Código</span>
                {codeOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
              {codeOpen && (
                <div className="space-y-0.5 mt-1">
                  {codeConvs.map((c) => (
                    <ConversationItem
                      key={c.id}
                      conversation={c}
                      isActive={activeId === c.id}
                      onSelect={() => onSelectConversation(c.id)}
                      onDelete={() => onDeleteConversation(c.id)}
                      onRename={(name) => onRenameConversation(c.id, name)}
                      onChangeType={(type) => onChangeType(c.id, type)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {studyConvs.length > 0 && (
            <div>
              <button
                onClick={() => setStudyOpen(!studyOpen)}
                className="flex items-center gap-2 px-2 py-1.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider hover:text-zinc-400 transition-colors w-full"
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span className="flex-1 text-left">Sesiones de Estudio</span>
                {studyOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
              {studyOpen && (
                <div className="space-y-0.5 mt-1">
                  {studyConvs.map((c) => (
                    <ConversationItem
                      key={c.id}
                      conversation={c}
                      isActive={activeId === c.id}
                      onSelect={() => onSelectConversation(c.id)}
                      onDelete={() => onDeleteConversation(c.id)}
                      onRename={(name) => onRenameConversation(c.id, name)}
                      onChangeType={(type) => onChangeType(c.id, type)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {conversations.length === 0 && (
            <div className="text-center py-8">
              <MessageSquare className="w-8 h-8 text-zinc-800 mx-auto mb-3" />
              <p className="text-xs text-zinc-600">No hay conversaciones</p>
              <p className="text-[10px] text-zinc-700 mt-1">Crea una nueva para empezar</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-zinc-800/60">
          <p className="text-[10px] text-zinc-700 text-center">Aura v0.4 — Guardado local</p>
        </div>
      </aside>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL — App
// ═══════════════════════════════════════════════════════════════════════════════

export default function App() {
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  // ─── Cargar desde localStorage al montar ────────────────────────────────

  useEffect(() => {
    const saved = loadConversations();
    setConversations(saved);
    if (saved.length > 0) setActiveConvId(saved[0].id);
    setHydrated(true);
  }, []);

  // ─── Guardar en localStorage cuando cambien ─────────────────────────────

  useEffect(() => {
    if (hydrated) saveConversations(conversations);
  }, [conversations, hydrated]);

  // ─── Conversación activa ────────────────────────────────────────────────

  const activeConv = conversations.find((c) => c.id === activeConvId) || null;
  const messages = activeConv?.messages || [];

  // ─── Scroll al fondo ────────────────────────────────────────────────────

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // ─── Auto-resize textarea ───────────────────────────────────────────────

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + "px";
    }
  }, [input]);

  // ─── Manejo de archivos ─────────────────────────────────────────────────

  const handleFileSelect = useCallback(async (e) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!ACCEPTED_TYPES.includes(file.type)) continue;
      if (file.size > MAX_FILE_SIZE) continue;
      try {
        const dataUrl = await fileToDataUrl(file);
        newFiles.push({
          id: crypto.randomUUID(),
          name: file.name,
          type: file.type === "application/pdf" ? "pdf" : "image",
          size: file.size,
          dataUrl,
        });
      } catch { /* skip */ }
    }

    setPendingFiles((prev) => [...prev, ...newFiles].slice(0, MAX_FILES));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const removePendingFile = useCallback((id) => {
    setPendingFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  // ─── Gestión de conversaciones ──────────────────────────────────────────

  const createNewConversation = useCallback(() => {
    const newConv = {
      id: crypto.randomUUID(),
      title: "Nueva conversación",
      type: "codigo",
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveConvId(newConv.id);
    setSidebarOpen(false);
    setPendingFiles([]);
  }, []);

  const selectConversation = useCallback((id) => {
    setActiveConvId(id);
    setSidebarOpen(false);
    setPendingFiles([]);
  }, []);

  const deleteConversation = useCallback((id) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConvId === id) {
      setConversations((prev) => {
        if (prev.length > 0) setActiveConvId(prev[0].id);
        else setActiveConvId(null);
        return prev;
      });
    }
  }, [activeConvId]);

  const renameConversation = useCallback((id, name) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: name, updatedAt: new Date().toISOString() } : c))
    );
  }, []);

  const changeConversationType = useCallback((id, type) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, type, updatedAt: new Date().toISOString() } : c))
    );
  }, []);

  // ─── Enviar mensaje ─────────────────────────────────────────────────────

  const sendMessage = async (promptText) => {
    const trimmed = promptText.trim();
    const hasFiles = pendingFiles.length > 0;
    if ((!trimmed && !hasFiles) || isLoading) return;

    // Crear conversación si no hay una activa
    let convId = activeConvId;
    if (!convId) {
      const newConv = {
        id: crypto.randomUUID(),
        title: generateTitle(trimmed || (hasFiles ? pendingFiles[0].name : "Nueva conversación")),
        type: "codigo",
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setConversations((prev) => [newConv, ...prev]);
      convId = newConv.id;
      setActiveConvId(convId);
    }

    const currentFiles = [...pendingFiles];
    const userMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed || (hasFiles ? `Adjuntó ${currentFiles.length} archivo(s)` : ""),
      attachments: currentFiles.length > 0 ? currentFiles : undefined,
      timestamp: new Date().toISOString(),
    };

    // Construir prompt para la API incluyendo contexto de archivos
    let apiPrompt = trimmed;
    if (currentFiles.length > 0) {
      const fileNames = currentFiles.map((f) => `${f.name} (${f.type})`).join(", ");
      apiPrompt = trimmed
        ? `${trimmed}\n\n[El usuario adjuntó los siguientes archivos: ${fileNames}]`
        : `[El usuario adjuntó los siguientes archivos: ${fileNames}]`;
    }

    // Agregar mensaje de usuario
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== convId) return c;
        const isFirst = c.messages.length === 0;
        return {
          ...c,
          messages: [...c.messages, userMessage],
          title: isFirst ? generateTitle(trimmed || currentFiles[0]?.name || "Nueva conversación") : c.title,
          updatedAt: new Date().toISOString(),
        };
      })
    );

    setInput("");
    setPendingFiles([]);
    setIsLoading(true);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: apiPrompt }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Error en la respuesta de la API");

      const aiMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.explicacion || "Respuesta generada",
        aiData: {
          explicacion: data.explicacion || "",
          codigo: data.codigo || "",
          consola: data.consola || "",
          log: data.log || "",
        },
        timestamp: new Date().toISOString(),
      };

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== convId) return c;
          return { ...c, messages: [...c.messages, aiMessage], updatedAt: new Date().toISOString() };
        })
      );
    } catch (error) {
      const errorMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Error al conectar con la API.",
        aiData: {
          explicacion: error instanceof Error ? error.message : "Error desconocido al conectar con la API.",
          codigo: "",
          consola: "",
        },
        timestamp: new Date().toISOString(),
      };
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== convId) return c;
          return { ...c, messages: [...c.messages, errorMessage], updatedAt: new Date().toISOString() };
        })
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const hasMessages = messages.length > 0;
  const canSend = input.trim().length > 0 || pendingFiles.length > 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden">
      {/* ─── Sidebar ─── */}
      <Sidebar
        conversations={conversations}
        activeId={activeConvId}
        isOpen={sidebarOpen}
        onSelectConversation={selectConversation}
        onNewConversation={createNewConversation}
        onDeleteConversation={deleteConversation}
        onRenameConversation={renameConversation}
        onChangeType={changeConversationType}
        onClose={() => setSidebarOpen(false)}
      />

      {/* ─── Área Principal ─── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-sm">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 transition-colors md:hidden"
          >
            {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden md:flex p-2 rounded-lg hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <PanelLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-zinc-300" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-zinc-100 truncate">
                {activeConv ? activeConv.title : "Aura Chat"}
              </h1>
              <div className="flex items-center gap-1.5">
                {activeConv && (
                  <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full ${
                    activeConv.type === "codigo" ? "bg-sky-950/40 text-sky-400" : "bg-amber-950/40 text-amber-400"
                  }`}>
                    {activeConv.type === "codigo" ? <FolderCode className="w-2.5 h-2.5" /> : <GraduationCap className="w-2.5 h-2.5" />}
                    {activeConv.type === "codigo" ? "Código" : "Estudio"}
                  </span>
                )}
                <p className="text-[11px] text-zinc-500">AI Code Assistant</p>
              </div>
            </div>
          </div>

          {hasMessages && (
            <button
              onClick={() => {
                if (activeConvId) {
                  setConversations((prev) =>
                    prev.map((c) => (c.id === activeConvId ? { ...c, messages: [], updatedAt: new Date().toISOString() } : c))
                  );
                }
              }}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-zinc-800/50"
            >
              Limpiar chat
            </button>
          )}
        </header>

        {/* Área de Chat */}
        <main className="flex-1 overflow-y-auto">
          {!hasMessages && !isLoading ? (
            <WelcomeScreen onSuggestionClick={sendMessage} />
          ) : (
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot className="w-4 h-4 text-zinc-400" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-zinc-700 text-zinc-100 rounded-br-md"
                        : "bg-zinc-900 border border-zinc-800/60 text-zinc-300 rounded-bl-md"
                    }`}
                  >
                    {/* Adjuntos */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="space-y-2 mb-2">
                        {msg.attachments.map((att) => (
                          <ChatAttachmentPreview key={att.id} attachment={att} />
                        ))}
                      </div>
                    )}

                    {msg.role === "user" ? (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    ) : msg.aiData ? (
                      <AiMessageBubble data={msg.aiData} />
                    ) : (
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    )}
                    <p className={`text-[10px] mt-2 ${msg.role === "user" ? "text-zinc-400" : "text-zinc-600"}`}>
                      {new Date(msg.timestamp).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>

                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-lg bg-zinc-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <User className="w-4 h-4 text-zinc-300" />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800/60 rounded-2xl rounded-bl-md">
                    <TypingIndicator />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </main>

        {/* Área de Input */}
        <div className="border-t border-zinc-800/60 bg-zinc-950/80 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
            {/* Preview de archivos pendientes */}
            <InputFilePreview files={pendingFiles} onRemove={removePendingFile} />

            <div className="flex items-end gap-2 bg-zinc-900 border border-zinc-700/50 rounded-2xl px-4 py-3 focus-within:border-zinc-600 transition-colors">
              {/* Botón adjuntar */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || pendingFiles.length >= MAX_FILES}
                className="flex-shrink-0 w-9 h-9 rounded-xl bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Adjuntar archivo (imagen o PDF)"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              {/* Input de archivo oculto */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ACCEPTED_TYPES.join(",")}
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={pendingFiles.length > 0 ? "Añade un mensaje sobre los archivos..." : "Escribe tu pregunta de código..."}
                rows={1}
                disabled={isLoading}
                className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-600 resize-none outline-none max-h-40 leading-relaxed disabled:opacity-50"
              />

              {/* Botón enviar */}
              <button
                type="submit"
                disabled={!canSend || isLoading}
                className="flex-shrink-0 w-9 h-9 rounded-xl bg-zinc-100 text-zinc-900 flex items-center justify-center hover:bg-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-zinc-100"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-[11px] text-zinc-600">
                Aura puede cometer errores. Verifica la información importante.
              </p>
              {pendingFiles.length > 0 && (
                <p className="text-[11px] text-zinc-600">
                  {pendingFiles.length}/{MAX_FILES} archivos
                </p>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
