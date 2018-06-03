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

window.store = Epos.object({
  products: {
    apple: { id: 'apple', title: 'Яблоко' },
    orange: { id: 'orange', title: 'Апельсин' },
    phone: { id: 'phone', title: 'Телефон' },
    tv: { id: 'tv', title: 'Телевизор' }
  },

  categories: [
    {
      id: 'food',
      title: 'Еда',
      productIds: [ 'apple', 'orange' ]
    },
    {
      id: 'tech',
      title: 'Техника',
      productIds: [ 'phone', 'tv' ]
    }
  ],

  curCategoryId: 'food',

  cart: [
    { productId: 'apple', count: 2 }
  ]
})

/*!
 * View
 */

window.view = {
  class: 'shop',
  inner: [
    {
      tag: 'input',
      value: () => store.categories.find(c => c.id === store.curCategoryId).title,
      oninput: 'handlers.onCategoryTitleInput(this)'
    },
    {
      tag: 'input',
      value: () => store.categories.find(c => c.id === store.curCategoryId).title,
      oninput: 'handlers.onCategoryTitleInput(this)'
    },

    // Tabs
    {
      class: 'tabs',
      inner: store.categories.map(category => {
        return {
          class: () => [
            'tab',
            category.id === store.curCategoryId ? ' tab-active' : ''
          ].join(''),
          onclick: `handlers.onTabClick('${category.id}')`,
          inner: () => category.title
        }
      })
    },

    // Showcase
    {
      class: 'showcase',
      inner: () => store.categories.find(c => c.id === store.curCategoryId).productIds.map(productId => {
        var product = store.products[productId]

        // Product
        return {
          class: 'product',
          onclick: `handlers.onProductClick('${product.id}')`,
          inner: product.title
        }
      })
    },

    // Cart
    {
      class: 'cart',
      inner: () => store.cart.map(cartItem => {
        var product = store.products[cartItem.productId]

        // Cart item
        return {
          class: 'cart-item',
          inner: [
            {
              class: 'cart-item-title',
              inner: product.title
            },
            {
              class: 'cart-item-count',
              inner: () => cartItem.count
            },
            {
              class: 'cart-item-action',
              onclick: `handlers.onCartAddClick('${cartItem.productId}')`,
              inner: '[add]'
            },
            {
              class: 'cart-item-action',
              onclick: `handlers.onCartRemoveClick('${cartItem.productId}')`,
              inner: '[remove]'
            }
          ]
        }
      })
    }
  ]
}

/*!
 * Handlers
 */

window.handlers = {
  onTabClick: (categoryId) => acts.setCurCategoryId(categoryId),
  onProductClick: (productId) => acts.addToCart(productId),
  onCartAddClick: (productId) => acts.addToCart(productId),
  onCartRemoveClick: (productId) => acts.removeFromCart(productId),

  onCategoryTitleInput ($input) {
    var curCategory = store.categories.find(c => c.id === store.curCategoryId)
    curCategory.title = $input.value
  }
}

/*!
 * Actions
 */

var acts = {
  setCurCategoryId (categoryId) {
    store.curCategoryId = categoryId
  },

  addToCart (productId) {
    var cartItem = store.cart.find(c => c.productId === productId)

    // Increase count
    if (cartItem) {
      cartItem.count += 1

    // Add to cart
    } else {
      store.cart.push({ productId, count: 1 })
    }
  },

  removeFromCart (productId) {
    var index = store.cart.findIndex(c => c.productId === productId)
    var cartItem = store.cart[index]

    // Decrease count
    if (cartItem.count > 1) {
      cartItem.count -= 1

    // Remove from cart
    } else {
      store.cart.splice(index, 1)
    }
  }
}

})()
