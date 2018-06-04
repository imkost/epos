(() => {

var initialCode = `var store = Epos.object({
  count: 0
})

var view = {
  class: 'app',
  style: 'display: flex',
  inner: [
    { tag: 'button', inner: '+', onClick: () => store.count += 1 },
    { tag: 'button', inner: '-', onClick: () => store.count -= 1 },
    { inner: () => store.count, style: 'margin-left: 10px' }
  ]
}
`

var Epos = window.Epos
var CodeMirror = window.CodeMirror
var cm
var css

document.addEventListener('DOMContentLoaded', init)

function init () {
  var $app = Epos.element(_view_)
  document.body.appendChild($app)

  requestAnimationFrame(() => {
    var elem = document.querySelector('.Editor')
    var codeFromUrl

    try {
      codeFromUrl = atob(location.search.split('?js=')[1])
    } catch (err) {}

    cm = CodeMirror(elem, {
      value: codeFromUrl || initialCode,
      mode: 'javascript',
      lineNumbers: true,
      theme: 'material',
      keyMap: 'sublime',
      cursorBlinkRate: 0,
      tabSize: 2
    })
    cm.on('change', () => {
      setTimeout(update)
    })
    update()
  })
}


var _view_ = {
  class: 'App',
  inner: [
    {
      class: 'App__editor',
      inner: Editor({ code: initialCode })
    },
    {
      class: 'App__right',
      inner: [
        {
          class: 'App__info',
          inner: [
            {
              tag: 'pre',
              inner: '' +
                '// Realtime results of\n' +
                'var $app = Epos.element(view)\n' +
                'document.body.appendChild($app)'
            }
          ]
        },
        {
          class: 'App__output',
          inner: ''
        }
      ]
    }
  ]
}

document.addEventListener('keydown', e => {
  if (e.key === 's' && (e.ctrKey || e.metaKey)) {
    e.preventDefault()
  }
})

/**
 * props = {
 *   code: String
 * }
 */
function Editor (props = {}) {
  return {
    class: 'Editor',
  }
}


window._intervals = []

var origSetInterval = setInterval

window.setInterval = (...args) => {
  var id = origSetInterval(...args)
  window._intervals.push(id)
}

function update () {
  var text = cm.getValue()

  localStorage.text = text

  window._intervals.forEach(i => {
    clearInterval(i)
  })
  window._intervals = []

  var encoded = btoa(text)
  setUrl(location.pathname + `?js=${encoded}`)

  var code = `
    ${text}
    var $result = Epos.element(view)
    var result = document.querySelector('.App__output')
    result.innerHTML = ''
    result.appendChild($result)
  `

  try {
    eval(code)
  } catch (err) {
    console.log(err);
  }
}

function setUrl (url) {
  history.replaceState(null, null, url)
}




})()
