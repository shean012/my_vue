// 实现 dom 视图变化

exports.default = {
  // 接收两个参数， 一个是选中的element，另一个是data中参数的值
  viewChange (el, vm) {
    let elem = document.getElementById('el')
    console.log('elem', elem)
  //   let fragment = document.createDocumentFragment()
  //   // 循环elem 下的只子节点，每一个移动到 fragment 中，当所有的节点都移除了，child = undefined 跳出循环
  //   while(child = elem.firstChild) {
  //     console.log('child', child)
  //     fragment.appendChild(child)
  //   }
  //   console.log('fragment', fragment)
  }
}