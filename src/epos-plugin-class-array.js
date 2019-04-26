/**
 * Copyright (c) Konstantin Zemtsovsky
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const _prevClassList_ = Symbol('prevClassList')

const classArray = {
  preprocess ({ state, template }) {
    if (template.class) {
      state.class = template.class
      delete template.class
    }
  },

  postprocess ({ state, node }) {
    if (state.class) {
      Epos.autorun(() => {
        const prevClassList = node[_prevClassList_] || []
        const nextClassList = [].concat(typeof state.class === 'function' ? state.class() : state.class)
          .filter(c => c && typeof c === 'string')
          .join(' ')
          .split(/\s+/)

        node[_prevClassList_] = nextClassList

        for (const className of nextClassList) {
          if (className && typeof className === 'string' && !prevClassList.includes(className)) {
            node.classList.add(className)
          }
        }

        for (const className of prevClassList) {
          if (!nextClassList.includes(className)) {
            node.classList.remove(className)
          }
        }
      })
    }
  }
}

render.addPlugin(classArray)
