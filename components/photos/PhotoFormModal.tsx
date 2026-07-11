import React from 'react';
import { Photo, Tag, TagCategory } from '../../types';
import { Button, Modal } from '../UI';
import { processAndCompressImage } from '../../src/utils/imageUtils';

interface PhotoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: {
    editingPhoto: Photo | null;
    formData: {
      name: string;
      url: string;
      thumbnailUrl: string;
      tagIds: string[];
      localPath: string;
      storageLocation: string;
      videoUrl: string;
      userId: string;
      selectedFile: File | null;
    };
    setFormData: React.Dispatch<React.SetStateAction<any>>;
    saving: boolean;
    processingImage: boolean;
    setProcessingImage: (v: boolean) => void;
    videoPreviewDataUrl: string;
    setVideoPreviewDataUrl: (v: string) => void;
    fetchingThumbnail: boolean;
    handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleFetchThumbnail: () => void;
    toggleModalTag: (tagId: string) => void;
    handleSave: (e: React.FormEvent) => void;
  };
  categories: TagCategory[];
  tags: Tag[];
  allUsers: Array<{ id: string; name: string }>;
  currentUserId: string | undefined;
  copyToClipboard: (e: React.MouseEvent, text: string) => void;
}

const PhotoFormModal: React.FC<PhotoFormModalProps> = ({
  isOpen,
  onClose,
  form,
  categories,
  tags,
  allUsers,
  currentUserId,
  copyToClipboard,
}) => {
  const cat1 = categories.find(c => c.order === 1);
  const videoTag = cat1 ? tags.find(t => t.categoryId === cat1.id && t.order === 1) : null;
  const isVideoMode = !!(videoTag && form.formData.tagIds.includes(videoTag.id));

  return (
    <Modal isOpen={isOpen} onClose={onClose}
      title={
        <div className="flex flex-col md:flex-row md:items-center gap-4 w-full min-w-0">
          <div className="flex items-center gap-4 flex-shrink-0">
            <span className="text-lg font-black text-slate-800 whitespace-nowrap">{form.editingPhoto ? 'EDITAR' : 'NOVO REGISTRO'}</span>
            <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
            <div className="hidden lg:flex items-center text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
              <div className="w-1.5 h-4 bg-blue-600 rounded-full mr-2"></div>Atribuicao
            </div>
          </div>
          <div className="flex-1 flex gap-2 min-w-0">
            <input placeholder="Titulo do Registro..." value={form.formData.name}
              onChange={e => form.setFormData({ ...form.formData, name: e.target.value })}
              className="flex-[1.5] min-w-0 bg-white border-2 border-blue-400 rounded-lg px-2.5 py-1 text-[11px] font-bold text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 shadow-sm outline-none transition-all" required />
            <div className="hidden sm:flex flex-1 min-w-0 relative group items-center">
              <input placeholder="Caminho (Local)..." value={form.formData.localPath}
                onChange={e => form.setFormData({ ...form.formData, localPath: e.target.value })}
                className="w-full min-w-0 bg-white border-2 border-blue-400 rounded-lg px-2.5 py-1 pr-8 text-[11px] font-mono text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 shadow-sm outline-none transition-all" />
              {form.formData.localPath && (
                <button type="button" onClick={(e) => copyToClipboard(e, form.formData.localPath!)}
                  className="absolute right-1 p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Copiar caminho local">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                </button>
              )}
            </div>
            <input placeholder="Servidor / HD..." title="Servidor ou HD Externo onde esta o arquivo original da foto/video"
              value={form.formData.storageLocation} onChange={e => form.setFormData({ ...form.formData, storageLocation: e.target.value })}
              className="hidden md:block flex-[0.8] min-w-0 bg-white border-2 border-slate-300 rounded-lg px-2.5 py-1 text-[11px] font-mono text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500 shadow-sm outline-none transition-all" />
          </div>
        </div>
      } maxWidth="max-w-[95vw]">
      <form onSubmit={form.handleSave} className="flex flex-col gap-6 max-h-[85vh]">
        <div className="flex flex-col lg:flex-row gap-10 overflow-y-auto pr-4 pb-4 scrollbar-thin">
          <div className="w-full lg:w-96 flex-shrink-0 space-y-6">
            <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2">Autoria do Registro</label>
              <select className="w-full rounded-xl border-slate-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs py-2 px-3 font-bold text-slate-700 bg-white"
                value={form.formData.userId} onChange={(e) => form.setFormData({ ...form.formData, userId: e.target.value })}>
                {allUsers.map(u => <option key={u.id} value={u.id}>{u.name} {u.id === currentUserId ? '(Voce)' : ''}</option>)}
              </select>
            </div>
            <div className="space-y-3">
              {isVideoMode ? (
                <div className="space-y-3">
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <input type="url" placeholder="Link do Instagram (Reel) ou YouTube..." value={form.formData.videoUrl}
                        onChange={e => { form.setFormData({ ...form.formData, videoUrl: e.target.value }); form.setVideoPreviewDataUrl(''); }}
                        className="flex-1 min-w-0 bg-white border border-purple-200 rounded-xl px-3 py-2 text-[11px] font-mono focus:ring-2 focus:ring-purple-400 outline-none transition-all placeholder:text-slate-300" />
                      <button type="button" onClick={() => { if (form.formData.videoUrl.trim()) window.open(form.formData.videoUrl, '_blank', 'noopener,noreferrer'); }}
                        disabled={!form.formData.videoUrl.trim()}
                        className="px-3 py-2 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-xl hover:bg-slate-200 disabled:opacity-50 transition-all border border-slate-200" title="Testar se o link abre corretamente">
                        &#x1f517; Testar
                      </button>
                    </div>
                    <button type="button" onClick={form.handleFetchThumbnail} disabled={!form.formData.videoUrl.trim() || form.fetchingThumbnail}
                      className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[10px] font-black rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg shadow-purple-500/20">
                      {form.fetchingThumbnail ? '&#x23F3; Buscando Capa...' : (form.formData.url && isVideoMode ? '&#x1f504; Atualizar Capa Automatica' : '&#x1f50d; Buscar Capa Automaticamente')}
                    </button>
                  </div>
                  <div className={`aspect-video rounded-2xl overflow-hidden border-2 border-dashed flex items-center justify-center transition-all ${form.videoPreviewDataUrl ? 'border-green-300 bg-green-50' : 'border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50'}`}>
                    {form.videoPreviewDataUrl ? (
                      <div className="relative w-full h-full group/vidprev">
                        <img src={form.videoPreviewDataUrl} alt="Capa do video" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-12 h-8 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20">
                            <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                          </div>
                        </div>
                        <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
                          <span className="bg-green-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                            {form.videoPreviewDataUrl.startsWith('data:') ? '&#x2713; Capa capturada e comprimida' : '&#x2713; Capa atual do registro'}
                          </span>
                          <button type="button" onClick={() => form.setVideoPreviewDataUrl('')} className="bg-black/50 text-white text-[9px] px-2 py-0.5 rounded-full">Trocar</button>
                        </div>
                      </div>
                    ) : form.fetchingThumbnail ? (
                      <div className="flex flex-col items-center gap-3 text-purple-500">
                        <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                        <span className="text-[10px] font-bold">Buscando capa...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3 p-6">
                        <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-[10px] font-black text-purple-700 uppercase tracking-widest text-center">Busque a capa ou suba manualmente</span>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => document.getElementById('manual-video-thumb')?.click()}
                              className="px-3 py-1.5 bg-white border border-purple-200 text-purple-600 text-[9px] font-black rounded-lg hover:bg-purple-50 transition-all flex items-center gap-1.5">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                              UPLOAD MANUAL
                            </button>
                            <input id="manual-video-thumb" type="file" accept="image/*" className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  form.setProcessingImage(true);
                                  try { const compressed = await processAndCompressImage(file); form.setVideoPreviewDataUrl(compressed); }
                                  finally { form.setProcessingImage(false); }
                                }
                              }} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className={`aspect-video lg:aspect-square bg-slate-50 border-2 border-dashed rounded-3xl overflow-hidden flex items-center justify-center relative transition-all duration-300 ${form.formData.url ? 'border-blue-200' : 'border-slate-200 hover:border-blue-400'}`}>
                    {form.formData.url ? (
                      <div className="w-full h-full relative group/preview">
                        <img src={form.formData.url} className="w-full h-full object-cover" alt="Preview" />
                        {!form.processingImage && (
                          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center">
                            <label className="cursor-pointer bg-white px-6 py-2 rounded-xl font-black text-[10px] uppercase shadow-2xl hover:bg-slate-100 transition-colors">
                              Trocar Imagem <input type="file" className="sr-only" accept="image/*" onChange={form.handleFileUpload} disabled={form.processingImage} />
                            </label>
                          </div>
                        )}
                      </div>
                    ) : (
                      <label className="cursor-pointer p-10 text-center w-full h-full flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 transition-all hover:scale-110 shadow-sm"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg></div>
                        <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Upload Imagem</span>
                        <input type="file" className="sr-only" accept="image/*" onChange={form.handleFileUpload} disabled={form.processingImage} />
                      </label>
                    )}
                  </div>
                  {form.editingPhoto && form.formData.url && (
                    <div className="flex justify-center mt-1">
                      <label className="cursor-pointer px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors border border-slate-200 flex items-center gap-2 shadow-sm">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        Alterar Imagem Deste Registro
                        <input type="file" className="sr-only" accept="image/*" onChange={form.handleFileUpload} disabled={form.processingImage} />
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 space-y-4">
            <div className="flex flex-col gap-1">
              {categories.map(cat => {
                const vTag = cat1 ? tags.find(t => t.categoryId === cat1.id && t.order === 1) : null;
                const isVM = !!(vTag && form.formData.tagIds.includes(vTag.id));
                const isCat1 = cat.order === 1;
                return (
                  <div key={cat.id} className="group relative flex flex-col md:flex-row md:items-center bg-white border border-slate-200 rounded-xl px-3 py-0.5 transition-all hover:border-blue-400 hover:shadow-md">
                    <div className="md:w-36 flex-shrink-0 flex items-center gap-2 mb-1 md:mb-0 border-b md:border-b-0 md:border-r border-slate-100 pb-1 md:pb-0 md:pr-3">
                      <span className={`w-5 h-5 ${cat.isRequired ? 'bg-red-600' : 'bg-blue-600'} text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-sm`}>{cat.order}</span>
                      <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-tight truncate">{cat.name}</h4>
                      {isVM && isCat1 && <span className="text-[9px] text-purple-600 font-black bg-purple-50 px-1.5 py-0.5 rounded ml-auto md:ml-0">&#x1f3ac; VIDEO</span>}
                    </div>
                    <div className="flex-1 md:pl-4 flex flex-wrap gap-x-1.5 gap-y-1 py-0.5">
                      {tags.filter(t => t.categoryId === cat.id).map(tag => {
                        const isSelected = form.formData.tagIds.includes(tag.id);
                        const isVideoTag = vTag && tag.id === vTag.id;
                        const isDisabled = isVM && isCat1 && !isVideoTag;
                        return (
                          <button key={tag.id} type="button" disabled={isDisabled} onClick={() => !isDisabled && form.toggleModalTag(tag.id)}
                            className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all flex items-center gap-1.5 ${isDisabled ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed opacity-50' : isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-md scale-105' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white hover:border-blue-400 hover:text-blue-600'}`}>
                            {isSelected && !isDisabled && <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>}
                            {tag.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 sm:pt-8 border-t border-slate-100 bg-white mt-auto">
          <div className="hidden sm:block bg-blue-50 px-5 py-3 rounded-2xl border border-blue-100">
            <p className="text-[10px] font-bold text-blue-700 leading-tight uppercase">Salvamento com compactacao inteligente ativa</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" type="button" onClick={onClose} className="flex-1 sm:flex-none py-2 px-4 text-xs h-11 sm:h-10">Cancelar</Button>
            <Button type="submit" disabled={form.saving || (!isVideoMode && !form.formData.url) || form.processingImage} className="flex-1 sm:flex-none px-6 sm:px-10 py-2 shadow-xl shadow-blue-500/20 text-xs font-black uppercase tracking-widest h-11 sm:h-10">
              {form.saving || form.processingImage ? 'Processando...' : 'Finalizar'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default PhotoFormModal;
