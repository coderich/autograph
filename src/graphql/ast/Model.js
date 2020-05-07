const Node = require('./Node');
const Field = require('./Field');

module.exports = class Model extends Node {
  constructor(schema, ast) {
    super(ast);
    this.schema = schema;
    this.fields = this.ast.fields.map(f => new Field(this, f));
  }

  extend(...asts) {
    asts.forEach((ast) => {
      new Model(this.schema, ast).getFields().forEach((newField) => {
        const index = this.fields.findIndex(f => f.getName() === newField.getName());
        if (index > -1) this.fields.splice(index, 1, newField);
        else this.fields.push(newField);
      });
    });
  }

  getSchema() {
    return this.schema;
  }

  getFields() {
    return this.fields;
  }

  getField(path = '') {
    const [name, ...rest] = path.split('.');
    const field = this.getFields().find(f => f.getName() === name);
    if (field == null) return field;

    if (rest.length) {
      const modelRef = field.getModelRef();
      return modelRef ? modelRef.getField(rest.join('.')) : null;
    }

    return field;
  }

  getFieldNames() {
    return this.getFields().map(field => field.getName());
  }

  getFieldMap() {
    return this.getFields().reduce((prev, field) => Object.assign(prev, { [field.getName()]: field }), {});
  }

  getScalarFields() {
    return this.getFields().filter(field => field.isScalar());
  }

  getArrayFields() {
    return this.getFields().filter(field => field.isArray());
  }

  getDataRefFields() {
    return this.getFields().filter(field => Boolean(field.getDataRef()));
  }

  // getDataRefFields() {
  //   return this.fields.filter(field => Boolean(field.getDataRef() && !field.isEmbedded()));
  // }

  getOnDeleteFields() {
    return this.getFields().filter(field => Boolean(field.getDataRef()) && Boolean(field.getOnDelete()));
  }

  getEmbeddedArrayFields() {
    return this.getFields().filter(field => field.isArray() && !field.isVirtual());
  }

  getCountableFields() {
    return this.getFields().filter(field => field.isArray() && field.getDataRef());
  }

  getSelectFields() {
    return this.getFields().filter(field => field.getName() !== 'id');
  }

  getCreateFields() {
    return this.getFields().filter(field => !field.isVirtual() && !field.isPrivate());
  }

  getUpdateFields() {
    return this.getFields().filter(field => !field.isVirtual() && !field.isImmutable() && !field.isPrivate());
  }
};
