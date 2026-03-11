import React from "react";

interface DriveLinkWidgetProps {
  driveLink: string;
  driveLinkEditing: boolean;
  driveLinkInput: string;
  setDriveLinkEditing: (v: boolean) => void;
  setDriveLinkInput: (v: string) => void;
  handleSaveDriveLink: () => void;
}

const DriveLinkWidget: React.FC<DriveLinkWidgetProps> = ({
  driveLink,
  driveLinkEditing,
  driveLinkInput,
  setDriveLinkEditing,
  setDriveLinkInput,
  handleSaveDriveLink,
}) => {
  if (driveLinkEditing) {
    return (
      <div className="flex items-center gap-1">
        <input
          autoFocus
          type="url"
          value={driveLinkInput}
          onChange={(e) => setDriveLinkInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSaveDriveLink();
            if (e.key === "Escape") setDriveLinkEditing(false);
          }}
          placeholder="Cole o link do Google Drive..."
          className="border border-slate-300 text-sm px-2 py-1.5 rounded w-60 focus:outline-none focus:ring-1 focus:ring-green-400"
        />
        <button
          onClick={handleSaveDriveLink}
          className="text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded font-medium transition-colors whitespace-nowrap"
        >
          Salvar
        </button>
        <button
          onClick={() => setDriveLinkEditing(false)}
          className="text-slate-400 hover:text-slate-700 px-1.5 py-1.5 rounded hover:bg-slate-100 transition-colors text-base leading-none"
          title="Cancelar"
        >
          &#x2715;
        </button>
      </div>
    );
  }

  if (driveLink) {
    return (
      <div className="flex items-center gap-1">
        <a
          href={driveLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded transition-colors whitespace-nowrap border border-slate-300"
          title="Abrir pasta do Google Drive"
        >
          <svg className="w-4 h-4 text-yellow-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6.28 3h11.44L22 11.6l-4 6.93H6l-4-6.93zm1.14 1.5L3.7 11h16.6l-3.72-6.5zm.86 9.5v1.5h7.44v-1.5zm-2 3v1.5h11.44v-1.5z" />
          </svg>
          Drive
        </a>
        <button
          onClick={() => { setDriveLinkInput(driveLink); setDriveLinkEditing(true); }}
          className="text-xs text-slate-400 hover:text-slate-700 px-2 py-1.5 rounded hover:bg-slate-100 transition-colors whitespace-nowrap border border-slate-200"
          title="Alterar link do Drive"
        >
          Alterar link
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => { setDriveLinkInput(""); setDriveLinkEditing(true); }}
      className="flex items-center gap-1.5 px-3 py-1.5 text-slate-500 text-sm font-medium rounded transition-colors whitespace-nowrap border border-dashed border-slate-300 hover:border-slate-400 hover:text-slate-700 hover:bg-slate-50"
      title="Adicionar link da pasta do Google Drive"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6.28 3h11.44L22 11.6l-4 6.93H6l-4-6.93zm1.14 1.5L3.7 11h16.6l-3.72-6.5zm.86 9.5v1.5h7.44v-1.5zm-2 3v1.5h11.44v-1.5z" />
      </svg>
      Incluir link Drive
    </button>
  );
};

export default DriveLinkWidget;
