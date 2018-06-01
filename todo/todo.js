(() => {

/*!
 * Starter
 */

document.addEventListener('DOMContentLoaded', () => {
  var $app = Epos.element(view)
  document.body.appendChild($app)
})

/*!
 * Store
 */

var store = Epos.object({
  filter: 'all', // all/active/inactive
  todos: [
    {
      id: generateId(),
      done: false,
      text: 'read a book'
    }
  ]
})

/*!
 * View
 */

var view = Epos.view({
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
            // Todo text
            {
              class: 'todo-text',
              onclick: `handlers.onTodoTextClick(${todo.id})`,
              inner: todo.text
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
})

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

/*!
 * Helpers
 */

function generateId () {
  var self = generateId
  self.id || (self.id = 0)
  return self.id++
}

})()
