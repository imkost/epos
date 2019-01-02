var store = Epos.object({
  filter: 'all',
  tabId: 0,
  todos: [
    { text: '1', done: false },
    { text: '2', done: false },
    { text: '3', done: false },
    { text: '4', done: false },
    { text: '5', done: false }
  ]
})

var view = {
  class: 'app',
  inner: [
    Tabs({
      onSetTab: Epos.fn(tabData => store.tabId = tabData.id),
      tabs: [
        {
          id: 0,
          title: 'first',
          active: store.tabId === 0,
          content: {
            inner: 'first tab'
          }
        },
        {
          id: 1,
          title: 'second',
          active: store.tabId === 1,
          content: {
            inner: 'second tab'
          }
        }
      ]
    }),
    Tabs({
      tabs: [
        {
          title: 'first',
          active: true,
          content: {
            inner: 'hahaha 1'
          }
        },
        {
          title: 'second',
          content: {
            inner: 'hahaha 2'
          }
        }
      ]
    }),
    {
      tag: 'input',
      onkeydown: (e) => {
        if (e.keyCode === 13) {
          var input = e.target
          if (input.value) {
            store.todos.unshift({ text: input.value, done: false })
            input.value = ''
          }
        }
      }
    },
    {
      class: 'todos',
      inner: () => store.todos.map(todo => {
        return {
          class: 'todo',
          style: () => todo.done ? 'font-style: italic' : null,
          onmousedown: () => todo.done = !todo.done,
          inner: todo.text
        }
      })
    },
    Filter('all'),
    Filter('active')
  ]
}

function Filter (filter) {
  return {
    class: 'filter',
    inner: filter,
    onclick: () => store.filter = filter
  }
}

/**
 * props = {
 *   tabs: [
 *     {
 *       title: String
 *       active: Boolean
 *       content: Block
 *     }
 *     ...
 *  ]
 * }
 */
function Tabs (props) {
  props = Epos.object(props) // how this helps eposId?

  var state = Epos.object({
    activeTabIndex: props.tabs.findIndex(t => t.active)
  })

  return {
    class: 'tabs',
    inner: [
      {
        class: 'tabs-line',
        inner: props.tabs.map((tab, i) => {
          return {
            class: 'tab',
            style: () => state.activeTabIndex === i ? 'background: red' : null,
            onmousedown: () => {
              state.activeTabIndex = i
              props.onSetTab && props.onSetTab(tab)
            },
            inner: tab.title
          }
        })
      },
      {
        class: 'content',
        inner: () => props.tabs[state.activeTabIndex].content
      }
    ]
  }
}

var $app = Epos.element(view)
document.body.appendChild($app)
