module.exports = class Directive {
  constructor(ast) {
    this.ast = ast;
  }

  getName() {
    return this.ast.name.value;
  }

  getArgs() {
    return this.ast.arguments.reduce((prev, { name, value }) => {
      return Object.assign(prev, { [name.value]: Directive.parseValue(value) });
    }, {});
  }

  getArg(arg) {
    return this.getArgs()[arg];
  }

  static parseValue(value) {
    if (value.value !== undefined) return value.value;
    if (value.values !== undefined) return value.values.map(v => Directive.parseValue(v));
    if (value.fields !== undefined) return value.fields.reduce((prev, f) => Object.assign(prev, { [Directive.parseValue(f.name)]: Directive.parseValue(f.value) }), {});
    return value;
  }
};
