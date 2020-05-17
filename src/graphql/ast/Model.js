const Node = require('./Node');
const Field = require('./Field');

module.exports = class Model extends Node {
  constructor(schema, ast) {
    super(ast);
    this.schema = schema;
    this.fields = this.ast.fields.map(f => new Field(this, f));
  }

  getSchema() {
    return this.schema;
  }

  getFields() {
    return this.fields;
  }

  getField(path = '') {
    const [name, ...rest] = path.split('.');
    let field = this.getFields().find(f => f.getName() === name);
    if (!field) field = this.getFields().find(f => f.getAlias() === name);
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

  getRequiredFields() {
    return this.getFields().filter(field => field.isRequired());
  }

  getDefaultedFields() {
    return this.getFields().filter(field => field.isDefaulted());
  }

  getDataRefFields() {
    return this.getFields().filter(field => Boolean(field.getDataRef()));
  }

  // getDataRefFields() {
  //   return this.fields.filter(field => Boolean(field.getDataRef() && !field.isEmbedded()));
  // }

  getEmbeddedFields() {
    return this.getFields().filter(field => field.isEmbedded());
  }

  getOnDeleteFields() {
    return this.getFields().filter(field => Boolean(field.getDataRef()) && Boolean(field.getOnDelete()));
  }

  getSelectFields() {
    return this.getFields().filter(field => field.isReadable() && field.getName() !== 'id');
  }

  getCountableFields() {
    return this.getSelectFields().filter(field => field.isArray() && field.getDataRef());
  }

  getCreateFields() {
    return this.getFields().filter(field => field.isWritable() && !field.isVirtual() && !field.isSegmented() && field.getName() !== 'id');
  }

  getUpdateFields() {
    return this.getCreateFields().filter(field => !field.isImmutable());
  }
};
