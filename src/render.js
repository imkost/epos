/* global isStringOrNumber */
/* global isObject */
/* global isArray */
/* global isFunction */
/* global isStream */
/* global renderObject */
/* global renderArray */
/* global renderFunction */
/* global renderStream */

function render (template) {
  if (template instanceof window.Node) {
    return template
  }

  if (isStringOrNumber(template)) {
    return document.createTextNode(template)
  }

  if (isObject(template)) {
    return renderObject(template)
  }

  if (isArray(template)) {
    return renderArray(template)
  }

  if (isFunction(template)) {
    return renderFunction(template)
  }

  if (isStream(template)) {
    return renderStream(template)
  }

  return document.createTextNode('')
}
