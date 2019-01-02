(() => {

window.Wd = {
  element
}

var RESERVED_KEYS = [
  'tag', 'inner'
]

/**
 * desc = Object
 * => HTML
 */
function element (desc) {
  if (Array.isArray(desc)) {
    return toFlatArray(desc).map(element)
  }

  if (typeof desc === 'string') {
    return document.createTextNode(desc)
  }

  makeLinkIfHref(desc)

  var tag = getTag(desc)
  var children = getChildren(desc)

  var elem = document.createElement(tag)

  for (var key in desc) {
    if (isReservedKey(key)) {
      continue
    }
    elem.setAttribute(key, desc[key])
  }

  children.forEach(child => {
    elem.appendChild(child)
  })

  return elem
}

function alwaysArray (any) {
  return Array.isArray(any) ? any : [ any ]
}

function makeLinkIfHref (desc) {
  if (isNonEmptyString(desc.href) && !desc.tag) {
    desc.tag = 'a'
  }
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

  return 'div'
}

function getChildren (desc) {
  if ('inner' in desc) {
    return toFlatArray(desc.inner).map(element)
  }

  return []
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
  if (Array.isArray(any)) {
    return flatten(any)
  }

  return [ any ]
}

function flatten (array) {
  var flat = []

  array.forEach(item => {
    if (Array.isArray(item)) {
      flat = flat.concat(flatten(item))
    } else {
      flat.push(item)
    }
  })

  return flat
}

})()
