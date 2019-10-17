// 定义一个vue 的类来实现双向数据绑定
class VUE {
  // 实例化这个类的时候会传入一个对象，对象中会有一个data属性。这里都是我们要实现双向数据绑定的属性。
  // 我们要通过 Object.defineProperty 使这些属性变成响应式
  constructor(options = {}) {
    this.el = options.el
    this._data = options.data;
    setReactive(this._data)
    // 初始化 computed 方法
    this.initComputed(options.computed)
    // 编译页面
    this.compileViews(this.el, this._data)
    // 将 _data 中的所有的值 赋值到 this 上，到时就可以在外面调用 this
    for (let key in this._data) {
      Object.defineProperty(this, key, {
        enumerable: true,
        configurable: true,
        get () {
          return this._data[key]
        },
        set (newVal) {
          this._data[key] = newVal
        }
      })
    }
  }
  // // 给data 中的数据设置响应方法
  // setReactive (data) {
  //   // 先判断传入的值是不是对象，因为我们要做递归添加响应方法（因为data中的属性有可能是object，我们要将object里面的属性都有响应），在下面遍历data中的属性时再调用这个方法，判断是不是object 如果是 object 类型，调用多次difineReactive这个方法
  //   if (typeof data !== 'object') return
  //   if (Array.isArray(data)) {
  //     let proto = this.arrayNewPrototype
  //     Object.setPrototypeOf(data, proto)
  //   }
  //   this.difineReactive(data)
  // }

  // difineReactive (data) {
  //   let that = this
  //   let dep = new Dep()
  //   for (let key in data) {
  //     this.setReactive(data[key])
  //     // 获取data对象中原属性的值
  //     let val = data[key]
  //     Object.defineProperty(data, key, {
  //       configurable: true,
  //       enumerable: true,
  //       get () {
  //         if (Dep.target) {
  //           dep.addSub(Dep.target)
  //         }
  //         return val
  //       },
  //       set (newVal) {
  //         if (val === newVal) return
  //         val = newVal
  //         // 如果设置的新值是对象的话，需要将对象中属性都拥有响应的方法，所以我们这里还要调用多次 setReactive 这个方法来判断设置的新值，如果是对象类型，就再次设置响应方法 
  //         that.setReactive(val)
  //         dep.notify()
  //       }
  //     })
  //   }
  // }

  // 编译页面数据
  compileViews (el, vm) {
    // 通过 id 找到 页面对应的 element 节点
    let elem = document.getElementById(el)
    let fragment = document.createDocumentFragment()
    // 循环elem 下的只子节点，每一个移动到 fragment 中，当所有的节点都移除了，child = undefined 跳出循环
    let child
    while (child = elem.firstChild) {
      fragment.appendChild(child)
    }
    this.replaceDom(fragment, vm)
    // 讲文档碎片中 处理好的节点 重新移动到页面上
    elem.appendChild(fragment)
  }

  // 替换页面中包含 {{}} 的文本里面的内容
  replaceDom (elem, vm) {
    // 将 fragment 文档碎片
    Array.from(elem.childNodes).forEach(item => {
      // 循环每个节点，找到符合条件的
      let reg = /\{\{(.*)\}\}/
      // 节点里面的内容
      let content = item.textContent
      // 如果节点类型是文本（nodeType === 3）并且 节点的内容 通过正则匹配到有 {{}} 字符的内容
      if (item.nodeType === 3 && reg.test(content)) {
        // 获取 {{}} 里面的值。 正则的第一组（$1）的内容
        let targetAttr = RegExp.$1
        // 如果节点上的值是多层点引用的，就进行循环处理
        let val = vm
        let arr = targetAttr.split('.')
        arr.forEach(item => {
          val = val[item]
        })
        /**
         * 这里会将页面用到 响应的变量 的节点文本 进行替换，所以这里每一次都触发一次 响应变量的 getter 方法。来获取值并且替换到文本节点上。所以我们可以在这里进行创建依赖 （新建订阅者）
         */
        new Watcher(vm, targetAttr, (newVal) => {
          // 这里将vm 和 对应的目标 响应属性 传到 watcher 中。 当数据发生改变时，订阅列表开始通知所有的订阅者，就可以通过 vm 和 对应的目标 获取到最新的值 （newVal）然后再替换
          item.textContent = content.replace(reg, newVal)
        })
        // 对符合这个规定的节点进行替换
        item.textContent = content.replace(reg, val)
      }
      // 如果节点是标签属性 判断标签里面 标签属性 有没有是 v-model 的
      if (item.nodeType === 1) {
        Array.from(item.attributes).forEach(attr => {
          if (attr.name === 'v-model') {
            let val = vm
            let arr = attr.value.split('.')
            arr.forEach(key => {
              val = val[key]
            })
            item.value = val
            // 将这种通过 v-model 的方式 绑值的 情况 也添加到 dep 订阅列表
            new Watcher(vm, attr.value, newVal => {
              item.value = newVal
            })
            // 当这个节点 (input) 触发 input 时。就会改变vm 的值， 就会触发set 里面的notify 通知所有的
            item.addEventListener('input', (e) => {
              let newVal = e.target.value
              // 这里对 vm 进行了 嵌套赋值 当 vm 的值改变了之后，就会触发set 来触发改变所有的订阅者
              function setDeepObj (data, list, num) {
                if (num < list.length) {
                  let curAttr = list[num]
                  setDeepObj(data[curAttr], list, num + 1)
                }
                if (num === list.length - 1) {
                  let curAttr = list[num]
                  data[curAttr] = newVal
                }
              }
              setDeepObj(vm, arr, 0)
            })
          }
        })
      }
      // 当是节点类型是标签类型时，说明里面还有childNodes。 说明里面还有其他内容，再调用这个方法，循环判断里面 是否有符合的内容
      if (item.childNodes) this.replaceDom(item, vm)
    })
  }

