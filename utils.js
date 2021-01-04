/*
 * @Autor: qp.tian
 * @Date: 2021-01-04 15:18:35
 * @LastEditors: qp.tian
 * @LastEditTime: 2021-01-04 15:36:28
 * @Description:
 * @FilePath: /promise-all-race/Users/tqp/github-pro/Utils/utils.js
 */

/**
 *
 * @param {*} obj  数据类型检测
 */
export function toType(obj) {
  let class2type = {},
    toString = class2type.toString;

  // 数据类型检测
  [
    'Boolean',
    'Number',
    'String',
    'Function',
    'Array',
    'Date',
    'RegExp',
    'Object',
    'Error',
    'Symbol',
    'BigInt',
  ].forEach((name) => {
    class2type[`[object ${name}]`] = name.toLowerCase();
  });
  if (obj == null) return obj + '';
  return typeof obj === 'object' || typeof obj === 'function'
    ? class2type[toString.call(obj)] || 'object'
    : typeof obj;
}

export function isFunction(obj) {
  return typeof obj === 'function' && typeof obj.nodeType !== 'number';
}

export function isWindow(obj) {
  return obj != null && obj === obj.window;
}

// 检测是否为数据或者类数组
export function isArrayLike(obj) {
  let length = !!obj && 'length' in obj && obj.length,
    type = toType(obj);
  if (isFunction(obj) || isWindow(obj)) return false;
  return (
    type === 'array' ||
    length === 0 ||
    (typeof length === 'number' && length > 0 && length - 1 in obj)
  );
}

// 遍历数组/类数组/对象
export function each(obj, callback) {
  callback = callback || Function.prototype;
  if (isArrayLike(obj)) {
    for (let i = 0; i < obj.length; i++) {
      let item = obj[i],
        result = callback.call(item, item, i);
      if (result === false) break;
    }
    return obj;
  }
  for (let key in obj) {
    if (!hasOwn.call(obj, key)) break;
    let item = obj[key],
      result = callback.call(item, item, key);
    if (result === false) break;
  }
  return obj;
}

/*
 * 几种情况的分析
 *   A->options中的key值  B->params中的key值
 *   1.A&B都是原始值类型:B替换A即可
 *   2.A是对象&B是原始值:抛出异常信息
 *   3.A是原始值&B是对象:B替换A即可
 *   4.A&B都是对象:依次遍历B中的每一项,替换A中的内容
 */
// params替换options
function isObj(value) {
  // 是否为普通对象
  return toType(value) === 'object';
}

export function merge(options, params = {}) {
  each(params, (_, key) => {
    let isA = isObj(options[key]),
      isB = isObj(params[key]);
    if (isA && !isB) throw new TypeError(`${key} in params must be object`);
    if (isA && isB) {
      options[key] = merge(options[key], params[key]);
      return;
    }
    options[key] = params[key];
  });
  return options;
}

// 浅克隆
export function shallowClone(obj) {
  let type = toType(obj),
    Ctor = obj.constructor;

  // 对于Symbol/BigInt
  if (/^(symbol|bigint)$/i.test(type)) return Object(obj);

  // 对于正则/日期的处理
  if (/^(regexp|date)$/i.test(type)) return new Ctor(obj);

  // 对于错误对象的处理
  if (/^error$/i.test(type)) return new Ctor(obj.message);

  // 对于函数
  if (/^function$/i.test(type)) {
    // 返回新函数：新函数执行还是把原始函数执行，实现和原始函数相同的效果
    return function () {
      return obj.call(this, ...arguments);
    };
  }

  // 数组或者对象
  if (/^(object|array)$/i.test(type)) {
    let keys = [...Object.keys(obj), ...Object.getOwnPropertySymbols(obj)],
      result = new Ctor();
    each(keys, (key) => {
      result[key] = obj[key];
    });
    return result;
  }

  return obj;
}

// 深克隆：只要有下一级的，我们就克隆一下（浅克隆）
export function deepClone(obj, cache = new Set()) {
  let type = toType(obj),
    Ctor = obj.constructor;
  if (!/^(object|array)$/i.test(type)) return shallowClone(obj);

  // 避免无限套娃
  if (cache.has(obj)) return obj;
  cache.add(obj);

  let keys = [...Object.keys(obj), ...Object.getOwnPropertySymbols(obj)],
    result = new Ctor();
  each(keys, (key) => {
    // 再次调用deepClone的时候把catch传递进去，保证每一次递归都是一个cache
    result[key] = deepClone(obj[key], cache);
  });
  return result;
}

