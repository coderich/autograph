const Type = require('./Type');
const Field = require('./Field');

module.exports = class Model extends Type {
  constructor(schema, type) {
    super(schema, type);
    this.fields = Object.values(type.getFields()).map(fieldType => new Field(schema, this, fieldType));
  }

  getFields() {
    return this.fields;
  }

  getFieldNames() {
    return this.fields.map(field => field.getName());
  }

  getFieldMap() {
    return this.fields.reduce((prev, field) => Object.assign(prev, { [field.getName()]: field }), {});
  }

  getField(path = '') {
    const [name, ...rest] = path.split('.');
    const field = this.fields.find(f => f.getName() === name);
    if (field == null) return field;

    if (rest.length) {
      const modelRef = field.getModelRef();
      if (modelRef) return modelRef.getField(rest.join('.'));
      return null;
    }

    return field;
  }

  getScalarFields() {
    return this.fields.filter(field => field.isScalar());
  }

  getArrayFields() {
    return this.fields.filter(field => field.isArray());
  }

  getDataRefFields() {
    return this.fields.filter(field => Boolean(field.getDataRef()));
  }

  // getDataRefFields() {
  //   return this.fields.filter(field => Boolean(field.getDataRef() && !field.isEmbedded()));
  // }

  getOnDeleteFields() {
    return this.fields.filter(field => Boolean(field.getDataRef()) && Boolean(field.getOnDelete()));
  }

  getEmbeddedArrayFields() {
    return this.fields.filter(field => field.isArray() && !field.isVirtual());
  }

  getCountableFields() {
    return this.fields.filter(field => field.isArray() && field.getDataRef());
  }

  getSelectFields() {
    return this.fields.filter(field => field.getName() !== 'id');
  }

  getCreateFields() {
    return this.fields.filter(field => !field.isVirtual() && !field.isPrivate());
  }

  getUpdateFields() {
    return this.fields.filter(field => !field.isVirtual() && !field.isImmutable() && !field.isPrivate());
  }
};
