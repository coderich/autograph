const { cloneDeep } = require('lodash');
const DataResolver = require('./DataResolver');
const { map, lcFirst, ensureArray, toGUID, timeout } = require('../service/app.service');

module.exports = class {
  constructor(model, promise) {
    this.model = model;
    this.promise = promise;
  }

  getCountField(prop) {
    const [, countProp] = prop.split('count').map(v => lcFirst(v));
    return this.model.getField(countProp);
  }

  resolve(resolver, doc, prop, query) {
    const value = doc[prop];
    const { fields = {} } = cloneDeep(query);
    query.where = query.where || {};

    // Must be in selection
    if (!Object.prototype.hasOwnProperty.call(fields, prop)) return Promise.resolve(value);

    // Count resolver
    const countField = this.getCountField(prop);
    if (countField) return countField.count(resolver, doc);

    // Field resolver
    const field = this.model.getField(prop);
    if (!field) return Promise.resolve(value);
    if (field.isScalar() || field.isEmbedded()) return Promise.resolve(value);

    // Model resolver
    const [arg = {}] = (fields[field].__arguments || []).filter(el => el.query).map(el => el.query.value); // eslint-disable-line
    const fieldModel = field.getModelRef();

    if (field.isArray()) {
      if (field.isVirtual()) {
        query.where[field.getVirtualField().getAlias()] = doc.id;
        return resolver.match(fieldModel).query(query).many({ find: true });
      }

      return Promise.all(ensureArray(value).map(id => resolver.match(fieldModel).id(id).one({ required: field.isRequired() })));
    }

    if (field.isVirtual()) {
      query.where[field.getVirtualField().getAlias()] = doc.id;
      return resolver.match(fieldModel).query(query).one({ find: true });
    }

    return resolver.match(fieldModel).id(value).one({ required: field.isRequired() });
  }

  async hydrate(resolver, query) {
    const results = await this.promise;
    if (results == null) return results;

    const isArray = Array.isArray(results);

    const data = await Promise.all(ensureArray(results).map((doc) => {
      if (Object.prototype.hasOwnProperty.call(doc, '$hydrated')) return doc;

      const id = doc[this.model.idField()];
      const guid = toGUID(this.model.getName(), id);
      Object.defineProperty(doc, 'id', { value: id });
      Object.defineProperty(doc, '$id', { value: guid });
      Object.defineProperty(doc, '$hydrated', { value: true });

      return Promise.all(Object.keys(doc).map((key) => {
        return this.resolve(resolver, doc, key, { fields: query.getSelectFields() });
      })).then(($values) => {
        $values.forEach(($value, i) => {
          const key = Object.keys(doc)[i];
          const $key = this.getCountField(key) ? key : `$${key}`;
          if (!Object.prototype.hasOwnProperty.call(doc, $key)) Object.defineProperty(doc, $key, { value: $value });
        });

        return doc;
      });
    }));

    return isArray ? data : data[0];

    // const lookups = map(results, async (doc) => {
    //   return Object.entries(doc).reduce((prev, [key, value]) => {
    //     const $key = `$${key}`;

    //     if (!Object.prototype.hasOwnProperty.call(doc, $key)) {
    //       const $value = this.resolve(resolver, doc, key, { fields: query.getSelectFields() });
    //       prev.push({ $key, $value });
    //     }

    //     return prev;
    //   }, []);
    // });

    // const id = doc[this.model.idField()];
    // // const guid = toGUID(this.model.getName(), id);
    // Object.defineProperty(doc, 'id', { value: id });
    // // Object.defineProperty(doc, '$id', { value: guid });

    // // return Promise.all(lookups.map(l => l.$value)).then(($values) => {
    // //   // $values.forEach(($value, i) => {
    // //   //   const { $key } = lookups[i];
    // //   //   Object.defineProperty(doc, $key, { value: $value });
    // //   // });

    // //   return doc;
    // // });
    // // await timeout(50);
    // return doc;

    // return doc;
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
