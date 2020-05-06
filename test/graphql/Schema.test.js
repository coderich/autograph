const { parse } = require('graphql');
const { importSchema } = require('graphql-import');
const Document = require('../../src/graphql/type/Document');
// const { getSchemaData } = require('../../src/service/schema.service');

describe('Documents', () => {
  test('bareSchema', () => {
    const typeDefs = importSchema(`${__dirname}/../bare.graphql`);
    const ast = parse(typeDefs);
    const doc = new Document(ast);
    expect(doc).toBeDefined();

    // Models
    const models = doc.getModels();
    expect(models.length).toBe(2);
    expect(models.map(m => m.getName())).toEqual(['Person', 'Book']);

    // Fields
    const [personFields, bookFields] = models.map(m => m.getFields());
    expect(personFields.length).toBe(4);
    expect(bookFields.length).toBe(5);
    expect(personFields.map(f => f.getName())).toEqual(['name', 'authored', 'emailAddress', 'status']);
    expect(personFields.map(f => f.getType())).toEqual(['String', 'Book', 'String', 'Mixed']);
    expect(personFields.map(f => f.isArray())).toEqual([false, true, false, false]);
    expect(personFields.map(f => f.isScalar())).toEqual([true, false, true, true]);
    expect(bookFields.map(f => f.getName())).toEqual(['name', 'price', 'author', 'bestSeller', 'bids']);
    expect(bookFields.map(f => f.getType())).toEqual(['String', 'Float', 'Person', 'Boolean', 'Float']);
    expect(bookFields.map(f => f.isArray())).toEqual([false, false, false, false, true]);
  });

  // test('idk', () => {
  //   const typeDefs = importSchema(`${__dirname}/../bare.graphql`);
  //   const schema = new Schema({ typeDefs });
  //   // const xschema = schema.getExecutableSchema();
  //   const doc = parse(typeDefs);

  //   console.log(doc);

  //   visit(doc, {
  //     enter: {
  //       ObjectTypeDefinition(node, key, parent, path, ancestors) {

  //       },
  //       FieldDefinition(node, key, parent, path, ancestors) {
  //         console.log(ancestors);
  //       },
  //     },
  //   });
  //   // Object.values(getSchemaData(xschema).models).map(value => console.log(value.astNode));
  // });
});
