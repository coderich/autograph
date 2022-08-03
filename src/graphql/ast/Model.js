const Node = require('./Node');
const Field = require('./Field');
const { uvl } = require('../../service/app.service');

module.exports = class Model extends Node {
  constructor(schema, ast) {
    super(ast, 'model');
    this.schema = schema;
    this.fields = this.ast.fields.map(f => new Field(this, f));
    this.fieldsByName = {};
    this.fieldsByKey = {};
    this.key = uvl(this.getDirectiveArg('model', 'key'), this.getName());
  }

  idKey() {
    return this.getDirectiveArg('model', 'id', '_id');
  }

  getSchema() {
    return this.schema;
  }

  getFields() {
    return this.fields;
  }

  getKey() {
    return this.key;
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
    let field = this.fieldsByName[name];

    if (!field) {
      field = this.getFields().find(f => f.getName() === name);
      this.fieldsByName[name] = field;
    }

    return field;
  }

  getFieldByKey(key) {
    let field = this.fieldsByKey[key];

    if (!field) {
      field = this.getFields().find(f => f.getKey() === key);
      this.fieldsByKey[key] = field;
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
    return this.getFields().filter(field => field.isBasicType());
  }

  getArrayFields() {
    return this.getFields().filter(field => field.isArray());
  }

  getRequiredFields() {
    return this.getFields().filter(field => field.isRequired());
  }

  getDefaultFields() {
    return this.getFields().filter(field => field.getDefaultValue() != null);
  }

  getDefaultedFields() {
    return this.getFields().filter(field => field.isDefaulted());
  }

  getDataRefFields() {
    return this.getFields().filter(field => Boolean(field.getDataRef()));
  }

  getModelRefFields() {
    return this.getFields().filter(field => Boolean(field.getModelRef()));
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

  getCountableFields() {
    return this.getSelectFields().filter(field => field.isArray() && field.getDataRef());
  }

  getPersistableFields() {
    return this.getFields().filter(field => field.isPersistable());
  }

  getSerializeFields() {
    return this.getFields().filter(field => field.getSerializers().length);
  }

  getDeserializeFields() {
    return this.getFields().filter(field => field.getDeserializers().length);
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