// 格式化时间戳
export function formatTime(timestamp) {
  if (!timestamp) return;

  // const date = new Date(timestamp * 1000) // 时间戳为10位需*1000，时间戳为13位的话不需乘1000
  const date =
    timestamp.toString().length > 10
      ? new Date(Number(timestamp))
      : new Date(timestamp * 1000);

  const Y = date.getFullYear() + '-';
  const M =
    (date.getMonth() + 1 < 10
      ? '0' + (date.getMonth() + 1)
      : date.getMonth() + 1) + '-';
  const D = (date.getDate() < 10 ? '0' + date.getDate() : date.getDate()) + ' ';
  const h =
    (date.getHours() < 10 ? '0' + date.getHours() : date.getHours()) + ':';
  const m =
    (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes()) +
    ':';
  const s =
    date.getSeconds() < 10 ? '0' + date.getSeconds() : date.getSeconds();
  return Y + M + D + h + m + s;
}

export function inherit(parentVal, childVal) {
  const res = Object.create(parentVal); // res.__proto__ = parentVal
  if (childVal) {
    for (const key in childVal) {
      res[key] = childVal[key];
    }
  }
  return res;
}

export function isOwnProperty(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

/**
 * 节流（下拉滚动）
 * @param {*} fn
 * @param {*} wait
 */
export function throttle(fn, wait = 2000) {
  let timer = null;
  console.log(111);
  return function (...args) {
    const context = this;
    if (!timer) {
      timer = setTimeout(() => {
        fn.apply(context, args);
        timer = null;
      }, wait);
    }
  };
}
/**
 * 防抖（重复提交）
 * @param {*} func 执行回调
 * @param {*} wait wait之后执行，wait之内点击，从开始值计算
 * @param {*} immediate  true or false 立即执行一次
 * @param {*} tips  true or false 是否显示提示弹框
 */
export function debounce(func, wait = 2000, immediate = true, tips = false) {
  let timeout;
  return function (...args) {
    const context = this;

    if (timeout) {
      clearTimeout(timeout);
    }
    if (immediate) {
      const callNow = !timeout;
      timeout = setTimeout(() => {
        timeout = null;
      }, wait);
      if (callNow) func.apply(context, args);
    } else {
      timeout = setTimeout(function () {
        func.apply(context, args);
      }, wait);
    }
  };
}

/**
 * @param obj The object to inspect.
 * @returns 返回true or false 判断是否纯对象.
 */
export function isPlainObject(obj) {
  if (typeof obj !== 'object' || obj === null) return false;

  let proto = obj;
  while (Object.getPrototypeOf(proto) !== null) {
    proto = Object.getPrototypeOf(proto);
  }

  return Object.getPrototypeOf(obj) === proto;
}

/**
 * 获取对象的指定属性的值（或属性路径）
 *
 * @param {object} object - 对象
 * @param {string} path - 属性值，可以是路径，如：'a.b.c[0].d'
 * @param {any} [defaultVal=''] - 获取不到值时返回的默认值，可不传
 * @returns {any} 指定属性的值
 * @example
 * const obj = {a: {b: {c: [{d: 123}]}}};
 * console.log(getPathValue(obj, 'a.b.c[0].d'));
 */
export const getPathValue = (object, path, defaultVal = '') => {
  let ret = defaultVal;
  console.log('retretret', ret);
  if (
    object === null ||
    typeof object !== 'object' ||
    typeof path !== 'string'
  ) {
    return ret;
  }
  path = path.split(/[\.\[\]]/).filter((n) => n != '');
  let index = -1;
  const len = path.length;
  let key;
  let result = true;
  while (++index < len) {
    key = path[index];
    if (
      !Object.prototype.hasOwnProperty.call(object, key) ||
      object[key] == null
    ) {
      result = false;
      break;
    }
    object = object[key];
  }
  if (result) {
    ret = object;
  }
  return ret;
};
