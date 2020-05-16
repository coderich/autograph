const DataResolver = require('./DataResolver');
const { map, lcFirst, ensureArray, toGUID } = require('../service/app.service');

module.exports = class {
  constructor(model, promise) {
    this.model = model;
    this.promise = promise;
  }

  resolve(resolver, doc, prop) {
    const field = this.model.getField(prop);
    const value = doc[prop];

    // Scalars resolver
    if (!field) return value;
    if (field.isScalar() || field.isEmbedded()) return value;

    // Model resolver
    const fieldModel = field.getModelRef();

    if (field.isArray()) {
      if (field.isVirtual()) {
        const where = { [field.getVirtualField().getAlias()]: doc.id };
        return resolver.match(fieldModel).query({ where }).many({ find: true });
      }

      return Promise.all(ensureArray(value).map(id => resolver.match(fieldModel).id(id).one({ required: field.isRequired() })));
    }

    if (field.isVirtual()) {
      const where = { [field.getVirtualField().getAlias()]: doc.id };
      return resolver.match(fieldModel).query({ where }).one({ find: true });
    }

    return resolver.match(fieldModel).id(value).one({ required: field.isRequired() });
  }

  async hydrate(resolver, query, path = '') {
    const results = await this.getResults();
    if (results == null) return results;

    return map(results, (doc) => {
      Object.keys(doc).forEach((key) => {
        const $key = `hydrated${key}`;

        if (!Object.prototype.hasOwnProperty.call(doc, $key)) {
          Object.defineProperty(doc, $key, {
            value: Promise.resolve(this.resolve(resolver, doc, key)),
          });
        }
      });

      return doc;
    });

    // await Promise.all(ensureArray(results).map((doc) => {
    //   return Promise.all(Object.keys(doc).map((prev, prop) => {
    //     const value = this.resolve(resolver, doc, prop);
    //     if (typeof value === 'object' && typeof value.then === 'function') doc[prop] = value.then(r => r.hydrate(resolver, query));
    //     else doc[prop] = value;
    //     return doc[prop];
    //   }));
    // }));

    // return results;

    // const { fields = {} } = query.getSelectFields();
    // let results = await this.getResults();
    // const isArray = Array.isArray(results);
    // const fieldNames = this.model.getFieldNames();
    // const fieldEntries = Object.entries(fields).filter(([k]) => fieldNames.indexOf(k) > -1);
    // const countEntries = Object.entries(fields).filter(([k]) => fieldNames.indexOf(lcFirst(k.substr(5))) > -1); // eg. countAuthored

    // results = isArray ? results : [results];

    // const data = await Promise.all(results.map(async (doc) => {
    //   if (doc == null) return doc;

    //   // Resolve all values
    //   const [fieldValues, countValues] = await Promise.all([
    //     Promise.all(fieldEntries.map(async ([field, subFields]) => {
    //       const [arg = {}] = (fields[field].__arguments || []).filter(el => el.query).map(el => el.query.value); // eslint-disable-line
    //       const ref = this.getField(field).getModelRef();
    //       const resolved = await this.getField(field).resolve(resolver, doc, { ...query, ...arg });
    //       if (Object.keys(subFields).length && ref) return ref.hydrate(resolver, resolved, { ...query, ...arg, fields: subFields });
    //       return resolved;
    //     })),
    //     Promise.all(countEntries.map(async ([field, subFields]) => {
    //       const [arg = {}] = (fields[field].__arguments || []).filter(el => el.where).map(el => el.where.value); // eslint-disable-line
    //       return this.getField(lcFirst(field.substr(5))).count(resolver, doc, arg);
    //     })),
    //   ]);

    //   return fieldEntries.reduce((prev, [field], i) => {
    //     const $key = `$${field}`;
    //     const $value = fieldValues[i];
    //     if (!Object.prototype.hasOwnProperty.call(prev, $key)) Object.defineProperty(prev, $key, { value: $value });
    //     return prev;
    //   }, countEntries.reduce((prev, [field], i) => {
    //     return Object.assign(prev, { [field]: countValues[i] });
    //   }, doc));
    // }));

    // return isArray ? data : data[0];
  }

  getResults(resolver, useDR = false) {
    return this.promise.then((docs) => {
      return map(docs, (doc, i) => {
        const id = doc[this.model.idField()];
        const guid = toGUID(this.model.getName(), id);
        // const cursor = toGUID(i, guid);

        const tDoc = this.model.transform(doc);

        const drDoc = new DataResolver(tDoc, (data, prop) => {
          return this.resolve(resolver, data, prop);
        });

        return Object.defineProperties(useDR ? drDoc : tDoc, {
          id: { value: id },
          $id: { value: guid },
          // $$cursor: { value: cursor },
        });
      });
    });
  }
};
