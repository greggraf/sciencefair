const html = require('choo/html')
const css = require('csjs-inject')
const C = require('../../lib/constants')
const includes = require('lodash/includes')
const mean = require('lodash/mean')
const icon = require('./icon')

const style = css`

.button {
  justify-content: center;
  align-items: center;
  border: 1px solid ${C.LIGHTGREY};
  border-radius: 2px;
  color: ${C.LIGHTGREY};
  font-family: CooperHewitt-Light;
  font-size: 1.5em;
  margin-right: 12px;
  padding: 6px;
  padding-top: 9px;
  position: relative;
}

.content {
  width: 100%;
  padding: 6px;
}

.progressbar {
  position: absolute;
  left: 0;
  bottom: 0;
  height: 8px;
  width: 0;
  background-color: ${C.YELLOW};
}

`

module.exports = (state, prev, send) => {
  const selected = state.results.filter(
    p => includes(state.selection.papers, p.id)
  )
  const downloads = state.downloads.list.filter(
    dl => includes(state.selection.papers, dl.id)
  )

  const progress = mean(downloads.map(dl => dl.progress || 0))

  const donetext = state.selection.papers.length === 1 ? 'read' : 'downloaded'
  const doneicon = state.selection.papers.length === 1 ? 'read' : 'tick'

  const btntext = progress === 100 ? donetext : 'download'
  const btnicon = progress === 100 ? doneicon : 'download'

  const btn = html`

  <div class="${style.button} clickable">
    <div style="${style.content}">
      ${btntext} ${icon({ name: btnicon })}
    </div>
    <div class="${style.progressbar}" style="width: ${progress}%"/>
  </div>

  `

  btn.onclick = e => {
    e.preventDefault()
    progress === 100 ? send('read_selection') : send('download_add', selected)
  }

  return btn
}
