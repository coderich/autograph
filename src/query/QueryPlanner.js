const _ = require('lodash');
const { map, keyPaths, ensureArray, isPlainObject } = require('../service/app.service');

module.exports = class QueryPlanner {
  constructor(resolver, query) {
    this.query = query;
    this.model = query.model();
    this.method = query.method();
    this.resolver = resolver;
  }

  resolveWhereClause(where = {}) {
    // This is needed for where clause (but why!?!)
    if (where.id) where.id = map(where.id, v => this.model.idValue(v));

    const resolveEmbeddedWhere = (ref, key, value) => {
      const resolved = ensureArray(map(value, (obj) => {
        return Object.entries(obj).reduce((p, [k, v]) => {
          const f = ref.getFieldByName(k);

          if (k === 'id') return Object.assign(p, { [k]: ref.idValue(v) });
          if (f.isScalar()) return Object.assign(p, { [k]: v });
          if (f.isEmbedded()) return Object.assign(p, { [k]: resolveEmbeddedWhere(f.getModelRef(), k, v) });
          return Object.assign(p, { [k]: v });
        }, {});
      }));

      return resolved.length > 1 ? resolved : resolved[0];
    };

    // Construct
    const $where = Object.entries(where).reduce((prev, [key, value]) => {
      const field = this.model.getField(key);
      const modelRef = field.getModelRef();

      if (field.isVirtual()) {
        const virtualRef = field.getVirtualRef();
        const ids = Promise.all(ensureArray(value).map(v => this.resolver.match(modelRef).where(isPlainObject(v) ? v : { id: v }).data().then(docs => docs.map(doc => doc[virtualRef])))).then(results => _.uniq(_.flattenDeep(results)));
        return Object.assign(prev, { id: ids });
      }

      if (modelRef && !field.isEmbedded()) {
        const ids = Promise.all(ensureArray(value).map(v => (isPlainObject(v) ? this.resolver.match(modelRef).where(v).data().then(docs => docs.map(doc => doc.id)) : Promise.resolve(v)))).then(results => _.uniq(_.flattenDeep(results)));
        return Object.assign(prev, { [key]: ids });
      }

      // You do not have a unit-test that tests this (BUT ITS NEEDED)
      if (field.isEmbedded()) {
        return Object.assign(prev, { [key]: resolveEmbeddedWhere(modelRef, key, value) });
      }

      return Object.assign(prev, { [key]: value });
    }, {});

    // Resolve
    return Promise.all(keyPaths($where).map(async (path) => {
      const $value = await _.get($where, path);
      return { path, $value };
    })).then((results) => {
      return results.reduce((prev, { path, $value }) => {
        if (Array.isArray($value) && $value.length === 1) [$value] = $value;
        return _.set(prev, path, $value);
      }, {});
    });
  }

  async getPlan() {
    const fields = this.model.getSelectFields();
    const fieldNameToKeyMap = fields.reduce((prev, field) => Object.assign(prev, { [field.getName()]: field.getKey() }), {});
    const normalize = data => Object.entries(data).reduce((prev, [name, value]) => Object.assign(prev, { [fieldNameToKeyMap[name]]: value }), {});
    const $where = await this.resolveWhereClause(this.query.match());

    return {
      key: this.model.getKey(),
      method: this.query.method(),
      isNative: Boolean(this.query.native()),
      schema: fields.reduce((prev, field) => Object.assign(prev, { [field.getKey()]: field.getType() }), {}),
      select: this.query.select() ? this.query.select().map(n => fieldNameToKeyMap[n]) : fields.map(f => f.getKey()),
      where: normalize($where),
      data: this.query.data() ? normalize(this.query.data()) : {},
    };
  }

  getCacheKey() {
    return this.query.getCacheKey();
  }
};
