const { get } = require('lodash');
const { promiseChain, keyPaths, unravelObject } = require('../service/app.service');

const getPathInfo = (model, where, path) => {
  const segments = path.split('.');
  const [segModel, segField] = segments.slice(-2);
  const currentModel = segments.slice(0, -1).reduce((m, f) => m.getField(f).getModelRef(), model);
  const currentField = currentModel.getField(segField);
  const parentModel = segments.slice(0, -2).reduce((m, f) => m.getField(f).getModelRef(), model);
  const parentField = parentModel.getField(segModel);

  const lookupModel = currentField.isVirtual() ? currentField.getModelRef() : currentModel;
  const lookupField = currentField.isVirtual() ? lookupModel.getField('id') : currentField;
  const lookupValue = get(where, path);

  const offset = currentField.isVirtual() ? -1 : -2;
  const prop = parentField.isVirtual() ? parentField.getVirtualField() : 'id';
  const key = segments.slice(0, offset).join('.') || 'id';

  return {
    segments,
    segModel,
    segField,
    currentModel,
    currentField,
    parentModel,
    parentField,
    lookupModel,
    lookupField,
    lookupValue,
    offset,
    prop,
    key,
  };
};

module.exports = class Where {
  constructor(resolver, model, where = {}) {
    this.resolver = resolver;
    this.model = model;
    this.where = where;
  }

  // where({ authored: mobyDick.id })
  resolve(where = this.where) {
    const { model, resolver } = this;
    const wherePaths = keyPaths(where);
    if (!wherePaths.length) return where;

    // Remove redundant paths
    const uniqPaths = wherePaths.filter((path, i, arr) => arr.some((el, j) => Boolean(i === j || el.indexOf(path) !== 0)));
    const maxDepth = Math.max(...uniqPaths.map(path => path.split('.').length));

    // If we're flat we're done
    if (maxDepth === 1) {
      // return uniqPaths.reduce((prev, path) => {
      //   const { lookupField, lookupValue } = getPathInfo(model, where, `${model}.${path}`);
      //   return Object.assign(prev, { [lookupField.getKey()]: lookupValue });
      // }, {});
      return Object.entries(where).reduce((prev, [key, value]) => {
        const field = model.getField(key);
        const fieldKey = field ? field.getKey() : key;
        return Object.assign(prev, { [fieldKey]: value });
      }, {});
    }

    return promiseChain(Array.from(Array(maxDepth)).map((e, i) => {
      return () => {
        const depth = maxDepth - i;
        const depthPaths = uniqPaths.filter(path => path.split('.').length === depth);
        if (!depthPaths.length) return Promise.resolve({});

        return Promise.all(depthPaths.map((path) => {
          const { lookupModel, lookupField, lookupValue, prop, key } = getPathInfo(model, where, path);

          // console.log(`${path}: Looking up ${lookupModel}.${lookupField} === ${lookupValue}`);

          return resolver.match(lookupModel).where({ [lookupField.getKey()]: lookupValue }).many().then((results) => {
            const value = results.map(r => r[prop]);
            return this.resolve(unravelObject({ [key]: value }));
          });
        })).then((results) => {
          // console.log('intermediate results', JSON.stringify(results));
          return results.pop();
        });
      };
    })).then((results) => {
      return results.reduce((prev, result) => {
        return Object.assign(prev, result);
      }, {});
    });
  }
};


// exports.resolveModelWhereClause = (resolver, model, where = {}) => {
//   const wherePaths = keyPaths(where);
//   if (!wherePaths.length) return where;

//   // Remove redundant paths; sort by depth
//   const uniqPaths = wherePaths.filter((path, i, arr) => arr.some((el, j) => Boolean(i === j || el.indexOf(path) !== 0))).sort((a, b) => a.length - b.length);
//   const maxDepth = Math.max(...uniqPaths.map(path => path.split('.').length));

//   // If we're flat we're done
//   if (maxDepth === 1) {
//     return Object.entries(where).reduce((prev, [key, value]) => {
//       const field = model.getField(key);
//       const fieldKey = field ? field.getKey() : key;
//       return Object.assign(prev, { [fieldKey]: value });
//     }, {});
//   }

//   return promiseChain(uniqPaths.map((path) => {
//     return () => {
//       const segments = path.split('.');
//       const [segModel, segField] = segments.slice(-2);
//       const lookupValue = _.get(where, path);
//       const currentModel = segments.slice(0, -1).reduce((m, f) => m.getField(f).getModelRef(), model);
//       const currentField = currentModel.getField(segField);
//       const parentModel = segments.slice(0, -2).reduce((m, f) => m.getField(f).getModelRef(), model);
//       const parentField = parentModel.getField(segModel);

//       const lookupModel = currentField.isVirtual() ? currentField.getModelRef() : currentModel;
//       const lookupField = currentField.isVirtual() ? lookupModel.getField('id') : currentField;

//       console.log(`${path}: Looking up ${lookupModel}.${lookupField} === ${lookupValue}`);
//       console.log(`currentField ${currentField}`);

//       return resolver.match(lookupModel).where({ [lookupField.getKey()]: lookupValue }).many().then((results) => {
//         const offset = currentField.isVirtual() ? -1 : -2;
//         const prop = parentField.isVirtual() ? parentField.getVirtualField() : 'id';
//         const key = segments.slice(0, offset).join('.') || 'id';
//         const value = results.map(r => r[prop]);
//         return exports.resolveModelWhereClause(resolver, model, unravelObject({ [key]: value }));
//       });
//     };
//   })).then((results) => {
//     return results.pop();
//   });
// };
