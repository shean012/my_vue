
let proxyList = new WeakMap()
let targetList = new WeakMap()

function reactive (target) {
  return setProxy(target)
}
function setProxy (target) {
  if (!isObject(target)) return target
  // 在对象列表中查看有没有对应代理过的对象，如果有，就返回之前代理过的对象 （防止重复代理同一个对象）
  let hasProxy = proxyList.get(target)
  if (hasProxy) return hasProxy
  // 在代理列表中查看 这个代理是否已经存在，如果存在则返回这个代理
  if (targetList.has(target)) return target
  let handler = {
    get (obj, key, receiver) {
      let res = Reflect.get(obj, key)
      // 判断 返回值是不是一个对象，如果是对象，则再次代理 里面的属性 （这样里面的属性都会有proxy的set 和 get）。嵌套对象都可以响应
      return isObject(res) ? setProxy(res) : res
    },
    set (obj, key, value, receiver) {
      let isOwn = hasOwn(obj, key)
      let oldVal = obj[key]
      // 判断是不是自己本身有的属性，如果不是，就是新增属性
      if (!isOwn) {
        // 新增属性，触发依赖更新
        trigger(obj, 'ADD', key)
      } else if (oldVal !== value) {
        console.log('数据更新，触发依赖更新')
        trigger(obj, 'SET', key)
      }
      let res = Reflect.set(obj, key, value, receiver)
      return res
    },
  }
  // 如果传入的值是一个对象， 就将这个对象进行 proxy 代理设置
  let reactiveObj = new Proxy(target, handler)
  proxyList.set(target, reactiveObj)
  targetList.set(reactiveObj, target)
  // 返回 设置 代理完的 对象
  return reactiveObj
}

function isObject (data) {
  if (typeof data === 'object') return true
  else return false
}

function hasOwn (obj, key) {
  return obj.hasOwnProperty(key)
}

/**
 * activeReactiveEffectStack 这个数组可以看作一个 栈 类型的数组。这里会先记录了effct, 利用js单线程的特性, effect中会执行一次 当effect 中的fn 执行过后，activeReactiveEffectStack就将effect 推出，然后垃圾回收
 **/
let activeReactiveEffectStack = []

// 依赖收集
function effect (fn) {
  let effect = createReactiveEffect(fn)
  effect()
}

// 将 effect 创建成一个响应的函数
function createReactiveEffect (fn) {
  let effect = function() {
    return run(effect, fn)
  }
  return effect
}

function run (effect, fn) {
  if (activeReactiveEffectStack.indexOf(effect) === -1) {
    try {
      // 我们将 effect 放在这个 activeReactiveEffectStack 中， 这样就等于我们将 effect 存起来，当fn 执行的时候，我们可以拿到这个 effect
      activeReactiveEffectStack.push(effect)
      fn() // fn 执行就会 代理数据的 get 所以 这里执行 fn 就会触发依赖收集
    } finally {
      // 这里将 activeReactiveEffectStack 中的effect 清空，有利于垃圾回收
      activeReactiveEffectStack.pop()
    }
  }
}

// 定义一个依赖收集列表
let targetMap = new WeakMap()

function track (target, key) {
  // 将之前存在 activeReactiveEffectStack 中的 effect 拿出来
  let effect = activeReactiveEffectStack[activeReactiveEffectStack.length - 1]
  if (effect) {
    // 我们先看看这个 targetMap （依赖列表）里面是否已经存在这个对象了。如果有在里面添加就可以了，如果没有，就添加一个依赖
    let depMaps = targetMap.get(target)
    if (!depMaps) targetMap.set(target, depMaps = new Map())
    // 
    let keyMaps = depMaps.get(key)
    if (!keyMaps) depMaps.set(key, keyMaps = new set())
    if (!keyMaps.has(effect)) keyMaps.add(effect)
  }
}

function trigger(target, type, key) {
  let depsMap = targetMap.get(target)
  if (depsMap) {
    let del = dep.get(key)
    if (del) {
      del.forEach(effect => {
        effect()
      })
    }
  }
}
