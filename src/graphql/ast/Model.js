const Node = require('./Node');
const Field = require('./Field');

module.exports = class Model extends Node {
  constructor(schema, ast) {
    super(ast);
    this.nodeType = 'model';
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
    if (!field) field = this.getFieldByKey(name);
    if (field == null) return field;

    if (rest.length) {
      const modelRef = field.getModelRef();
      return modelRef ? modelRef.getField(rest.join('.')) : null;
    }

    return field;
  }

  getFieldByName(name) {
    return this.getFields().find(f => f.getName() === name);
  }

  getFieldByKey(key) {
    return this.getFields().find(f => f.getKey() === key);
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

  getBoundValueFields() {
    return this.getFields().filter(field => field.hasBoundValue());
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
    return this.getFields().filter(field => field.isReadable());
  }

  getWhereFields() {
    return this.getSelectFields();
  }

  getSortFields() {
    return this.getSelectFields();
  }

  getCountableFields() {
    return this.getSelectFields().filter(field => field.isArray() && field.getDataRef());
  }

  getCreateFields() {
    return this.getFields().filter(field => field.isCreatable() && !field.isVirtual() && field.getName() !== 'id');
  }

  getUpdateFields() {
    return this.getCreateFields().filter(field => !field.isImmutable());
  }

  // Misc
  getIndexes() {
    return this.getDirectives('index').map((d) => {
      return Object.entries(d.getArgs()).reduce((prev, [key, value]) => {
        if (key === 'on') {
          // Convert "on" field to key
          value = value.map((el) => {
            const field = this.getField(el);
            if (!field) throw new Error(`Cannot create index on ${this}; Unknown fieldName '${el}'`);
            return field.getKey();
          });
        }

        return Object.assign(prev, { [key]: value });
      }, {});
    });
  }
};
