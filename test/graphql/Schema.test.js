const Schema = require('../../src/graphql/ast/Schema');
const complexSchema = require('../fixtures/complex.graphql');

const typeDefs = `
  scalar Mixed
  enum Gender { male female }
  directive @model(scope: Mixed) on OBJECT
  directive @field(transform: [Mixed] serialize: Mixed onDelete: Mixed, default: Mixed) on FIELD_DEFINITION
  input SomeInput { id: ID! name: String! }
  type Query { noop: String }
  type Mutation { noop: String }
  type Subscription { noop: String }

  extend type Person {
    age: Int
  }

  type Person @model {
    name: String! @field(transform: [toTitleCase, toUpperCase], default: "idk")
    authored: [Book!]
    emailAddress: String!
    status: Mixed
  }

  type Book @model {
    name: String!
    price: Float!
    author: Person!
    bestSeller: Boolean @field(default: false)
    bids: [Float]
  }
`;

const resolvers = {
  Book: {
    name: () => 'The Great Book',
  },
};

const extendDef = `
  type Building @model {
    year: Int
    type: String! @field(serialize: buildingType)
    tenants: [Person] @field(onDelete: cascade)
    landlord: Person @field(onDelete: nullify, default: context)
  }

  extend type Book {
    bids: [String]!
    store: Building
  }

  extend type Person {
    name: String! @field(default: "Rich")
  }

  extend type Query {
    doit: String
  }
`;

describe('Documents', () => {
  test('foundation', () => {
    const schema = new Schema({ typeDefs }).initialize();
    expect(schema).toBeDefined();

    const validate = () => {
      // Models
      const models = schema.getModels();
      expect(models.map(m => m.getName())).toEqual(['Person', 'Book']);

      // Fields
      const [Person, Book] = models;
      const [personFields, bookFields] = models.map(m => m.getFields());
      expect(personFields.map(f => f.getName())).toEqual(['name', 'authored', 'emailAddress', 'status', 'age']);
      expect(personFields.map(f => f.getType())).toEqual(['String', 'Book', 'String', 'Mixed', 'Int']);
      expect(personFields.map(f => f.isArray())).toEqual([false, true, false, false, false]);
      expect(personFields.map(f => f.isScalar())).toEqual([true, false, true, true, true]);
      expect(personFields.map(f => f.isRequired())).toEqual([true, false, true, false, false]);
      expect(Person.getField('name').getDirective('field').getArg('transform')).toEqual(['toTitleCase', 'toUpperCase']);
      expect(Person.getRequiredFields().map(f => `${f}`)).toEqual(['name', 'emailAddress']);
      expect(bookFields.map(f => f.getName())).toEqual(['name', 'price', 'author', 'bestSeller', 'bids']);
      expect(bookFields.map(f => f.getType())).toEqual(['String', 'Float', 'Person', 'Boolean', 'Float']);
      expect(bookFields.map(f => f.isArray())).toEqual([false, false, false, false, true]);
      expect(bookFields.map(f => f.isScalar())).toEqual([true, true, false, true, true]);
      expect(bookFields.map(f => f.isRequired())).toEqual([true, true, true, false, false]);
      expect(Book.getField('bestSeller').getDefaultValue()).toBe(false);
    };

    validate();
  });

  test('complexSchema', () => {
    const schema = new Schema({ typeDefs: complexSchema });
    expect(schema).toBeDefined();
  });

  test('extendSchema', () => {
    const schema = new Schema({ typeDefs, resolvers }).initialize();
    schema.mergeSchema({
      typeDefs: extendDef,
      resolvers: {
        Book: {
          price: () => 11.45,
        },
        Person: {
          name: () => 'Great Person',
        },
      },
    }).initialize();

    const validate = () => {
      expect(schema.getModelNames()).toEqual(['Person', 'Book', 'Building']);
      const [Person, Book] = schema.getModels();
      const bookFields = Book.getFields();
      expect(bookFields.map(f => f.getName())).toEqual(['name', 'price', 'author', 'bestSeller', 'bids', 'store']);
      expect(bookFields.map(f => f.getType())).toEqual(['String', 'Float', 'Person', 'Boolean', 'String', 'Building']);
      expect(bookFields.map(f => f.isArray())).toEqual([false, false, false, false, true, false]);
      expect(bookFields.map(f => f.isScalar())).toEqual([true, true, false, true, true, false]);
      expect(bookFields.map(f => f.isRequired())).toEqual([true, true, true, false, true, false]);
      expect(Person.getField('name').getDefaultValue()).toEqual('Rich');
      expect(Person.getField('name').getDirective('field').getArg('transform')).toEqual(['toTitleCase', 'toUpperCase']);
    };

    validate();
  });
});
