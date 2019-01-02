(() => {

Epos.rehydrate = rehydrate

function rehydrate (elem, view) {
  elem.insertAdjacentElement('beforebegin', Epos.element(view))
  elem.remove()
  return

  if (
    (view.tag || 'div').toLowerCase() === elem.tagName.toLowerCase() &&
    attrsAreOk(elem, view)
  ) {
    for (var key in view) {
      if (isEvent(key)) {
        console.log('listener');
        elem.addEventListener(key.toLowerCase().slice(2), view[key])
      }
    }

    toFlatArray(view.inner).map((inn, i) => {
      if (typeof inn === 'function') {
        inn = inn().toString()
      }
      if (typeof inn !== 'string') {
        rehydrate(elem.childNodes[i], inn)
      }
    })

  } else {
    console.log('bad');
  }
}

function attrsAreOk (elem, view) {
  for (var key in view) {
    if (key !== 'tag' && !isEvent(key)) {
      var value = view[key]
      if (typeof value === 'function') {
        value = value()
      }

      if (key === 'inner') {
        if (typeof value === 'number') {
          value = value.toString()
        }
        if (typeof value === 'string' && elem.innerHTML.trim() !== value) {
          return false
        }
        continue
      }

      if (elem.getAttribute(key) !== value) {
        return false
      }
    }
  }

  return true
}

var EVENTS = [
  'abort', 'auxclick', 'beforecopy', 'beforecut', 'beforepaste', 'blur',
  'cancel', 'canplay', 'canplaythrough', 'change', 'click', 'close',
  'contextmenu', 'copy', 'cuechange', 'cut', 'dblclick', 'drag', 'dragend',
  'dragenter', 'dragleave', 'dragover', 'dragstart', 'drop',
  'durationchange', 'emptied', 'ended', 'error', 'focus',
  'gotpointercapture', 'input', 'invalid', 'keydown', 'keypress', 'keyup',
  'load', 'loadeddata', 'loadedmetadata', 'loadstart', 'lostpointercapture',
  'mousedown', 'mouseenter', 'mouseleave', 'mousemove', 'mouseout',
  'mouseover', 'mouseup', 'mousewheel', 'paste', 'pause', 'play', 'playing',
  'pointercancel', 'pointerdown', 'pointerenter', 'pointerleave',
  'pointermove', 'pointerout', 'pointerover', 'pointerup', 'progress',
  'ratechange', 'reset', 'resize', 'scroll', 'search', 'seeked', 'seeking',
  'select', 'selectstart', 'stalled', 'submit', 'suspend', 'timeupdate',
  'toggle', 'touchcancel', 'touchend', 'touchmove', 'touchstart',
  'volumechange', 'waiting', 'wheel'
].map(e => `on${e}`)

function isEvent (attrName) {
  return attrName && EVENTS.includes(attrName.toLowerCase())
}




function isArray (any) {
  return Array.isArray(any)
}

function isObject (any) {
  return Object.prototype.toString.call(any) === '[object Object]'
}

function isFunction (any) {
  return Object.prototype.toString.call(any) === '[object Function]'
}

function isNonEmptyString (any) {
  return isString(any) && any
}

function alwaysArray (any) {
  return isArray(any) ? any : [ any ]
}

function safeString (str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function toFlatArray (any) {
  if (isArray(any)) {
    return flatten(any)
  }

  return [ any ]
}

function flatten (array) {
  var flat = []

  array.forEach(item => {
    if (isArray(item)) {
      flat = flat.concat(flatten(item))
    } else {
      flat.push(item)
    }
  })

  return flat
}

})()
