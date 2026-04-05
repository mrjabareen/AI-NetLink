import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Settings, FolderClosed, Plus, FileText, Download, Upload, AlertTriangle, ArrowLeft, ArrowRight, ChevronRight, ChevronLeft, Save, X, FileJson, Folder } from 'lucide-react';
import { AppState } from '../types';
import { dict } from '../dict';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-json';

interface FilesTabProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

interface FileItem {
  name: string;
  type: 'file' | 'folder';
  path: string;
}

const customPrismStyles = `
/* VS Code Dark+ Theme for PrismJS JSON */
code[class*="language-"], pre[class*="language-"] {
  color: #d4d4d4;
  text-shadow: none;
  font-family: inherit;
  direction: ltr;
  text-align: left;
  white-space: pre;
  word-spacing: normal;
  word-break: normal;
  tab-size: 2;
  hyphens: none;
}
.token.property { color: #9cdcfe; font-weight: 500; } 
.token.string { color: #ce9178; }    
.token.number { color: #b5cea8; }    
.token.boolean { color: #569cd6; } 
.token.keyword { color: #569cd6; }
.token.punctuation { color: #ffd700; } 
.token.operator { color: #d4d4d4; }
.token.null { color: #569cd6; }
`;

export default function FilesTab({ state, setState }: FilesTabProps) {
  const t = dict[state.lang];
  const isRTL = state.lang === 'ar';

  const [currentPath, setCurrentPath] = useState('');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [unsavedContent, setUnsavedContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const API_BASE = 'http://localhost:3001/api/files';

  useEffect(() => {
    if (state.role !== 'user') {
      fetchTree(currentPath);
    }
  }, [currentPath, state.role]);

  const fetchTree = async (folder: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/tree?folder=${encodeURIComponent(folder)}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setFiles(json.data || []);
    } catch (e) {
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFile = async (item: FileItem) => {
    setSelectedFile(item);
    setFileContent('Loading...');
    setUnsavedContent('Loading...');
    try {
      const res = await fetch(`${API_BASE}/content?path=${encodeURIComponent(item.path)}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setFileContent(json.data);
      setUnsavedContent(json.data);
    } catch (e) {
      setFileContent('Error loading file content.');
      setUnsavedContent('Error loading file content.');
    }
  };

  const handleItemClick = (item: FileItem) => {
    if (item.type === 'folder') {
      setCurrentPath(item.path);
      setSelectedFile(null);
    } else {
      loadFile(item);
    }
  };

  const navigateUp = () => {
    if (!currentPath) return;
    const parts = currentPath.split('/');
    parts.pop();
    setCurrentPath(parts.join('/'));
    setSelectedFile(null);
  };

  const saveContent = async () => {
    if (!selectedFile) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPath: selectedFile.path, content: unsavedContent })
      });
      if (!res.ok) throw new Error();
      setFileContent(unsavedContent);
      setConfirmSave(false);
    } catch (e) {
      alert("Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', currentPath);
    
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error();
      fetchTree(currentPath);
    } catch (err) {
      alert('Upload failed');
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownload = () => {
    if (!selectedFile) return;
    window.open(`${API_BASE}/download?path=${encodeURIComponent(selectedFile.path)}`, '_blank');
  };

  const isModified = fileContent !== unsavedContent;
  const pathParts = currentPath ? currentPath.split('/') : [];

  return (
    <motion.div key="files" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex-1 flex flex-col relative min-h-0 h-full lg:h-[calc(100vh-8rem)] overflow-y-auto overflow-x-hidden lg:overflow-hidden pb-12 lg:pb-0">
      <style>{customPrismStyles}</style>
      {/* Manager Lock Overlay */}
      {state.role === 'user' && (
        <div className="absolute inset-0 z-20 glass-panel rounded-3xl flex flex-col items-center justify-center p-8 text-center backdrop-blur-2xl">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-500 mb-6">
            <Lock size={40} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{t.files.locked}</h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8">{t.files.unlockMsg}</p>
          <button onClick={() => setState(prev => ({ ...prev, activeTab: 'settings' }))} className="px-6 py-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-medium hover:bg-slate-800 dark:hover:bg-white transition-colors flex items-center gap-2 cursor-pointer shadow-lg">
            <Settings size={18} /> {t.files.goToSettings}
          </button>
        </div>
      )}

      {/* Warning Banner */}
      <div className={`mb-6 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-500/5 flex items-start gap-4 ${state.role === 'user' ? 'opacity-20 pointer-events-none blur-sm' : ''}`}>
        <div className="p-2 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-500 rounded-lg shrink-0">
          <AlertTriangle size={20} />
        </div>
        <div>
          <h4 className="font-bold text-amber-800 dark:text-amber-400 mb-1">{t.files.sysFiles}</h4>
          <p className="text-sm text-amber-700/80 dark:text-amber-500/80 leading-relaxed font-medium">
            {t.files.confirmSaveMsg}
          </p>
        </div>
      </div>

      {/* File Manager Content */}
      <div className={`flex-1 flex flex-col lg:flex-row gap-6 min-h-0 ${state.role === 'user' ? 'opacity-20 pointer-events-none blur-sm' : ''}`}>
        
        {/* Left Panel: File List */}
        <div className="w-full lg:w-96 shrink-0 glass-card flex flex-col h-[400px] lg:h-full overflow-hidden shadow-xl shadow-slate-200/20 dark:shadow-none">
          <div className="p-4 border-b border-slate-200/50 dark:border-slate-700/50 flex flex-col gap-3 bg-white/30 dark:bg-slate-900/30">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <FolderClosed size={18} className="text-teal-500" /> {t.files.sysFiles}
              </h3>
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-xl hover:bg-teal-500/20 transition-colors flex items-center gap-2 text-sm font-bold cursor-pointer"
                title={t.files.upload}
              >
                <Upload size={16} /> 
              </button>
              <input type="file" ref={fileInputRef} className="hidden" onChange={handleUpload} />
            </div>

            {/* Breadcrumbs */}
            <div className={`flex flex-wrap items-center gap-1 text-xs font-mono px-1 py-2 bg-slate-100 dark:bg-slate-950/50 rounded-lg ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
              <button onClick={() => { setCurrentPath(''); setSelectedFile(null); }} className="px-2 py-1 hover:text-teal-500 transition-colors cursor-pointer opacity-70">root</button>
              {pathParts.map((part, idx) => {
                const isLast = idx === pathParts.length - 1;
                const pathSoFar = pathParts.slice(0, idx + 1).join('/');
                return (
                  <React.Fragment key={idx}>
                    <span className="opacity-40">{isRTL ? <ChevronLeft size={12}/> : <ChevronRight size={12}/>}</span>
                    <button 
                      onClick={() => { setCurrentPath(pathSoFar); setSelectedFile(null); }}
                      className={`px-1 py-1 hover:text-teal-500 transition-colors cursor-pointer ${isLast ? 'font-bold text-teal-600 dark:text-teal-400' : 'opacity-70'}`}
                    >
                      {part}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-1 bg-white/10 dark:bg-slate-900/10">
            {currentPath && (
              <div 
                onClick={navigateUp}
                className={`p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-transparent text-slate-500`}
              >
                {isRTL ? <ArrowRight size={16} /> : <ArrowLeft size={16} />} 
                <span className="text-sm font-bold uppercase tracking-wider">..</span>
              </div>
            )}
            
            {files.length === 0 && !isLoading && (
              <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm">{t.files.emptyDir}</div>
            )}
            
            {files.map((file, i) => {
              const isSelected = selectedFile?.path === file.path;
              return (
                <div 
                  key={file.path} 
                  onClick={() => handleItemClick(file)}
                  className={`p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30' 
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-transparent'
                  }`}
                >
                  {file.type === 'folder' ? (
                    <Folder size={18} className={isSelected ? 'text-white' : 'text-blue-500 dark:text-blue-400 fill-blue-500/20'} />
                  ) : file.name.endsWith('.json') ? (
                    <FileJson size={18} className={isSelected ? 'text-white' : 'text-amber-500 dark:text-amber-400'} />
                  ) : (
                    <FileText size={18} className={isSelected ? 'text-white' : 'text-slate-400 dark:text-slate-500'} />
                  )}
                  <span className={`text-sm truncate font-medium ${isSelected ? 'text-white font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                    {file.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Panel: Editor */}
        <div className="flex-1 glass-card flex flex-col min-h-[500px] lg:min-h-0 lg:h-full overflow-hidden shadow-xl shadow-slate-200/20 dark:shadow-none">
          {selectedFile ? (
            <>
              <div className="p-4 border-b border-slate-200/50 dark:border-slate-700/50 flex flex-col sm:flex-row justify-between items-center bg-white/30 dark:bg-slate-900/30 gap-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{selectedFile.name}</span>
                  {isModified && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>}
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleDownload}
                    className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors cursor-pointer"
                    title={t.files.download}
                  >
                    <Download size={16} />
                  </button>
                  <button 
                    onClick={() => setConfirmSave(true)}
                    disabled={!isModified || isSaving}
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                      isModified 
                        ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20 cursor-pointer' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    <Save size={16} />
                    {isSaving ? '...' : t.files.saveChanges}
                  </button>
                </div>
              </div>
              
              <div className="flex-1 bg-[#1e1e1e] dark:bg-[#0d1117] relative overflow-auto rounded-b-2xl border-t border-slate-200/20">
                <Editor
                  value={unsavedContent}
                  onValueChange={code => setUnsavedContent(code)}
                  highlight={code => Prism.highlight(code, Prism.languages.json, 'json')}
                  padding={24}
                  className="font-mono text-base md:text-[15px] min-h-full"
                  style={{
                    fontFamily: '"Fira Code", "Consolas", "Monaco", monospace',
                    direction: 'ltr',
                    color: '#d4d4d4'
                  }}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 dark:text-slate-600">
              <FileText size={64} className="mb-6 opacity-20" />
              <p className="text-lg font-medium">{t.files.selectFile}</p>
            </div>
          )}
        </div>

      </div>

      {/* Confirmation Save Modal */}
      <AnimatePresence>
        {confirmSave && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmSave(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-md bg-white dark:bg-[#09090B] rounded-3xl shadow-2xl overflow-hidden border border-amber-500/20">
              <div className="p-8">
                <div className="w-16 h-16 bg-amber-100 dark:bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mb-6 mx-auto">
                  <AlertTriangle size={32} />
                </div>
                <h3 className="text-xl font-black text-center text-slate-900 dark:text-white mb-3">
                  {t.files.confirmSaveTitle}
                </h3>
                <p className="text-center justify-center text-slate-600 dark:text-slate-400 font-medium leading-relaxed mb-8">
                  {t.files.confirmSaveMsg}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setConfirmSave(false)} className="px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-colors">
                    {t.files.cancel}
                  </button>
                  <button onClick={saveContent} className="px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold tracking-wide transition-all shadow-lg shadow-amber-500/20">
                    {t.files.confirm}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
