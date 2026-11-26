"use client";

import { useEffect, useRef, useState } from "react";

export default function AssignmentFilePicker() {
  const folderInput = useRef<HTMLInputElement>(null);
  const [folderPaths, setFolderPaths] = useState<string[]>([]);

  useEffect(() => {
    folderInput.current?.setAttribute("webkitdirectory", "");
  }, []);

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <label style={{ display: "grid", gap: 5 }}>
        ファイルを選択（複数可）
        <input type="file" name="files" multiple />
      </label>
      <label style={{ display: "grid", gap: 5 }}>
        フォルダを選択
        <input
          ref={folderInput}
          type="file"
          name="folderFiles"
          multiple
          onChange={(event) => {
            setFolderPaths(
              Array.from(event.currentTarget.files ?? []).map(
                (file) => file.webkitRelativePath || file.name,
              ),
            );
          }}
        />
      </label>
      {folderPaths.map((path, index) => (
        <input key={`${index}-${path}`} type="hidden" name="folderPaths" value={path} />
      ))}
      <small style={{ color: "#64748B" }}>
        1ファイル5MBまで、合計10MB・20個まで。新しいファイルを添付して再提出すると、以前の添付は置き換わります。
      </small>
    </div>
  );
}
