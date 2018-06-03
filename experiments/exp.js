/*!
 * Custom element Tabs
 */

var Tabs = {
  lastId: 0,
  states: {},

  /**
   * props = {
   *   activeTabIndex: 0
   *   tabs: [
   *     {
   *       title: String
   *       content: Block
   *     }
   *     ...
   *   ]
   * }
   */
  render (props) {
    var id = Tabs.lastId++
    var state = Epos.object({ activeTabIndex: props.activeTabIndex })
    Tabs.states[id] = state
    props = Epos.object(props)

    return {
      class: 'tabs',
      inner: [
        {
          class: 'tabs-line',
          style: 'display: flex',
          inner: props.tabs.map((tab, i) => {
            return {
              class: 'tab',
              style: () => state.activeTabIndex === i ? 'background: red' : '',
              onclick: `Tabs.onClick(${id}, ${i})`,
              inner: tab.title
            }
          })
        },
        {
          class: 'content',
          inner: () => {
            return props.tabs[state.activeTabIndex].content
          }
        }
      ]
    }
  },

  onClick (id, tabIndex) {
    var state = Tabs.states[id]
    state.activeTabIndex = tabIndex
  }
}

/*!
 * Store
 */

var store = Epos.object({
  size: 20
})

/*!
 * View
 */

var view = {
  class: 'app',
  inner: [
    Tabs.render({
      activeTabIndex: 0,
      tabs: [
        {
          title: 'first tab',
          content: {
            style: 'font-size: 40px',
            inner: 'first tab inner'
          }
        },
        {
          title: 'second tab',
          content: {
            style: 'color: red',
            inner: 'second tab inner'
          }
        }
      ]
    }),
    Tabs.render({
      activeTabIndex: 0,
      tabs: [
        {
          title: 'first tab',
          content: {
            style: () => `font-size: ${store.size}px`,
            inner: 'first tab inner'
          }
        },
        {
          title: 'second tab',
          content: {
            style: 'color: red',
            inner: 'second tab inner'
          }
        }
      ]
    })
  ]
}

/*!
 *
 */

function onTabClick (tabIndex) {
  store.curTabIndex = tabIndex
}

document.addEventListener('DOMContentLoaded', () => {
  var $app = Epos.element(view)
  document.body.appendChild($app)
})

