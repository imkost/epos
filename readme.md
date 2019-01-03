## Source

Бывает двух типов: объект или массив.

Source объект — это обычный объект с get и set на key$.
Source массив — это обычный массив + мнимые методы pop$/push$/shift$/unshift$/splice$/map$

## Stream

Stream — это source-массив с процессингом и continuous.






// BASE API:
// -------
// dynamic
// render

// ADVANCED API:
// -------
// autorun(fn, isStandalone)
// transaction(fn)
// useRenderPlugin({ preprocess, postprocess })


// useRenderPlugin(classArray)
// useRenderPlugin(dataObject)
// useRenderPlugin(styleObject)


// new Map()
// new Symbol()
// _isStream_ = new EposSymbol()
// [] = new EposMap()
// [] = new EposSet()
// get(s, _isStream_)
// get(s, _itemAdd_)
// createSymbol
// const stateByPlugin = createMap()


// let isSvg = false
// useRenderPlugin({
//   preprocess ({ state, template }) {
//     if (template.tag === 'svg') {
//       isSvg = true
//     }
//     if (isSvg) {
//       template.xmlns = 'http://www.w3.org/2000/svg'
//     }
//   },
//   postprocess () {
//     if (isSvg) {
//       isSvg = false
//     }
//   }
// })

// useRenderPlugin({
//   preprocess ({ state, template }) {
//     if (template && template.class) {
//       state.class = template.class
//       delete template.class
//     }
//   },
//   postprocess ({ state, node }) {
//     if (state.class) {
//       autorun(() => {
//         const className = [].concat(dynamic(state.class))
//           .filter(c => c && typeof c === 'string')
//           .join(' ')
//           .split(/\s+/)
//           .join(' ')
//         node.setAttribute('class', className)
//       })
//     }
//   }
// })

// useRenderPlugin({
//   preprocess ({ state, template }) {
//     if (template && isObject(template.style)) {
//       state.style = template.style
//       delete template.style
//     }
//   },
//   postprocess ({ state, node }) {
//     if (state.style) {
//       for (const key in style) {
//         const value = style[key]
//         autorun(() => {
//           node.style[key] = dynamic(value)
//         })
//       }
//     }
//   }
// })


// useRenderPlugin(customEvents([
//   'longtouch',
//   'longpress',
//   'nativerotate'
// ]))

// useRenderPlugin({
//   preprocess ({ state, template }) {
//     if (template && template.onlongtouch) {
//       state.onlongtouch = template.onlongtouch
//       delete template.onlongtouch
//     }
//   },
//   postprocess ({ state, node }) {
//     if (state.onlongtouch) {
//       node.addEventListener('longtouch', state.onlongtouch)
//     }
//   }
// })

// useRenderPlugin(classArray)
// useRenderPlugin(dataObject)
// useRenderPlugin(styleObject)
// useRenderPlugin(camelCase)
// useRenderPlugin(rawCode)
// useRenderPlugin(svgSupport)
// useRenderPlugin(mountUnmount)
// useRenderPlugin()


// addRenderPlugin({
//   preprocess ({ template }) {
//     if (template) {
//       for (const key in template) {
//         if (EVENTS.includes(key)) {
//           template['$' + key] = template[key]
//           delete template[key]
//         }
//       }
//     }
//   }
// })

// for (const key in document) {
//   mm.push(key)
// }
// mm.filter(function(i){return i.substring(0,2)=='on'&&(document[i]==null||typeof document[i]=='function');})

/* global _change_ */
/* global _isEndNode_ */
/* global _isEventHandler_ */
/* global _isStartNode_ */
/* global _itemAdd_ */
/* global _itemRemove_ */
/* global _nodeId_ */
/* global computedSources */
/* global curTransaction */
/* global globalNodeId */
/* global isArray */
/* global isFunction */
/* global isStringOrNumber */
/* global renderPlugins */
/* global toFlatArray */
/* global createSource */
/* global isObject */
/* global _isStream_ */
/* global createStream */
/* global curGet:true */
/* global curAutorun:true */

window.Epos = {
  // Reactivity
  createSource,
  createAutorun,
  createStandaloneAutorun,
  getComputed,
  makeTransaction,

  // Rendering
  render,
  createEventHandler,
  addRenderPlugin
}

