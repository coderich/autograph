const DataResolver = require('./DataResolver');
const { map, lcFirst, ensureArray, toGUID } = require('../service/app.service');

const handlePromise = (doc, prop, promise) => {
  // const dataResolver = new DataResolver(promise);
  doc[prop] = promise;
  return promise;
};

module.exports = class {
  constructor(model, promise) {
    this.model = model;
    this.promise = promise;
  }

  async hydrate(resolver, query) {
    return this.getResults(resolver, query);
    // return this.model.hydrate(resolver, await this.getResults(), { fields: query.getSelectFields() });
  }

  getResults(resolver, query) {
    return this.promise.then((docs) => {
      return map(docs, (doc, i) => {
        const id = doc[this.model.idField()];
        const guid = toGUID(this.model.getName(), id);
        const tdoc = this.model.transform(doc);
        const dataResolver = new DataResolver(tdoc, (data, prop) => this.resolve(data, prop, resolver, query));

        return Object.defineProperties(dataResolver, {
          id: { value: id, enumerable: true, writable: true },
          $id: { value: guid },
        });
      });
    });
  }

  resolve(doc, prop, resolver, query) {
    // Value check
    const value = doc[prop];
    if (value !== undefined) return value; // Already resolved
    if (typeof prop === 'symbol') return value;

    // // Count resolver
    // const countField = this.getCountField(prop);
    // if (countField) {
    //   return countField.count(resolver, doc).then((v) => {
    //     console.log(prop, v);
    //     doc[prop] = v;
    //     return v;
    //   });
    // }

    // Hydration check
    const [, $prop] = prop.split('$');
    if (!$prop) return value; // Nothing to hydrate

    // Field check
    const field = this.model.getField($prop);
    if (!field) return value; // Unknown field

    // Set $value to the original unhydrated value
    const $value = doc[$prop];
    if (field.isScalar() || field.isEmbedded()) return handlePromise(doc, prop, $value); // No hydration needed; apply $value

    // Model resolver
    const fieldModel = field.getModelRef();

    if (field.isArray()) {
      if (field.isVirtual()) {
        query.where[field.getVirtualField().getAlias()] = doc.id;
        return handlePromise(doc, prop, resolver.match(fieldModel).query({ ...query }).many({ find: true }));
      }

      return handlePromise(doc, prop, Promise.all(ensureArray(value).map(id => resolver.match(fieldModel).id(id).one({ required: field.isRequired() }))));
    }

    if (field.isVirtual()) {
      query.where[field.getVirtualField().getAlias()] = doc.id;
      return handlePromise(doc, prop, resolver.match(fieldModel).query({ ...query }).one({ find: true }));
    }

    return handlePromise(doc, prop, resolver.match(fieldModel).id(value).one({ required: field.isRequired() }));
  }

  getCountField(prop) {
    const [, countProp] = prop.split('count').map(v => lcFirst(v));
    return this.model.getField(countProp);
  }

  // async hydrate(resolver, query) {
  //   const results = await this.getResults();
  //   if (results == null) return results;

  //   const isArray = Array.isArray(results);

  //   const data = await Promise.all(ensureArray(results).map((doc) => {
  //     if (doc == null) return doc;
  //     if (Object.prototype.hasOwnProperty.call(doc, '$hydrated')) return doc;

  //     // const id = doc[this.model.idField()];
  //     // const guid = toGUID(this.model.getName(), id);
  //     // Object.defineProperty(doc, 'id', { value: id });
  //     // Object.defineProperty(doc, '$id', { value: guid });
  //     Object.defineProperty(doc, '$hydrated', { value: true });

  //     return Promise.all(Object.keys(doc).map((key) => {
  //       return this.resolve(resolver, doc, key, { fields: query.getSelectFields() });
  //     })).then(($values) => {
  //       $values.forEach(($value, i) => {
  //         const key = Object.keys(doc)[i];
  //         const $key = this.getCountField(key) ? key : `$${key}`;
  //         if (!Object.prototype.hasOwnProperty.call(doc, $key)) Object.defineProperty(doc, $key, { value: $value });
  //       });

  //       return this.model.transform(doc);
  //     });
  //   }));

  //   return isArray ? data : data[0];
  // }
};
