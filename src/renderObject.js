
function setAttributeSafe (elem, key, value) {
  if (isStringOrNumber(value) || typeof value === 'boolean') {
    if (key in elem) {
      elem[key] = value
    } else {
      elem.setAttribute(key, value)
    }
  } else {
    elem.removeAttribute(key)
  }
}

function renderObject (template) {
  const tag = template.tag || 'div'

  let node
  if (template.xmlns) {
    node = document.createElementNS(template.xmlns, tag)
  } else {
    node = document.createElement(tag)
  }

  for (const key in template) {
    if (key !== 'tag' && key !== 'inner') {
      const value = template[key]
      if (value && value[_isEventHandler_]) {
        node.addEventListener(key, value)
      } else if (isFunction(value)) {
        createAutorun(() => {
          setAttributeSafe(node, key, value())
        })
      } else {
        setAttributeSafe(node, key, value)
      }
    }
  }

  const children = toFlatArray(render(template.inner))
  for (const child of children) {
    node.appendChild(child)
  }

  return node
}
