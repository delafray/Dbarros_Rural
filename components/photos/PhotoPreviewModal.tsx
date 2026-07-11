import React from 'react';
import { Photo } from '../../types';
import { Button, Modal } from '../UI';

interface PhotoPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  photo: Photo | null;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onFullscreen: () => void;
}

const PhotoPreviewModal: React.FC<PhotoPreviewModalProps> = ({
  isOpen,
  onClose,
  photo,
  canEdit,
  onEdit,
  onDelete,
  onFullscreen,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={photo?.name || 'Vistas'} maxWidth="max-w-4xl">
      <div className="flex flex-col items-center gap-3">
        <div className="relative w-full max-h-[60vh] bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-800 shadow-2xl">
          <img src={photo?.url} alt={photo?.name} className="max-w-full max-h-[60vh] object-contain cursor-zoom-out" onClick={onClose} />
          <button onClick={onClose} className="absolute top-4 right-4 p-1.5 bg-black/40 text-white rounded-full hover:bg-black/60 transition-all shadow-xl backdrop-blur-md border border-white/10">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex flex-col items-center gap-2 mt-1 w-full">
          {photo?.userName && (
            <div className="flex items-center gap-2 px-5 py-2.5 bg-blue-50 rounded-xl border border-blue-200 shadow-sm w-full justify-center">
              <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Cadastrado por:</span>
              <span className="text-[11px] font-black text-blue-800">{photo.userName}</span>
            </div>
          )}
          {photo?.storageLocation && (
            <div className="flex items-center gap-2 px-5 py-2.5 bg-green-50 rounded-xl border border-green-200 shadow-sm w-full justify-center mt-1">
              <span className="text-[9px] font-black text-green-600 uppercase tracking-widest">Servidor/HD Original:</span>
              <span className="text-[11px] font-black text-green-800">{photo.storageLocation}</span>
            </div>
          )}
          <div className="flex flex-col items-center gap-2.5 w-full">
            {typeof navigator !== 'undefined' && (
              <Button onClick={async () => {
                if (!photo?.url) return;
                try {
                  const response = await fetch(photo.url);
                  const blob = await response.blob();
                  const file = new File([blob], photo.name ? `${photo.name}.jpg` : 'foto.jpg', { type: blob.type || 'image/jpeg' });
                  const shareData: any = { title: photo.name || 'Foto da Galeria', files: [file] };
                  const defaultMsg = photo.name ? `Conforme combinado, segue arquivo referente a "${photo.name}" para referencia.` : `Conforme combinado, segue arquivo para referencia.`;
                  if (photo.videoUrl) shareData.text = `${defaultMsg}\nLink do video: ${photo.videoUrl}`;
                  else shareData.text = defaultMsg;
                  if (navigator.share) await navigator.share(shareData);
                  else throw new Error("Web Share not supported");
                } catch (error: any) {
                  if (error.name !== 'AbortError') {
                    const fallbackMsg = photo.name ? `Conforme combinado, segue arquivo referente a "${photo.name}" para referencia.` : `Conforme combinado, segue arquivo para referencia.`;
                    if (navigator.share) {
                      try { await navigator.share({ title: photo.name || 'Foto da Galeria', text: photo.videoUrl ? `${fallbackMsg}\nLink do video: ${photo.videoUrl}` : `${fallbackMsg}\nLink: ${photo.url}` }); } catch { }
                    } else {
                      const text = encodeURIComponent(photo.videoUrl ? `${fallbackMsg}\nLink do video: ${photo.videoUrl}` : `${fallbackMsg}\nLink: ${photo.url}`);
                      window.open(`https://wa.me/?text=${text}`, '_blank');
                    }
                  }
                }
              }}
                className="flex items-center justify-center w-full gap-2 py-3 px-6 text-[11px] font-black uppercase tracking-widest bg-[#25D366] hover:bg-[#128C7E] text-white shadow-md shadow-green-500/20 border-none transition-all">
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.788-.703-1.322-1.573-1.477-1.871-.153-.299-.016-.461.133-.611.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                Compartilhar (WhatsApp)
              </Button>
            )}
            <Button onClick={onFullscreen} className="flex items-center justify-center w-full gap-2 py-3 px-6 text-[11px] font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 border-none transition-all">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
              Ver em Tela Cheia
            </Button>
            {photo && canEdit && (
              <div className="flex w-full items-center gap-2.5">
                <Button onClick={onEdit} className="flex-1 py-2.5 px-4 text-[10px] font-black uppercase tracking-widest shadow-md shadow-blue-500/20">Editar</Button>
                <Button variant="danger" onClick={onDelete}
                  className="flex-1 py-2.5 px-4 text-[10px] font-black uppercase tracking-widest shadow-md shadow-red-500/20 flex items-center justify-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  Excluir
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default PhotoPreviewModal;
