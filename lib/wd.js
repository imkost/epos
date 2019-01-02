(() => {

window.Wd = {
  html
}

var RESERVED_KEYS = [
  'tag', 'inner', 'innerHTML', 'outerHTML'
]

var SELFCLOSING_TAGS = [
  'area', 'base', 'br', 'col', 'command', 'embed', 'hr', 'img', 'input',
  'keygen', 'link', 'menuitem', 'meta', 'param', 'source', 'track', 'wbr'
]

/**
 * desc = Object
 * => HTML
 */
function html (desc) {
  if (isString(desc)) {
    return desc ? { __raw__: desc } : null;
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
    return toFlatArray(desc.inner)
      .map(innerItemToString)
      .join('')
  }

  return ''
}

function getAttrsString (desc) {
  var attrsStr = ''

  for (var key in desc) {
    if (isReservedKey(key)) {
      continue
    }

    var value = desc[key]

    if (key === 'class') {
      value = prepareClass(value)
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


function isReservedKey (key) {
  return RESERVED_KEYS.includes(key)
}

function isSelfClosingTag (tag) {
  return SELFCLOSING_TAGS.includes(tag.toLowerCase())
}

function isNumber (any) {
  return typeof any === 'number' && !isNaN(any)
}

function isString (any) {
  return typeof any === 'string'
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
