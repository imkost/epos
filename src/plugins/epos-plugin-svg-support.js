/**
 * Copyright (c) Konstantin Zemtsovsky
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

let isInsideSvg = false

const svgSupport = {
  preprocess ({ state, template }) {
    if (template.tag === 'svg') {
      isInsideSvg = true
      state.isSvg = true
    }
    if (isInsideSvg) {
      template.xmlns = 'http://www.w3.org/2000/svg'
    }
  },
  postprocess ({ state }) {
    if (state.isSvg) {
      isInsideSvg = false
    }
  }
}
