class A {
  static factory(name) {
    Object.defineProperty(A, 'casual', { value: name });
  }
}

class B extends A {
}

class C extends A {

}

// B.factory('rich');
// console.log(A.__proto__);
// console.log(Object.getOwnPropertyNames(A));
// const obj = Object.create(null);
// console.log(obj.__proto__);
// console.log(Object.getOwnPropertyNames({}));
// console.log(B.casual, B.casual);
// console.log(C.casual, C.casual);
