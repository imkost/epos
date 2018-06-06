(() => {

var initialCode = '' +
`var store = Epos.object({
  count: 0
})

var view = {
  class: 'app',
  inner: [
    {
      tag: 'button',
      inner: '+',
      onClick: () => store.count += 1
    },
    {
      tag: 'button',
      inner: '-',
      onClick: () => store.count -= 1
    },
    {
      inner: () => store.count
    }
  ]
}

var $app = Epos.element(view)
document.body.appendChild($app)
`

var Epos = window.Epos
var CodeMirror = window.CodeMirror
var cm = null

document.addEventListener('DOMContentLoaded', init)

function init () {
  var $app = Epos.element(_view_)
  document.body.appendChild($app)

  requestAnimationFrame(() => {
    var elem = document.querySelector('.Editor')

    try {
      var codeFromUrl = atob(location.search.split('?js=')[1])
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

    window.cm = cm
    var timer = null
    cm.on('change', () => {
      timer && clearTimeout(timer)
      timer = setTimeout(update, 10)
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
      class: 'App__output',
      inner: ''
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

var listeners = []

function update () {
  var text = cm.getValue()

  localStorage.text = text

  window._intervals.forEach(i => {
    clearInterval(i)
  })
  window._intervals = []

  var encoded = btoa(text)
  setUrl(location.pathname + `?js=${encoded}`)

  Epos._clean()

  var code = `
    ;(function () {
      var __result__ = document.querySelector('.App__output')
      __result__.innerHTML = ''
      ${text.split('document.body').join('__result__')}
      // var $result = Epos.element(view)
      // __result__.appendChild($result)
    })()
  `

  try {
    eval(code)
  } catch (err) {
    var $result = Epos.element({ style: 'color: red; font-family: monospace; line-height: 20px', inner: err.toString() })
    var result = document.querySelector('.App__output')
    result.innerHTML = ''
    result.appendChild($result)
  }
}

function setUrl (url) {
  history.replaceState(null, null, url)
}




})()
