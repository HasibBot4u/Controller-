import React, { useEffect, useState } from 'react';
import { useControlCenter } from '../../../context/ControlCenterContext.tsx';
import { FileItem } from '../../../domain/models/index.ts';
import { RiskLevel } from '../../../domain/enums/index.ts';
import {
  Folder,
  File,
  FileCode,
  Search,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  ChevronRight,
  FolderPlus,
  FilePlus,
  Check,
  AlertCircle,
  FileDiff,
  Server,
} from 'lucide-react';

export const FilesScreen: React.FC = () => {
  const { services, selectedProjectId, requestApproval } = useControlCenter();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState<'file' | 'folder'>('file');
  const [newFilePath, setNewFilePath] = useState('');

  const activeProjId = selectedProjectId || 'proj-01';

  const loadFiles = () => {
    setLoading(true);
    services.filesApi
      .getFiles(activeProjId)
      .then((res) => {
        setFiles(res.data);
        if (!selectedFile) {
          const defaultFile = res.data.find((f) => !f.isDirectory && f.content);
          if (defaultFile) {
            setSelectedFile(defaultFile);
            setEditorContent(defaultFile.content || '');
          }
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadFiles();
  }, [activeProjId, services]);

  const handleOpenFile = (file: FileItem) => {
    if (file.isDirectory) return;
    setSelectedFile(file);
    setEditorContent(file.content || '');
    setIsEditing(false);
  };

  const handleSaveFile = async () => {
    if (!selectedFile) return;
    try {
      await services.filesApi.saveFileContent(activeProjId, selectedFile.path, editorContent);
      setSaveStatus('Saved on remote workstation filesystem.');
      setTimeout(() => setSaveStatus(null), 3000);
      setIsEditing(false);
      loadFiles();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteFile = async (file: FileItem) => {
    const approved = await requestApproval({
      activityId: 'act-file-op',
      projectId: activeProjId,
      riskLevel: RiskLevel.STRONG_CONFIRM,
      actionType: 'FILE_DELETE',
      title: `Delete File: ${file.path}`,
      description: `Permanent deletion on remote filesystem: /home/oracle/workspace/${activeProjId}/${file.path}`,
      parameters: { path: file.path, isDirectory: file.isDirectory },
    });

    if (approved) {
      await services.filesApi.deleteFile(activeProjId, file.path);
      if (selectedFile?.path === file.path) {
        setSelectedFile(null);
        setEditorContent('');
      }
      loadFiles();
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFilePath.trim()) return;
    await services.filesApi.createFile(activeProjId, newFilePath, createType === 'folder');
    setShowCreateModal(false);
    setNewFilePath('');
    loadFiles();
  };

  const filteredFiles = files.filter((f) =>
    f.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-3 sm:p-6 space-y-4 max-w-6xl mx-auto pb-28 animate-in fade-in duration-150">
      {/* Remote Thin-client Banner */}
      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2 text-slate-300">
          <Server className="w-4 h-4 text-amber-400" />
          <span>Remote Filesystem: /home/oracle/workspace/{selectedProjectId}</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <span>Direct Remote API</span>
        </div>
      </div>

      {/* Main Files Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 min-h-[500px]">
        {/* File Browser Sidebar */}
        <div className="md:col-span-5 bg-slate-900/60 border border-slate-800 rounded-xl p-3 space-y-3 font-mono text-xs flex flex-col">
          {/* Header & New File / Folder Buttons */}
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
              Files ({files.length})
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setCreateType('file');
                  setShowCreateModal(true);
                }}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                title="New Remote File"
              >
                <FilePlus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  setCreateType('folder');
                  setShowCreateModal(true);
                }}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                title="New Remote Folder"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search file path..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/50 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400 font-mono"
            />
          </div>

          {/* File Tree List */}
          <div className="flex-1 overflow-y-auto space-y-1 max-h-[380px] sm:max-h-[520px]">
            {filteredFiles.map((file) => {
              const isSelected = selectedFile?.path === file.path;
              return (
                <div
                  key={file.id}
                  onClick={() => handleOpenFile(file)}
                  className={`group flex items-center justify-between px-2.5 py-2 rounded-lg transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium'
                      : file.isDirectory
                      ? 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                      : 'text-slate-300 hover:bg-slate-800/50 hover:text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {file.isDirectory ? (
                      <Folder className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    ) : (
                      <FileCode className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    )}
                    <span className="truncate text-xs">{file.path}</span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {file.isModified && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Modified" />
                    )}
                    {!file.isDirectory && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFile(file);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 rounded text-slate-500 transition-opacity"
                        title="Delete file"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* File Content / Remote Editor */}
        <div className="md:col-span-7 bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-col font-mono text-xs">
          {selectedFile ? (
            <>
              {/* File Header Bar */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <FileCode className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span className="font-semibold text-slate-200 truncate">{selectedFile.path}</span>
                  {selectedFile.isModified && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800/50">
                      MODIFIED
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <button
                      onClick={handleSaveFile}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center gap-1 cursor-pointer transition-transform active:scale-95 shadow-md shadow-amber-950"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save to VM</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  )}
                </div>
              </div>

              {saveStatus && (
                <div className="p-2 mb-2 rounded bg-emerald-950/60 border border-emerald-800 text-[11px] text-emerald-300 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  <span>{saveStatus}</span>
                </div>
              )}

              {/* Editor View */}
              {isEditing ? (
                <textarea
                  value={editorContent}
                  onChange={(e) => setEditorContent(e.target.value)}
                  rows={20}
                  className="w-full flex-1 bg-black/60 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-400 leading-relaxed resize-none"
                  spellCheck={false}
                />
              ) : (
                <pre className="flex-1 bg-black/40 border border-slate-800/80 rounded-lg p-3 text-xs font-mono text-slate-300 overflow-auto whitespace-pre-wrap leading-relaxed select-all">
                  {editorContent || '// Empty file or binary content on remote host.'}
                </pre>
              )}

              <div className="flex justify-between items-center pt-2 mt-2 border-t border-slate-800 text-[11px] text-slate-500">
                <span>Size: {selectedFile.sizeBytes ? `${selectedFile.sizeBytes} B` : '0 B'}</span>
                <span>Oracle Linux Host UTF-8</span>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 font-mono text-xs">
              Select a remote file to inspect or edit.
            </div>
          )}
        </div>
      </div>

      {/* Create File / Folder Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#0e1422] border border-slate-800 rounded-t-2xl sm:rounded-2xl p-5 space-y-4 text-slate-100 font-mono text-xs">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="font-semibold text-slate-200 uppercase">
                Create Remote {createType === 'folder' ? 'Folder' : 'File'}
              </span>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400">
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-slate-400 mb-1">
                  Path relative to root (/home/oracle/workspace/{selectedProjectId}/):
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    createType === 'folder' ? 'src/components/common' : 'src/utils/crypto.ts'
                  }
                  value={newFilePath}
                  onChange={(e) => setNewFilePath(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-semibold"
                >
                  Create on Host
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
