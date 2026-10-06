import { useRef, useState } from 'react'
import './UploadZone.css'

// Drag & Drop-Fläche; ruft onDateien mit einem Array von File-Objekten auf
export default function UploadZone({ onDateien, accept, mehrere = false, text, deaktiviert = false }) {
  const input = useRef(null)
  const [aktiv, setAktiv] = useState(false)

  function uebergeben(liste) {
    const dateien = Array.from(liste || [])
    if (dateien.length > 0 && !deaktiviert) onDateien(mehrere ? dateien : [dateien[0]])
  }

  return (
    <div
      className={`upload-zone ${aktiv ? 'upload-zone--aktiv' : ''} ${deaktiviert ? 'upload-zone--aus' : ''}`}
      onClick={() => !deaktiviert && input.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setAktiv(true) }}
      onDragLeave={() => setAktiv(false)}
      onDrop={(e) => { e.preventDefault(); setAktiv(false); uebergeben(e.dataTransfer.files) }}
    >
      <div className="upload-zone__icon">⇪</div>
      <div>{text || 'Dateien hierher ziehen oder klicken'}</div>
      <div className="leise">{accept}</div>
      <input
        ref={input}
        type="file"
        hidden
        accept={accept}
        multiple={mehrere}
        onChange={(e) => { uebergeben(e.target.files); e.target.value = '' }}
      />
    </div>
  )
}
