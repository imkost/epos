;(() => {

var Epos = window.Epos

Epos.html = html
Epos.raw = wrap

var RESERVED_KEYS = [
  'tag', 'inner', 'attrs', 'innerHTML', 'outerHTML'
]

var SELFCLOSING_TAGS = [
  'area', 'base', 'br', 'col', 'command', 'embed', 'hr', 'img', 'input',
  'keygen', 'link', 'menuitem', 'meta', 'param', 'source', 'track', 'wbr'
]

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

function wrap (htmlString) {
  return htmlString ? { __raw__: htmlString } : null;
}

/**
 * desc = Object
 * => HTML
 */
function html (desc) {
  if (isString(desc)) {
    return safeString(desc)
    // return desc ? { __raw__: desc } : null;
  }

  if (!isObject(desc)) {
    throw 'Invalid input, object is expected'
  }

  if ('outerHTML' in desc) {
    var outerHTML = desc.outerHTML

    if (isString(outerHTML)) {
      return outerHTML
    }

    if (isNumber(outerHTML)) {
      return outerHTML.toString()
    }

    if (outerHTML) {
      throw 'Invalid outerHTML';
    }

    return ''
  }

  var tag = getTag(desc)
  var innerStr = getInnerString(desc)
  var attrsStr = getAttrsString(desc)

  return isSelfClosingTag(tag)
    ? `<${tag}${attrsStr} />`
    : `<${tag}${attrsStr}>${innerStr}</${tag}>`
}

/**
 * handle('Form.onSubmit', 'event', { userId: 2 })
 * -> Form.onSubmit(event, { userId: 2 })
 *
 * handle([ 'Form.onSubmit', 1, 2 ], 'a', 'b')
 * -> Form.onSubmit(1, 2, 'a', 'b')
 */
function handle (/* handler, ...args */) {
  var handler = alwaysArray(arguments[0])
  var args = Array.prototype.slice.call(arguments, 1)

  var fnGetter = handler[0]
  if (!fnGetter) {
    return
  }

  if (!isString(fnGetter)) {
    console.warn(`Invalid handler "${fnGetter}"`)
  }

  var fn = safeGet(window, fnGetter)
  if (!isFunction(fn)) {
    console.warn(`\`${fnGetter}\` is not a function`)
    return
  }

  fn.apply(null, handler.slice(1).concat(args))
}

function getTag (desc) {
  if ('tag' in desc) {
    var tag = desc.tag

    if (isString(tag) && /^[\w-]+$/.test(tag)) {
      return tag
    } else {
      throw 'Invalid tag name'
    }
  }

  if (isNonEmptyString(desc.href)) {
    return 'a'
  }

  return 'div'
}

function getInnerString (desc) {
  if ('innerHTML' in desc) {
    var innerHTML = desc.innerHTML

    if (isString(innerHTML)) {
      return innerHTML
    }

    if (isNumber(innerHTML)) {
      return innerHTML.toString()
    }

    if (innerHTML) {
      throw 'Invalid innerHTML'
    }

    return ''
  }

  if ('inner' in desc) {
    var value = desc.inner
    if (typeof value === 'function') {
      value = value()
    }

    return toFlatArray(value)
      .map(innerItemToString)
      .join('')
  }

  return ''
}

function getAttrsString (desc) {
  var attrsStr = ''

  if (desc.attrs) {
    Object.assign(desc, desc.attrs)
  }

  for (var key in desc) {
    if (isReservedKey(key)) {
      continue
    }

    var value = desc[key]

    if (typeof value === 'function') {
      if (isEvent(key)) {
        continue
      }
      value = value()
    }

    if (key === 'class') {
      value = prepareClass(value)

    } else if (isEvent(key) && (isArray(value) || isFnGetter(value))) {
      value = prepareHandler(value)
    }

    var safeKey = safeString(key)

    if (value === true) {
      attrsStr += ` ${safeKey}`

    } else if (isNumber(value)) {
      attrsStr += ` ${safeKey}="${value}"`

    } else if (isString(value)) {
      attrsStr += ` ${safeKey}="${safeString(value)}"`

    } else if (value) {
      if (value.__raw__){
        value = value.__raw__
      } else {
        value = safeString(JSON.stringify(value))
      }

      attrsStr += ` ${safeKey}="${value}"`
    }
  }

  return attrsStr
}

function innerItemToString (item) {
  if (isNumber(item)) {
    return item.toString()
  }

  if (isString(item)) {
    return safeString(item)
  }

  if (isObject(item)) {
    if (item.__raw__) {
      return item.__raw__
    }

    return html(item)
  }

  return ''
}

function prepareClass (attrValue) {
  return toFlatArray(attrValue)
    .filter(isNonEmptyString)
    .join(' ')
    .trim()
    .replace(/\s+/g, ' ')
}

/**
 * prepareHandler('alert')
 * => `alert()`
 *
 * prepareHandler([ 'alert', 4, 'ok' ])
 * => `alert(4, "ok")`
 *
 * prepareHandler([ 'console.log', { userId: 3 } ])
 * => `console.log({"userId":3})`
 */
function prepareHandler (handler) {
  handler = alwaysArray(handler)
  if (!handler.length) {
    return null
  }

  var fnGetter = handler[0]
  if (!isString(fnGetter)) {
    throw 'Invalid handler'
  }

  var args = handler.slice(1)
    .map(prepareHandlerArg)
    .join(', ')

  return `${fnGetter}(${args})`
}

function prepareHandlerArg (arg) {
  if (isNumber(arg) || arg === 'this' || arg === 'event') {
    return arg
  }

  return JSON.stringify(arg)
}

function isReservedKey (key) {
  return RESERVED_KEYS.includes(key)
}

function isSelfClosingTag (tag) {
  return SELFCLOSING_TAGS.includes(tag.toLowerCase())
}

function isEvent (attrName) {
  return EVENTS.includes(attrName.toLowerCase())
}

function isFnGetter (any) {
  return isString(any) && /^[\w.]+$/.test(any)
}

function isNumber (any) {
  return typeof any === 'number' && !isNaN(any)
}

function isString (any) {
  return typeof any === 'string'
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

/**
 * safeGet({ photos: { count: 3 } }, 'photos.count') => 3
 * safeGet({ photos: { count: 3 } }, 'photos.total') => undefined
 *
 * obj = Object
 * getter = String // dots separated
 * => Any || undefined
 */
function safeGet (obj, getter) {
  var keys = getter.split('.')
  var keysCount = keys.length

  var cursor = obj
  for (var i = 0; i < keysCount; i++) {
    try {
      cursor = cursor[keys[i]]
    } catch (err) {
      return undefined
    }
  }

  return cursor
}

})()
