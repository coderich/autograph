exports.getProjectFields = (parentShape, currentShape = { _id: 0, id: '$_id' }, isEmbedded, isEmbeddedArray, path = []) => {
  return parentShape.reduce((project, value) => {
    const { from, to, shape: subShape, isArray } = value;
    const $key = isEmbedded && isEmbeddedArray ? `$$embedded.${from}` : `$${path.concat(from).join('.')}`;

    if (subShape) {
      const $project = exports.getProjectFields(subShape, {}, true, isArray, path.concat(from));
      Object.assign(project, { [to]: isArray ? { $map: { input: $key, as: 'embedded', in: $project } } : $project });
    } else if (isEmbedded) {
      Object.assign(project, { [to]: $key });
    } else {
      Object.assign(project, { [to]: from === to ? 1 : $key });
    }

    return project;
  }, currentShape);
};

exports.shapeObject = (shape, obj) => {
  return exports.map(obj, (doc) => {
    return shape.reduce((prev, { from, to, type, isArray, defaultValue, transformers: [], shape: subShape }) => {
      let value = doc[from];
      if (value === undefined) value = defaultValue; // Default value
      if (value == null) return prev; // Nothing to do
      if (isArray && !Array.isArray(value)) value = [value]; // Ensure Array
      if (!subShape) value = exports.map(value, v => exports.castCmp(type, v)); // Cast
      value = transformers.reduce((prev, t) => t(null, prev), value); // Transformers
      prev[to] = subShape ? exports.shapeObject(subShape, value) : value; // Rename key & assign value
      return prev;
    }, {});
  });
};

exports.map = (mixed, fn) => {
  if (mixed == null) return mixed;
  const isArray = Array.isArray(mixed);
  const arr = isArray ? mixed : [mixed];
  const results = arr.map((...args) => fn(...args));
  return isArray ? results : results[0];
};

exports.castCmp = (type, value) => {
  switch (type) {
    case 'String': {
      return `${value}`;
    }
    case 'Float': case 'Number': {
      const num = Number(value);
      if (!Number.isNaN(num)) return num;
      return value;
    }
    case 'Int': {
      const num = Number(value);
      if (!Number.isNaN(num)) return parseInt(value, 10);
      return value;
    }
    case 'Boolean': {
      if (value === 'true') return true;
      if (value === 'false') return false;
      return value;
    }
    default: {
      return value;
    }
  }
};
