/**
 * Copyright (c) Konstantin Zemtsovsky
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const elemsToObserve = new Set()

const mountUnmount = {
  preprocess ({ state, template }) {
    if (!template) {
      return
    }

    if (template.onMount) {
      state.onMount = template.onMount
      delete template.onMount
    }

    if (template.onUnmount) {
      state.onUnmount = template.onUnmount
      delete template.onUnmount
    }
  },
  postprocess ({ state, template, node }) {
    if (state.onMount || state.onUnmount) {
      elemsToObserve.add(node)
      node.onMount = state.onMount
      node.onUnmount = state.onUnmount
      startMo()
    }
  }
}

const mo = new MutationObserver(mutations => {
  Array.from(elemsToObserve).forEach(elem => {
    if (elem.__isMounted) {
      if (!document.contains(elem)) {
        if (elem.onUnmount) {
          elem.onUnmount(elem)
        }
        elemsToObserve.delete(elem)
        if (elemsToObserve.size === 0) {
          stopMo()
        }
      }
    } else {
      if (document.contains(elem)) {
        elem.__isMounted = true
        if (elem.onMount) {
          elem.onMount(elem)
        }
      }
    }
  })
})

function startMo () {
  if (mo.__started) {
    return
  }
  mo.__started = true
  mo.observe(document, { childList: true, subtree: true })
}

function stopMo () {
  if (mo.__started) {
    mo.__started = false
    mo.disconnect()
  }
}

