(() => {

/*!
 * Starter
 */

document.addEventListener('DOMContentLoaded', () => {
  var $app = Epos.element(view)
  document.body.appendChild($app)
})

var LS = {
  set (key, value) {
    localStorage.setItem(key, JSON.stringify(value))
  },

  get (key) {
    var value = localStorage.getItem(key)
    return value ? JSON.parse(value) : null
  }
}

var initialStore = LS.get('store') || {
  filter: 'all', // all/active/inactive
  todos: [
    {
      id: generateId(),
      done: false,
      text: 'read a book'
    }
  ]
}

/*!
 * Store
 */

var store = Epos.object(initialStore)

/*!
 * View
 */

var view = {
  class: () => [
    'todo-app',
    store.filter === 'active' ? ' todo-app-active' : '',
    store.filter === 'inactive' ? ' todo-app-inactive' : ''
  ].join(''),
  inner: [
    // New todo form
    {
      tag: 'form',
      class: 'new-todo-form',
      onsubmit: 'handlers.onNewTodoSubmit(event)',
      inner: {
        tag: 'input',
        autocomplete: 'off',
        placeholder: 'What needs to be done?',
        name: 'text'
      }
    },

    // Todos
    {
      class: 'todos',
      inner: () => store.todos.map(todo => {
        // Todo item
        return {
          class: () => [
            'todo',
            todo.done ? ' todo-done' : ''
          ].join(''),
          inner: [
            // Todo done mark
            {
              class: 'todo-done-mark',
              onclick: `handlers.onTodoTextClick(${todo.id})`,
              inner: '[done]'
            },
            // Todo text
            {
              class: 'todo-text',
              tag: 'input',
              oninput: `handlers.onTodoInput(event, ${todo.id})`,
              value: todo.text
            },
            // Todo remove button
            {
              class: 'todo-remove',
              onclick: `handlers.onTodoRemoveClick(${todo.id})`,
              inner: '✕'
            }
          ]
        }
      })
    },

    // Filters
    {
      class: 'filters',
      inner: [
        // All
        {
          class: 'filter filter-all',
          onclick: `handlers.onFilterClick('all')`,
          inner: 'All'
        },
        // Active
        {
          class: 'filter filter-active',
          onclick: `handlers.onFilterClick('active')`,
          inner: 'Active'
        },
        // Inactive
        {
          class: 'filter filter-inactive',
          onclick: `handlers.onFilterClick('inactive')`,
          inner: 'Inactive'
        }
      ]
    }
  ]
}

/*!
 * Handlers
 */

window.handlers = {
  onNewTodoSubmit (e) {
    e.preventDefault()
    var input = e.target.text
    if (input.value) {
      acts.createTodo(input.value)
      input.value = ''
    }
  },

  onTodoInput: (e, todoId) => acts.setTodoText(todoId, e.target.value),
  onTodoTextClick: (todoId) => acts.toggleTodo(todoId),
  onTodoRemoveClick: (todoId) => acts.removeTodo(todoId),
  onFilterClick: (filter) => acts.setFilter(filter)
}

/*!
 * Actions
 */

var acts = {
  createTodo (text) {
    store.todos.push({
      id: generateId(),
      done: false,
      text
    })
  },

  setTodoText (todoId, text) {
    var todo = store.todos.find(t => t.id === todoId)
    todo.text = text
  },

  toggleTodo (todoId) {
    var todo = store.todos.find(t => t.id === todoId)
    todo.done = !todo.done
  },

  removeTodo (todoId) {
    var index = store.todos.findIndex(t => t.id === todoId)
    store.todos.splice(index, 1)
  },

  setFilter (filter) {
    store.filter = filter
  }
}

Object.keys(acts).forEach(key => {
  var orig = acts[key]
  acts[key] = (...args) => {
    orig(...args)
    LS.set('store', store)
  }
})

/*!
 * Helpers
 */

function generateId () {
  return Math.round(Math.random() * 1000000)
}

})()
