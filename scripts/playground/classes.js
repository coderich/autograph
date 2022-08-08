class A {
  static create(name) {
    Object.defineProperty(A, 'casual', { value: name, enumerable: true });
  }
}

class B extends A {
}

class C extends A {

}

B.create('rich');
console.log(Object.keys(A));
console.log(Object.keys(B));
console.log(Object.keys(C));
// console.log(Object.getOwnPropertyNames(A));
// const obj = Object.create(null);
// console.log(obj.__proto__);
// console.log(Object.getOwnPropertyNames({}));
// console.log(B.casual, B.casual);
// console.log(C.casual, C.casual);
