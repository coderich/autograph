const { get } = require('lodash');
const DataService = require('./DataService');
const { map, ensureArray, keyPaths, mapPromise, toGUID, hashObject } = require('../service/app.service');

const modelCache = new WeakMap();

module.exports = class ResultSet {
  constructor(query, data, adjustForPagination = true) {
    if (data == null) return data;

    const { resolver, model, sort, first, after, last, before } = query.toObject();

    ResultSet.ensureModelCache(model);

    const { template, fieldDefs } = modelCache.get(model);

    const rs = map(data, (doc) => {
      if (doc == null || typeof doc !== 'object') return doc;

      const instance = Object.create(template, {
        $$services: {
          value: {
            cache: new Map(),
            data: doc,
            resolver,
            query,
            sort,
          },
          enumerable: false,
        },
      });

      return new Proxy(instance, {
        ownKeys(target) {
          return Reflect.ownKeys(target).concat('id', fieldDefs.map(d => d.name));
        },
        getOwnPropertyDescriptor(target, prop) {
          return (prop === 'id' || fieldDefs.find(el => el.name === prop)) ? { enumerable: true, configurable: true } : Reflect.getOwnPropertyDescriptor(target, prop);
        },
        getPrototypeOf() {
          return { $$services: instance.$$services };
        },
        deleteProperty(target, prop) {
          const { key = prop } = fieldDefs.find(d => d.name === prop);
          delete instance.$$services.data[key];
        },
      });
    });

    let hasNextPage = false;
    let hasPreviousPage = false;
    if (adjustForPagination && rs.length) (({ hasPreviousPage, hasNextPage } = DataService.paginateResultSet(rs, first, after, last, before)));

    return Object.defineProperties(rs, {
      $$pageInfo: {
        get() {
          const edges = ensureArray(rs);

          return {
            startCursor: get(edges, '0.$$cursor', ''),
            endCursor: get(edges, `${edges.length - 1}.$$cursor`, ''),
            hasPreviousPage,
            hasNextPage,
          };
        },
        enumerable: false,
      },
      $$isResultSet: {
        value: true,
        enumerable: false,
      },
      toObject: {
        get() {
          // return () => map(rs, el => el.toObject());
          return () => map(this, doc => Object.entries(doc).reduce((prev, [key, value]) => {
            if (value === undefined) return prev;
            prev[key] = get(value, '$$isResultSet') ? value.toObject() : value;
            return prev;
          }, {}));
        },
        enumerable: false,
        configurable: true,
      },
    });
  }

  static ensureModelCache(model) {
    if (!modelCache.has(model)) {
      const fields = model.getFields().filter(f => f.getName() !== 'id');

      const fieldDefs = fields.map(field => ({
        field,
        key: field.getKey(),
        name: field.getName(),
        isArray: field.isArray(),
        isScalar: field.isScalar(),
        isVirtual: field.isVirtual(),
        isRequired: field.isRequired(),
        isEmbedded: field.isEmbedded(),
        modelRef: field.getModelRef(),
        virtualField: field.getVirtualField(),
        // deserialize: field.deserialize.bind(field),
        // fieldResolve: field.resolve.bind(field),
      }));

      const template = ResultSet.makeModelTemplate(model, fieldDefs);

      modelCache.set(model, { template, fieldDefs });
    }
  }

  static makeModelTemplate(model, fieldDefs) {
    const definition = fieldDefs.reduce((prev, fieldDef) => {
      const { field, key, name, isArray, isScalar, isVirtual, isRequired, isEmbedded, modelRef, virtualField } = fieldDef;
      const $name = `$${name}`;

      // Deserialized field attributes
      prev[name] = {
        get() {
          if (this.$$services.cache.has(name)) return this.$$services.cache.get(name);
          let $value = field.deserialize(this.$$services.query, this.$$services.data[key]);
          if ($value != null && isEmbedded) {
            $value = new ResultSet(this.$$services.query.model(modelRef), $value, false);
          }
          this.$$services.cache.set(name, $value);
          return $value;
        },
        set($value) {
          this.$$services.cache.set(name, $value);
        },
        enumerable: true,
        configurable: true, // Allows things like delete
      };

      // Fully deserialized, hydrated, and resolved field attributes
      prev[$name] = {
        get() {
          return (args = {}) => {
            // Ensure where clause
            args.where = args.where || {};

            // Cache
            const cacheKey = `${$name}-${hashObject(args)}`;
            if (this.$$services.cache.has(cacheKey)) return this.$$services.cache.get(cacheKey);

            const promise = new Promise((resolve, reject) => {
              (() => {
                const $value = this[name];

                if (isScalar || isEmbedded) return Promise.resolve($value);

                if (isArray) {
                  if (isVirtual) {
                    args.where[[virtualField]] = this.id; // Is where[[virtualField]] correct?
                    return this.$$services.resolver.match(modelRef).merge(args).many();
                  }

                  // Not a "required" query + strip out nulls
                  args.where.id = $value;
                  return this.$$services.resolver.match(modelRef).merge(args).many();
                }

                if (isVirtual) {
                  args.where[[virtualField]] = this.id;
                  return this.$$services.resolver.match(modelRef).merge(args).one();
                }

                return this.$$services.resolver.match(modelRef).id($value).one({ required: isRequired });
              })().then((results) => {
                if (results == null) return field.resolve(this.$$services.query, results); // Allow field to determine
                return mapPromise(results, result => field.resolve(this.$$services.query, result)).then(() => results); // Resolve the inside fields but still return "results"!!!!
              }).then((resolved) => {
                resolve(resolved);
              }).catch((e) => {
                reject(e);
              });
            });

            this.$$services.cache.set(cacheKey, promise);
            return promise;
          };
        },
        enumerable: false,
      };

      // Field count (let's assume it's a Connection Type - meaning dont try with anything else)
      prev[`${$name}:count`] = {
        get() {
          return (q = {}) => {
            q.where = q.where || {};
            if (isVirtual) q.where[virtualField] = this.id;
            else q.where.id = this[name];
            return this.$$services.resolver.match(modelRef).merge(q).count();
          };
        },
        enumerable: false,
      };

      return prev;
    }, {
      id: {
        get() { return this.$$services.data.id || this.$$services.data[model.idKey()]; },
        set(id) { this.$$services.data.id = id; }, // Embedded array of documents need to set id
        enumerable: true,
      },

      $id: {
        get() { return toGUID(model.getName(), this.id); },
        enumerable: false,
      },

      $$cursor: {
        get() {
          const sortPaths = keyPaths(this.$$services.sort);
          const sortValues = sortPaths.reduce((prv, path) => Object.assign(prv, { [path]: get(this, path) }), {});
          const sortJSON = JSON.stringify(sortValues);
          return Buffer.from(sortJSON).toString('base64');
        },
        enumerable: false,
      },

      $$model: {
        value: model,
        enumerable: false,
      },

      $$isResultSetItem: {
        value: true,
        enumerable: false,
      },

      $$save: {
        get() { return input => this.$$services.resolver.match(model).id(this.id).save({ ...this, ...input }); },
        enumerable: false,
      },

      $$remove: {
        get() { return () => this.$$services.resolver.match(model).id(this.id).remove(); },
        enumerable: false,
      },

      $$delete: {
        get() { return () => this.$$services.resolver.match(model).id(this.id).delete(); },
        enumerable: false,
      },

      toObject: {
        get() {
          // return () => map(this.$$services.data, doc => Object.keys(doc).reduce((prev, key) => {
          //   const fieldDef = fieldDefs.find(def => def.key === key);
          //   const value = fieldDef ? this[fieldDef.name] : undefined;
          //   if (value === undefined) return prev;
          //   prev[fieldDef.name] = get(value, '$$isResultSet') ? value.toObject() : value;
          //   return prev;
          // }, {}));
          return () => map(this, obj => Object.entries(obj).reduce((prev, [key, value]) => {
            if (value === undefined) return prev;
            prev[key] = get(value, '$$isResultSet') ? value.toObject() : value;
            return prev;
          }, {}));
        },
        enumerable: false,
        configurable: true,
      },
    });

    // return Object.defineProperties({}, definition);
    return Object.create(null, definition);
  }
};
