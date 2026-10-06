// Status der Protokoll-Zuordnung als Chip
export default function ZuordnungChip({ zuordnung }) {
  const map = {
    auto: ['chip--gruen', 'automatisch'],
    manuell: ['chip--blau', 'bestätigt'],
    pruefen: ['chip--gelb', 'zu prüfen'],
    offen: ['', 'offen'],
  }
  const [klasse, text] = map[zuordnung] || map.offen
  return <span className={`chip ${klasse}`}>{text}</span>
}
