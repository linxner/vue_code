const compileUtil = {
  getVal(expr, vm) {
    return expr.split(".").reduce((data, currentVal) => {
      // console.log( currentVal);
      return data[currentVal];
    }, vm.$data);
  },
  setVal(expr, vm, inputVal) {
    return expr.split(".").reduce((data, currentVal) => {
      // console.log( currentVal);
      data[currentVal] = inputVal;
    }, vm.$data);
  },
  getContent(expr, vm) {
    return expr.replace(/\{\{(.+?)\}\}/g, (...arg) => {
      return this.getVal(arg[1], vm);
    });
  },
  text(node, expr, vm) {
    let value;
    if (expr.indexOf("{{") !== -1) {
      value = expr.replace(/\{\{(.+?)\}\}/g, (...arg) => {
        // console.log(arg);
        new Watcher(vm, arg[1], (newVal) => {
          this.update.textUpdate(node, this.getContent(expr, vm));
        });
        return this.getVal(arg[1], vm);
      });
    } else {
      value = this.getVal(expr, vm);
    }
    this.update.textUpdate(node, value);
  },
  html(node, expr, vm) {
    const value = this.getVal(expr, vm);
    new Watcher(vm, expr, (newVal) => {
      this.update.htmlUpdate(node, newVal);
    });
    this.update.htmlUpdate(node, value);
  },
  model(node, expr, vm) {
    const value = this.getVal(expr, vm);
    new Watcher(vm, expr, (newVal) => {
      this.update.modelUpdate(node, newVal);
    });
    node.addEventListener("input", (e) => {
      this.setVal(expr, vm, e.target.value);
    });
    this.update.modelUpdate(node, value);
  },
  on(node, expr, vm, eventName) {
    let fn = vm.$options.methods && vm.$options.methods[expr];
    node.addEventListener(eventName, fn.bind(vm), false);
  },
  update: {
    textUpdate(node, value) {
      node.textContent = value;
    },
    htmlUpdate(node, value) {
      node.innerHTML = value;
    },
    modelUpdate(node, value) {
      node.value = value;
    },
  },
};

class Compile {
  constructor(el, vm) {
    this.el = this.isElementNode(el) ? el : document.querySelector(el);
    // console.log(this.el);
    this.vm = vm;
    //获取文档碎片
    const fragment = this.node2Fragment(this.el);

    //编译
    this.compile(fragment);
    // console.log(fragment);

    //添加子元素
    this.el.appendChild(fragment);
  }
  isElementNode(node) {
    return node.nodeType === 1;
  }
  node2Fragment(el) {
    const f = document.createDocumentFragment();
    let firstChild;
    while ((firstChild = el.firstChild)) {
      f.appendChild(firstChild);
    }
    return f;
  }
  compile(fragment) {
    const childNode = fragment.childNodes;
    [...childNode].forEach((node) => {
      // console.log(node);
      if (this.isElementNode(node)) {
        this.compileElement(node);
      } else {
        this.compileText(node);
      }
      if (node.childNodes && node.childNodes.length) {
        this.compile(node);
      }
    });
  }
  compileElement(node) {
    const attr = node.attributes;
    [...attr].forEach((attr) => {
      const { name, value } = attr;
      // console.log(name,value);

      if (this.isDirective(name)) {
        const [, directive] = name.split("-");
        console.log(directive);
        const [dirName, eventName] = directive.split(":");
        compileUtil[dirName](node, value, this.vm, eventName);
        node.removeAttribute("v-" + directive);
      }
    });
    // console.log(attr);
  }
  compileText(text) {
    // console.log(text.textContent);
    const content = text.textContent;
    if (/\{\{(.+?)\}\}/.test(content)) {
      // console.log(content);
      compileUtil["text"](text, content, this.vm);
    }
  }
  isDirective(attrName) {
    return attrName.startsWith("v-");
  }
}

class Observer {
  constructor(data) {
    this.observer(data);
  }
  observer(data) {
    /**
     * {
     *  person:{
     *      name:'a',
     *      fav:{
     *          b:"aa"
     *      }
     *  }
     * }
     */
    if (data && typeof data === "object") {
      Object.keys(data).forEach((key) => {
        this.defineReactive(data, key, data[key]);
      });
    }
  }
  defineReactive(obj, key, value) {
    this.observer(value);
    const dep = new Dep();
    Object.defineProperty(obj, key, {
      enumerable: true,
      configurable: false,
      get() {
        Dep.target && dep.addSub(Dep.target);
        return value;
      },
      set: (newVal) => {
        this.observer(newVal);
        if (newVal !== value) {
          value = newVal;
          dep.notify();
        }
      },
    });
  }
}

class Dep {
  constructor() {
    this.subs = [];
  }
  addSub(watcher) {
    this.subs.push(watcher);
  }
  notify() {
    console.log("观察者", this.subs);
    this.subs.forEach((w) => w.update());
  }
}

class Watcher {
  constructor(vm, expr, cb) {
    this.vm = vm;
    this.expr = expr;
    this.cb = cb;
    this.oldVal = this.getOldVal();
  }
  getOldVal() {
    Dep.target = this;
    const oldVal = compileUtil.getVal(this.expr, this.vm);
    Dep.target = null;
    return oldVal;
  }
  update() {
    const newVal = compileUtil.getVal(this.expr, this.vm);
    if (newVal !== this.oldVal) {
      this.cb(newVal);
    }
  }
}
class Vue {
  constructor(options) {
    this.$el = options.el;
    this.$data = options.data;
    this.$options = options;
    if (this.$el) {
      new Observer(this.$data);
      new Compile(this.$el, this);
      this.proxyData(this.$data);
    }
  }
  proxyData(data) {
    for (const key in data) {
      Object.defineProperty(this, key, {
        get() {
          return data[key];
        },
        set() {
          data[key] = newVal;
        },
      });
    }
  }
}
