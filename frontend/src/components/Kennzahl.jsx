import InfoTipp from './InfoTipp'
import './Kennzahl.css'

export default function Kennzahl({ titel, wert, einheit, hinweis, farbe, info }) {
  return (
    <div className={`karte kennzahl ${farbe ? `kennzahl--${farbe}` : ''}`}>
      <div className="kennzahl__titel">
        {titel}
        {info && <InfoTipp text={info} />}
      </div>
      <div className="kennzahl__wert">
        {wert}
        {einheit && <span className="kennzahl__einheit">{einheit}</span>}
      </div>
      {hinweis && <div className="kennzahl__hinweis">{hinweis}</div>}
    </div>
  )
}
