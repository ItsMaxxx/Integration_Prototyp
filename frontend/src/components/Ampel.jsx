import './Ampel.css'

const LABEL = {
  gruen: 'nachgewiesen',
  gelb: 'Frist naht',
  rot: 'überfällig',
  grau: 'geplant',
}

// Ampel-Badge: Farbe kommt fertig berechnet vom Backend
export default function Ampel({ farbe, text, nurPunkt = false }) {
  return (
    <span className={`ampel ampel--${farbe}`} title={LABEL[farbe]}>
      <span className="ampel__punkt" />
      {!nurPunkt && <span>{text ?? LABEL[farbe]}</span>}
    </span>
  )
}