  initComputed (data) {
    Object.keys(data).forEach(item => {
      Object.defineProperty(this._data, item, {
        enumerable: true,
        configurable: true,
        get: typeof data[item] === 'function' ? data[item] : data[item].get,
        set () { }
      })
    })
  }
}


// 对数组进行函数劫持
function arrayHijack() {
  let ordPrototype = Array.prototype
  // 通过 Object.create 进行原型拷贝， 返回一个新的对象，继承了原数组所有方法，并且指针和原数组不一样
  let proto = Object.create(ordPrototype)
  let methods = ['push']
  methods.forEach(method => {
    proto[method] = ordPrototype[method].call(this, ...arguments)
    // dep.notify()
  })
  return proto
}

// 给data 中的数据设置响应方法
function setReactive (data) {
  // 先判断传入的值是不是对象，因为我们要做递归添加响应方法（因为data中的属性有可能是object，我们要将object里面的属性都有响应），在下面遍历data中的属性时再调用这个方法，判断是不是object 如果是 object 类型，调用多次difineReactive这个方法
  if (typeof data !== 'object') return
  if (Array.isArray(data)) {
    let proto = arrayHijack()
    Object.setPrototypeOf(data, proto)
  }
  new DifineReactive(data)
}

class DifineReactive {
  constructor(data) {
    this.data = data
    this.dep = new Dep()
    let that = this
    for (let key in this.data) {
      setReactive(this.data[key])
      // 获取data对象中原属性的值
      let val = this.data[key]
      Object.defineProperty(this.data, key, {
        configurable: true,
        enumerable: true,
        get () {
          if (Dep.target) {
            that.dep.addSub(Dep.target)
          }
          return val
        },
        set (newVal) {
          if (val === newVal) return
          val = newVal
          // 如果设置的新值是对象的话，需要将对象中属性都拥有响应的方法，所以我们这里还要调用多次 setReactive 这个方法来判断设置的新值，如果是对象类型，就再次设置响应方法 
          setReactive(val)
          that.dep.notify()
        }
      })
    }
  }
}







// 依赖收集 订阅者列表
class Dep {
  constructor() {
    this.subs = []
  }
  // 添加依赖
  addSub (sub) {
    this.subs.push(sub)
  }

  // 删除依赖 这个要和 vue $delete 来结合使用 
  removeSub (sub) {
    if (this.subs.length) {
      const idx = this.subs.indexOf(sub)
      if (idx > -1) {
        return arr.split(idx, 1)
      }
    }
  }

  // 通知依赖 更新视图 触发 watcher 的 update方法
  notify () {
    this.subs.forEach(item => item.update())
  }
}

// 订阅者
class Watcher {
  constructor(data, exp, cb) {
    this.data = data
    this.exp = exp
    this.cb = cb
    Dep.target = this
    // 下面这段代码执行的时候，就会执行 getter ，我们就可以在getter 里面收集依赖，所以我们将 Dep.target = this 到时调用 Dep 的addSub 方法。就可将这个watcher 添加到 Dep 里面
    let val = data
    let arr = exp.split('.')
    arr.forEach(item => {
      val = val[item]
    })
    Dep.target = null
  }

  update () {
    let val = this.data
    let arr = this.exp.split('.')
    arr.forEach(item => {
      val = val[item]
    })
    this.cb(val)
  }
}