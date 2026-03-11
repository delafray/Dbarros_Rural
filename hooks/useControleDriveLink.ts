import { useState, useEffect } from "react";

export function useControleDriveLink(selectedEdicaoId: string) {
  const [driveLink, setDriveLink] = useState<string>("");
  const [driveLinkEditing, setDriveLinkEditing] = useState(false);
  const [driveLinkInput, setDriveLinkInput] = useState("");

  useEffect(() => {
    if (!selectedEdicaoId) {
      setDriveLink("");
      return;
    }
    const saved = localStorage.getItem(`drive_link_${selectedEdicaoId}`) || "";
    setDriveLink(saved);
    setDriveLinkEditing(false);
  }, [selectedEdicaoId]);

  const handleSaveDriveLink = () => {
    const trimmed = driveLinkInput.trim();
    if (selectedEdicaoId) {
      if (trimmed) localStorage.setItem(`drive_link_${selectedEdicaoId}`, trimmed);
      else localStorage.removeItem(`drive_link_${selectedEdicaoId}`);
    }
    setDriveLink(trimmed);
    setDriveLinkEditing(false);
  };

  return {
    driveLink,
    driveLinkEditing,
    setDriveLinkEditing,
    driveLinkInput,
    setDriveLinkInput,
    handleSaveDriveLink,
  };
}
