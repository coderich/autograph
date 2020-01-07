exports.Array = model => Array.of(model);
exports.Set = model => Object.defineProperty(Array.of(model), 'isSet', { value: true });
