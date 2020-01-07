// const Neo4j = require('neodb');
// const Redis = require('redis-mock');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { timeout } = require('../src/service/app.service');
const Schema = require('../src/core/Schema');
const DataLoader = require('../src/core/DataLoader');
const { schema, stores } = require('./schema');

let dataLoader;
let richard;
let christie;
let mobyDick;
let healthBook;
let chapter1;
let chapter2;
let page1;
let page2;
let page3;
let page4;
let bookBuilding;
let libraryBuilding;
let apartmentBuilding;
let bookstore1;
let bookstore2;
let library;

const sorter = (a, b) => {
  const idA = `${a.id}`;
  const idB = `${b.id}`;
  if (idA < idB) return -1;
  if (idA > idB) return 1;
  return 0;
};

module.exports = (name, db = 'mongo') => {
  describe(`${name}-${db}`, () => {
    beforeAll(async () => {
      jest.setTimeout(60000);

      const driverArgs = {};

      // Start in-memory db
      switch (db) {
        case 'redis': {
          // const redisClient = Redis.createClient();
          stores.default.type = 'redis';
          // driverArgs.redis = redisClient;
          break;
        }
        case 'neo4j': {
          stores.default.type = 'neo4j';
          stores.default.uri = 'bolt://localhost';
          break;
        }
        case 'neo4jRest': {
          stores.default.type = 'neo4jRest';
          stores.default.uri = 'http://localhost:7474';
          break;
        }
        default: {
          const mongoServer = new MongoMemoryServer();
          stores.default.uri = await mongoServer.getConnectionString();
          break;
        }
      }

      // Create core classes
      const schema2 = new Schema(schema, stores, driverArgs);
      dataLoader = new DataLoader(schema2);

      //
      await timeout(2000);
      await Promise.all(schema2.getModels().map(model => model.drop()));
      await timeout(500);
    });


    describe('Create', () => {
      test('Person', async () => {
        richard = await dataLoader.create('Person', { name: 'Richard', emailAddress: 'rich@coderich.com' });
        expect(richard.id).toBeDefined();
        expect(richard.name).toBe('Richard');

        christie = await dataLoader.create('Person', { name: 'Christie', emailAddress: 'christie@gmail.com', friends: [richard.id] });
        expect(christie.id).toBeDefined();
        expect(christie.friends).toEqual([richard.id]);
      });

      test('Book', async () => {
        mobyDick = await dataLoader.create('Book', { name: 'moby dick', price: 9.99, bids: [1.99, 1.20, 5.00], bestSeller: true, author: richard.id });
        expect(mobyDick.id).toBeDefined();
        expect(mobyDick.name).toBe('Moby Dick');
        expect(mobyDick.price).toBe(9.99);
        expect(mobyDick.author).toBe(richard.id);

        healthBook = await dataLoader.create('Book', { name: 'Health and Wellness', bids: [5.00, 9.00, 12.50], price: '29.99', author: christie.id });
        expect(healthBook.id).toBeDefined();
        expect(healthBook.name).toEqual('Health And Wellness');
        expect(healthBook.price).toEqual(29.99);
        expect(healthBook.author).toEqual(christie.id);
      });

      test('Chapter', async () => {
        chapter1 = await dataLoader.create('Chapter', { name: 'chapter1', book: healthBook.id });
        chapter2 = await dataLoader.create('Chapter', { name: 'chapter2', book: healthBook.id });
        expect(chapter1.id).toBeDefined();
        expect(chapter1.name).toEqual('Chapter1');
        expect(chapter2.id).toBeDefined();
        expect(chapter2.name).toEqual('Chapter2');
      });

      test('Page', async () => {
        page1 = await dataLoader.create('Page', { number: 1, chapter: chapter1.id, verbage: 'This is the introduction, of sorts.' });
        page2 = await dataLoader.create('Page', { number: 2, chapter: chapter1.id, verbage: 'Now you know.' });
        page3 = await dataLoader.create('Page', { number: 1, chapter: chapter2.id, verbage: 'Ready for more?' });
        page4 = await dataLoader.create('Page', { number: 2, chapter: chapter2.id, verbage: 'The end.' });
        expect(page1.id).toBeDefined();
        expect(page2.id).toBeDefined();
        expect(page3.id).toBeDefined();
        expect(page4.id).toBeDefined();
      });

      test('Building', async () => {
        bookBuilding = await dataLoader.create('Building', { year: 1990, type: 'business', tenants: christie.id });
        libraryBuilding = await dataLoader.create('Building', { type: 'business', tenants: christie.id });
        apartmentBuilding = await dataLoader.create('Building', { type: 'home', tenants: [richard.id, christie.id], landlord: richard.id });
        expect(bookBuilding.id).toBeDefined();
        expect(bookBuilding.year).toEqual(1990);
        expect(libraryBuilding.id).toBeDefined();
        expect(libraryBuilding.tenants).toEqual([christie.id]);
        expect(apartmentBuilding.id).toBeDefined();
        expect(apartmentBuilding.landlord).toEqual(richard.id);
        expect(apartmentBuilding.tenants).toEqual([richard.id, christie.id]);
      });

      test('BookStore', async () => {
        bookstore1 = await dataLoader.create('BookStore', { name: 'Best Books Ever', books: [mobyDick.id, mobyDick.id, healthBook.id], building: bookBuilding });
        bookstore2 = await dataLoader.create('BookStore', { name: 'New Books', books: [mobyDick.id], building: bookBuilding });
        expect(bookstore1.id).toBeDefined();
        expect(bookstore1.books.length).toEqual(3);
        expect(bookstore1.building.type).toEqual('business');
        expect(bookstore2.id).toBeDefined();
        expect(bookstore2.books.length).toEqual(1);
        expect(bookstore2.building.type).toEqual('business');
      });

      test('Library', async () => {
        library = await dataLoader.create('Library', { name: 'Public Library', books: [mobyDick.id, healthBook.id, healthBook.id], building: libraryBuilding });
        expect(library.id).toBeDefined();
        expect(library.books.length).toEqual(3);
        expect(library.building.type).toEqual('business');
      });
    });


    describe('Get', () => {
      test('Person', async () => {
        expect(await dataLoader.get('Person', richard.id).exec()).toMatchObject({ id: richard.id, name: richard.name });
        expect(await dataLoader.get('Person', christie.id).exec()).toMatchObject({ id: christie.id, name: christie.name, friends: [richard.id] });
      });

      test('Book', async () => {
        expect(await dataLoader.get('Book', mobyDick.id).exec()).toMatchObject({ id: mobyDick.id, name: 'Moby Dick', author: richard.id });
        expect(await dataLoader.get('Book', healthBook.id).exec()).toMatchObject({ id: healthBook.id, name: 'Health And Wellness', author: christie.id });
      });

      test('Chapter', async () => {
        expect(await dataLoader.get('Chapter', chapter1.id).exec()).toMatchObject({ id: chapter1.id, name: 'Chapter1', book: healthBook.id });
        expect(await dataLoader.get('Chapter', chapter2.id).exec()).toMatchObject({ id: chapter2.id, name: 'Chapter2', book: healthBook.id });
      });

      test('Page', async () => {
        expect(await dataLoader.get('Page', page1.id).exec()).toMatchObject({ id: page1.id, number: 1, chapter: chapter1.id });
        expect(await dataLoader.get('Page', page2.id).exec()).toMatchObject({ id: page2.id, number: 2, chapter: chapter1.id });
        expect(await dataLoader.get('Page', page3.id).exec()).toMatchObject({ id: page3.id, number: 1, chapter: chapter2.id });
        expect(await dataLoader.get('Page', page4.id).exec()).toMatchObject({ id: page4.id, number: 2, chapter: chapter2.id });
      });

      test('Building', async () => {
        expect(await dataLoader.get('Building', bookBuilding.id).exec()).toMatchObject({ id: bookBuilding.id, year: 1990, type: 'business' });
        expect(await dataLoader.get('Building', libraryBuilding.id).exec()).toMatchObject({ id: libraryBuilding.id, type: 'business' });
        expect(await dataLoader.get('Building', apartmentBuilding.id).exec()).toMatchObject({ id: apartmentBuilding.id, type: 'home', tenants: [richard.id, christie.id], landlord: richard.id });
      });

      test('BookStore', async () => {
        expect(await dataLoader.get('BookStore', bookstore1.id).exec()).toMatchObject({ id: bookstore1.id, name: 'Best Books Ever', books: [mobyDick.id, mobyDick.id, healthBook.id], building: expect.objectContaining(bookBuilding) });
        expect(await dataLoader.get('BookStore', bookstore2.id).exec()).toMatchObject({ id: bookstore2.id, name: 'New Books', books: [mobyDick.id], building: expect.objectContaining(bookBuilding) });
      });

      test('Library', async () => {
        expect(await dataLoader.get('Library', library.id).exec()).toMatchObject({ id: library.id, name: 'Public Library', books: [mobyDick.id, healthBook.id, healthBook.id], building: expect.objectContaining(libraryBuilding) });
      });
    });


    describe('Find', () => {
      test('Person', async () => {
        expect((await dataLoader.find('Person').exec()).length).toBe(2);
        expect(await dataLoader.find('Person').where({ name: 'richard' }).exec()).toMatchObject([{ id: richard.id, name: 'Richard' }]);
        expect(await dataLoader.find('Person').where({ name: 'Christie' }).exec()).toMatchObject([{ id: christie.id, name: 'Christie' }]);
        expect(await dataLoader.find('Person').where({ emailAddress: 'rich@coderich.com' }).exec()).toMatchObject([{ id: richard.id, name: 'Richard' }]);
        expect((await dataLoader.find('Person').where({ name: ['Richard', 'Christie'] }).exec()).sort(sorter)).toMatchObject([{ id: christie.id, name: 'Christie' }, { id: richard.id, name: 'Richard' }].sort(sorter));
        expect((await dataLoader.find('Person').where({ name: '*' }).exec()).sort(sorter)).toMatchObject([{ id: christie.id, name: 'Christie' }, { id: richard.id, name: 'Richard' }].sort(sorter));
        expect(await dataLoader.find('Person').where({ authored: mobyDick.id }).exec()).toMatchObject([{ id: richard.id, name: 'Richard' }]);
      });

      test('Book', async () => {
        expect((await dataLoader.find('Book').exec()).length).toBe(2);
        expect(await dataLoader.find('Book').where({ author: richard.id }).exec()).toMatchObject([{ id: mobyDick.id, name: 'Moby Dick', author: richard.id }]);
        expect(await dataLoader.find('Book').where({ price: 9.99 }).exec()).toMatchObject([{ id: mobyDick.id, name: 'Moby Dick', author: richard.id }]);
        expect(await dataLoader.find('Book').where({ price: '9.99' }).exec()).toMatchObject([{ id: mobyDick.id, name: 'Moby Dick', author: richard.id }]);
        expect(await dataLoader.find('Book').where({ author: christie.id }).exec()).toMatchObject([{ id: healthBook.id, name: 'Health And Wellness', author: christie.id }]);
        expect(await dataLoader.find('Book').where({ bestSeller: true }).exec()).toMatchObject([{ id: mobyDick.id, name: 'Moby Dick', author: richard.id }]);
        expect(await dataLoader.find('Book').where({ bestSeller: 'TRu?' }).exec()).toMatchObject([{ id: mobyDick.id, name: 'Moby Dick', author: richard.id }]);
        expect(await dataLoader.find('Book').where({ bestSeller: 'tru' }).exec()).toMatchObject([]);
        expect(await dataLoader.find('Book').where({ price: '?.??' }).exec()).toMatchObject([{ id: mobyDick.id, name: 'Moby Dick', author: richard.id }]);
        expect(await dataLoader.find('Book').where({ price: '??.*' }).exec()).toMatchObject([{ id: healthBook.id, name: 'Health And Wellness', author: christie.id }]);
        expect(await dataLoader.find('Book').where({ bids: [1.99] }).exec()).toMatchObject([{ id: mobyDick.id }]);
        expect(await dataLoader.find('Book').where({ bids: 1.99 }).exec()).toMatchObject([{ id: mobyDick.id }]);
        expect((await dataLoader.find('Book').where({ bids: 5.00 }).exec()).sort(sorter)).toMatchObject([{ id: mobyDick.id }, { id: healthBook.id }].sort(sorter));
        expect(await dataLoader.find('Book').where({ bids: [19.99, '1.99'] }).exec()).toMatchObject([{ id: mobyDick.id }]);
        expect(await dataLoader.find('Book').where({ chapters: chapter1.id }).exec()).toMatchObject([{ id: healthBook.id }]);
      });

      test('Chapter', async () => {
        expect((await dataLoader.find('Chapter').exec()).length).toBe(2);
        expect(await dataLoader.find('Chapter').where({ name: 'cHAPter1' }).exec()).toMatchObject([{ id: chapter1.id, name: 'Chapter1', book: healthBook.id }]);
        expect(await dataLoader.find('Chapter').where({ name: 'cHAPteR2' }).exec()).toMatchObject([{ id: chapter2.id, name: 'Chapter2', book: healthBook.id }]);
        expect(await dataLoader.find('Chapter').where({ name: 'cHAPteR3' }).exec()).toEqual([]);
        expect(await dataLoader.find('Chapter').where({ book: mobyDick.id }).exec()).toEqual([]);
        expect(await dataLoader.find('Chapter').where({ book: 'some-odd-id' }).exec()).toEqual([]);
        expect((await dataLoader.find('Chapter').where({ book: healthBook.id }).exec()).sort(sorter)).toMatchObject([
          { id: chapter1.id, name: 'Chapter1', book: healthBook.id },
          { id: chapter2.id, name: 'Chapter2', book: healthBook.id },
        ].sort(sorter));
      });

      test('Page', async () => {
        expect((await dataLoader.find('Page').exec()).length).toBe(4);
        expect((await dataLoader.find('Page').where({ chapter: chapter1.id }).exec()).length).toBe(2);
        expect((await dataLoader.find('Page').where({ chapter: chapter2.id }).exec()).length).toBe(2);
        expect((await dataLoader.find('Page').where({ number: 1 }).exec()).sort(sorter)).toMatchObject([
          { id: page1.id, chapter: chapter1.id },
          { id: page3.id, chapter: chapter2.id },
        ].sort(sorter));
        expect((await dataLoader.find('Page').where({ number: '2' }).exec()).sort(sorter)).toMatchObject([
          { id: page2.id, chapter: chapter1.id },
          { id: page4.id, chapter: chapter2.id },
        ].sort(sorter));
      });

      test('Building', async () => {
        expect((await dataLoader.find('Building').exec()).length).toBe(3);
        expect((await dataLoader.find('Building').where({ tenants: [richard.id] }).exec()).length).toBe(1);
        expect((await dataLoader.find('Building').where({ tenants: [christie.id] }).exec()).length).toBe(3);
        expect((await dataLoader.find('Building').where({ tenants: [richard.id, christie.id] }).exec()).length).toBe(3);
        expect((await dataLoader.find('Building').where({ tenants: [richard.id, christie.id], landlord: richard.id }).exec()).length).toBe(1);
        expect((await dataLoader.find('Building').where({ tenants: [richard.id, christie.id], landlord: christie.id }).exec()).length).toBe(0);
      });

      test('BookStore', async () => {
        expect((await dataLoader.find('BookStore').exec()).length).toBe(2);
        expect((await dataLoader.find('BookStore').where({ books: [mobyDick.id] }).exec()).length).toBe(2);
        expect((await dataLoader.find('BookStore').where({ name: 'new books' }).exec()).sort(sorter)).toMatchObject([
          { id: bookstore2.id, name: 'New Books', building: expect.objectContaining(bookBuilding) },
        ].sort(sorter));
      });

      test('Library', async () => {
        expect((await dataLoader.find('Library').exec()).length).toBe(1);
      });
    });


    describe('Count (find)', () => {
      test('Person', async () => {
        expect(await dataLoader.count('Person').exec()).toBe(2);
        expect(await dataLoader.count('Person').where({ name: 'richard' }).exec()).toBe(1);
        expect(await dataLoader.count('Person').where({ name: 'Christie' }).exec()).toBe(1);
      });

      test('Book', async () => {
        expect(await dataLoader.count('Book').exec()).toBe(2);
        expect(await dataLoader.count('Book').where({ author: richard.id }).exec()).toBe(1);
        expect(await dataLoader.count('Book').where({ price: 9.99 }).exec()).toBe(1);
        expect(await dataLoader.count('Book').where({ price: '9.99' }).exec()).toBe(1);
        expect(await dataLoader.count('Book').where({ author: christie.id }).exec()).toBe(1);
      });

      test('Chapter', async () => {
        expect(await dataLoader.count('Chapter').exec()).toBe(2);
        expect(await dataLoader.count('Chapter').where({ name: 'cHAPter1' }).exec()).toBe(1);
        expect(await dataLoader.count('Chapter').where({ name: 'cHAPteR2' }).exec()).toBe(1);
        expect(await dataLoader.count('Chapter').where({ name: 'cHAPteR3' }).exec()).toBe(0);
        expect(await dataLoader.count('Chapter').where({ book: mobyDick.id }).exec()).toBe(0);
        expect(await dataLoader.count('Chapter').where({ book: 'some-odd-id' }).exec()).toEqual(0);
        expect(await dataLoader.count('Chapter').where({ book: healthBook.id }).exec()).toBe(2);
      });

      test('Page', async () => {
        expect(await dataLoader.count('Page').exec()).toBe(4);
        expect(await dataLoader.count('Page').where({ chapter: chapter1.id }).exec()).toBe(2);
        expect(await dataLoader.count('Page').where({ chapter: chapter2.id }).exec()).toBe(2);
        expect(await dataLoader.count('Page').where({ number: 1 }).exec()).toBe(2);
        expect(await dataLoader.count('Page').where({ number: '2' }).exec()).toBe(2);
      });

      test('Building', async () => {
        expect(await dataLoader.count('Building').exec()).toBe(3);
        expect(await dataLoader.count('Building').where({ tenants: [richard.id] }).exec()).toBe(1);
        expect(await dataLoader.count('Building').where({ tenants: [christie.id] }).exec()).toBe(3);
        expect(await dataLoader.count('Building').where({ tenants: [richard.id, christie.id] }).exec()).toBe(3);
        expect(await dataLoader.count('Building').where({ tenants: [richard.id, christie.id], landlord: richard.id }).exec()).toBe(1);
        expect(await dataLoader.count('Building').where({ tenants: [richard.id, christie.id], landlord: christie.id }).exec()).toBe(0);
      });

      test('BookStore', async () => {
        expect(await dataLoader.count('BookStore').exec()).toBe(2);
        expect(await dataLoader.count('BookStore').where({ books: [mobyDick.id] }).exec()).toBe(2);
        expect(await dataLoader.count('BookStore').where({ name: 'new books' }).exec()).toBe(1);
      });

      test('Library', async () => {
        expect(await dataLoader.count('Library').exec()).toBe(1);
      });
    });


    describe('Data Validation', () => {
      test('Person', async () => {
        await expect(dataLoader.create('Person')).rejects.toThrow();
        await expect(dataLoader.create('Person', { name: 'Richard' })).rejects.toThrow();
        await expect(dataLoader.create('Person', { name: 'NewGuy', emailAddress: 'newguy@gmail.com', friends: ['nobody'] })).rejects.toThrow();
        await expect(dataLoader.create('Person', { name: 'NewGuy', emailAddress: 'newguy@gmail.com', friends: [richard.id, 'nobody'] })).rejects.toThrow();
        await expect(dataLoader.create('Person', { name: 'NewGuy', emailAddress: 'newguygmail.com' })).rejects.toThrow();
        await expect(dataLoader.update('Person', richard.id, { name: 'Christie' })).rejects.toThrow();
        await expect(dataLoader.update('Person', richard.id, { name: 'christie' })).rejects.toThrow();
        await expect(dataLoader.update('Person', richard.id, { name: null })).rejects.toThrow();
        await expect(dataLoader.update('Person', 'nobody', { name: 'NewGuy' })).rejects.toThrow();
        await expect(dataLoader.update('Person', richard.id, { friends: [richard.id] })).rejects.toThrow();
      });

      test('Book', async () => {
        await expect(dataLoader.create('Book')).rejects.toThrow();
        await expect(dataLoader.create('Book', { name: 'The Bible' })).rejects.toThrow();
        await expect(dataLoader.create('Book', { name: 'The Bible', author: 'Moses' })).rejects.toThrow();
        await expect(dataLoader.create('Book', { name: 'The Bible', author: richard.id })).rejects.toThrow();
        await expect(dataLoader.create('Book', { name: 'The Bible', price: 1.99 })).rejects.toThrow();
        await expect(dataLoader.create('Book', { name: 'The Bible', price: 1.99, author: mobyDick.id })).rejects.toThrow();
        await expect(dataLoader.create('Book', { name: 'The Bible', price: 1.99, author: [christie.id] })).rejects.toThrow();
        await expect(dataLoader.create('Book', { name: 'the bible', price: 1.99, author: christie.id })).rejects.toThrow();
        await expect(dataLoader.create('Book', { name: 'Great Book', price: -1, author: christie.id })).rejects.toThrow();
        await expect(dataLoader.create('Book', { name: 'Best Book', price: 101, author: christie.id })).rejects.toThrow();
        await expect(dataLoader.update('Book', mobyDick.id, { author: christie.id })).rejects.toThrow();
        await expect(dataLoader.update('Book', mobyDick.id, { author: richard.id })).resolves;

        switch (stores.default.type) {
          case 'mongo': {
            await expect(dataLoader.create('Book', { name: 'MoBY DiCK', price: 1.99, author: richard.id })).rejects.toThrow();
            break;
          }
          default: break;
        }
      });

      test('Chapter', async () => {
        await expect(dataLoader.create('Chapter')).rejects.toThrow();
        await expect(dataLoader.create('Chapter', { name: 'chapter1' })).rejects.toThrow();
        await expect(dataLoader.create('Chapter', { name: 'chapter2' })).rejects.toThrow();
        await expect(dataLoader.create('Chapter', { name: 'chapter3' })).rejects.toThrow();

        switch (stores.default.type) {
          case 'mongo': {
            await expect(dataLoader.create('Chapter', { name: 'chapter1', book: healthBook.id })).rejects.toThrow();
            await expect(dataLoader.create('Chapter', { name: 'chapter3', book: christie.id })).rejects.toThrow();
            break;
          }
          default: break;
        }
      });

      test('Page', async () => {
        await expect(dataLoader.create('Page')).rejects.toThrow();
        await expect(dataLoader.create('Page', { number: 3 })).rejects.toThrow();

        switch (stores.default.type) {
          case 'mongo': {
            await expect(dataLoader.create('Page', { number: 1, chapter: chapter1 })).rejects.toThrow();
            await expect(dataLoader.create('Page', { number: 1, chapter: chapter1.id })).rejects.toThrow();
            await expect(dataLoader.create('Page', { number: 1, chapter: page4.id })).rejects.toThrow();
            await expect(dataLoader.update('Page', page1.id, { number: 2 })).rejects.toThrow();
            break;
          }
          default: break;
        }
      });

      test('Building', async () => {
        await expect(dataLoader.create('Building')).rejects.toThrow();
        await expect(dataLoader.create('Building', { type: 'bad-type' })).rejects.toThrow();
        await expect(dataLoader.create('Building', { type: 'business', landlord: bookstore1.id })).rejects.toThrow();
        await expect(dataLoader.create('Building', { type: 'business', tenants: [richard.id, bookstore1.id] })).rejects.toThrow();
      });

      test('BookStore', async () => {
        await expect(dataLoader.create('BookStore')).rejects.toThrow();
        await expect(dataLoader.create('BookStore', { name: 'New Books' })).rejects.toThrow();
        await expect(dataLoader.create('BookStore', { name: 'New Books', building: 'bad-building' })).rejects.toThrow();
        await expect(dataLoader.create('BookStore', { name: 'besT bookS eveR', building: bookBuilding })).rejects.toThrow();
        await expect(dataLoader.create('BookStore', { name: 'Best Books Ever', building: libraryBuilding })).rejects.toThrow();
        await expect(dataLoader.create('BookStore', { name: 'More More Books', building: bookBuilding, books: bookBuilding.id })).rejects.toThrow();
        await expect(dataLoader.create('BookStore', { name: 'More More Books', building: bookBuilding, books: [bookBuilding.id] })).rejects.toThrow();
        await expect(dataLoader.create('BookStore', { name: 'More More Books', building: bookBuilding, books: [mobyDick.id, bookBuilding] })).rejects.toThrow();
      });

      test('Library', async () => {
        await expect(dataLoader.create('Library')).rejects.toThrow();
        await expect(dataLoader.create('Library', { name: 'New Library' })).rejects.toThrow();
        await expect(dataLoader.create('Library', { name: 'New Library', building: 'bad-building' })).rejects.toThrow();
        await expect(dataLoader.create('Library', { name: 'New Library', building: libraryBuilding })).rejects.toThrow();
      });
    });


    describe('Data Normalization', () => {
      test('uniq', async (done) => {
        richard = await dataLoader.update('Person', richard.id, { name: 'richard', friends: [christie.id, christie.id, christie.id] });
        expect(richard.name).toEqual('Richard');
        expect(richard.friends).toEqual([christie.id]);
        dataLoader.clearAll();
        done();
      });
    });


    describe('Find (Deep)', () => {
      test('Person', async () => {
        expect(await dataLoader.find('Person').where({ authored: { name: 'Moby Dick' } }).exec()).toMatchObject([{ id: richard.id, name: 'Richard' }]);
        expect(await dataLoader.find('Person').where({ authored: { author: { name: 'ChRist??' } } }).exec()).toMatchObject([{ id: christie.id, name: 'Christie' }]);
        expect(await dataLoader.find('Person').where({ friends: { name: 'Christie' } }).exec()).toMatchObject([{ id: richard.id, name: 'Richard' }]);
        expect(await dataLoader.find('Person').where({ friends: { authored: { name: 'Health*' } } }).exec()).toMatchObject([{ id: richard.id, name: 'Richard' }]);
        expect(await dataLoader.find('Person').where({ friends: { authored: { name: 'Cray Cray*' } } }).exec()).toMatchObject([]);
        expect(await dataLoader.find('Person').where({ authored: { chapters: { pages: { verbage: 'city lust' } } } }).exec()).toMatchObject([]);
        expect(await dataLoader.find('Person').where({ authored: { chapters: { pages: { verbage: 'the end.' } } } }).exec()).toMatchObject([{ id: christie.id, name: 'Christie' }]);
        expect(await dataLoader.find('Person').where({ authored: { chapters: { pages: { verbage: '*intro*' } } } }).exec()).toMatchObject([{ id: christie.id, name: 'Christie' }]);
        expect(await dataLoader.find('Person').where({ authored: { chapters: { name: 'citizen', pages: { verbage: '*intro*' } } } }).exec()).toMatchObject([]);
        expect(await dataLoader.find('Person').where({ authored: { chapters: { name: 'chapter*', pages: { verbage: '*intro*' } } } }).exec()).toMatchObject([{ id: christie.id, name: 'Christie' }]);
        expect(await dataLoader.find('Person').where({ authored: { chapters: { name: '{citizen,chap*}', pages: { verbage: '*intro*' } } } }).exec()).toMatchObject([{ id: christie.id, name: 'Christie' }]);
      });

      test('Book', async () => {
        expect(await dataLoader.find('Book').where({ author: { name: 'Richard' } }).exec()).toMatchObject([{ id: mobyDick.id }]);
        expect(await dataLoader.find('Book').where({ author: { authored: { name: 'Moby*' } } }).exec()).toMatchObject([{ id: mobyDick.id }]);
        expect(await dataLoader.find('Book').where({ author: { authored: { name: 'Health*' } } }).exec()).toMatchObject([{ id: healthBook.id }]);
        expect((await dataLoader.find('Book').where({ author: { authored: { name: '*' } } }).exec()).sort(sorter)).toMatchObject([{ id: healthBook.id }, { id: mobyDick.id }].sort(sorter));
        expect(await dataLoader.find('Book').where({ chapters: { name: 'Chapter1' } }).exec()).toMatchObject([{ id: healthBook.id }]);
        expect(await dataLoader.find('Book').where({ chapters: { name: ['chapter1', 'chapter2'] } }).exec()).toMatchObject([{ id: healthBook.id }]);
        expect(await dataLoader.find('Book').where({ chapters: { name: ['chapter1', 'no-chapter'] } }).exec()).toMatchObject([{ id: healthBook.id }]);
        expect(await dataLoader.find('Book').where({ chapters: { name: '*' } }).exec()).toMatchObject([{ id: healthBook.id }]);
        expect(await dataLoader.find('Book').where({ chapters: { pages: { number: 1 } } }).exec()).toMatchObject([{ id: healthBook.id }]);
        expect(await dataLoader.find('Book').where({ chapters: [{ name: 'HongKong' }, chapter1.id] }).exec()).toMatchObject([{ id: healthBook.id }]);
      });
    });


    describe('Update', () => {
      test('Person', async () => {
        expect(await dataLoader.update('Person', richard.id, { name: 'Rich' })).toMatchObject({ id: richard.id, name: 'Rich' });
        expect(await dataLoader.update('Person', richard.id, { name: 'richard' })).toMatchObject({ id: richard.id, name: 'Richard' });
      });

      test('Book', async () => {
        expect(await dataLoader.update('Book', mobyDick.id, { name: 'mopey dick' })).toMatchObject({ id: mobyDick.id, name: 'Mopey Dick' });
        expect(await dataLoader.update('Book', mobyDick.id, { name: 'moby dick' })).toMatchObject({ id: mobyDick.id, name: 'Moby Dick' });
      });
    });


    describe('Query (Deep)', () => {
      test('Person', async () => {
        expect(await dataLoader.query('Person').where({ authored: { name: 'Moby Dick' } }).exec()).toMatchObject([{ id: richard.id, name: 'Richard' }]);
        expect(await dataLoader.query('Person').where({ authored: { author: { name: 'ChRist??' } } }).exec()).toMatchObject([{ id: christie.id, name: 'Christie' }]);
        expect(await dataLoader.query('Person').where({ friends: { name: 'Christie' } }).exec()).toMatchObject([{ id: richard.id, name: 'Richard' }]);
        expect(await dataLoader.query('Person').where({ friends: { authored: { name: 'Health*' } } }).exec()).toMatchObject([{ id: richard.id, name: 'Richard' }]);
        expect(await dataLoader.query('Person').where({ friends: { authored: { name: 'Cray Cray*' } } }).exec()).toMatchObject([]);
        expect(await dataLoader.query('Person').where({ authored: { chapters: { pages: { verbage: 'city lust' } } } }).exec()).toMatchObject([]);
        expect(await dataLoader.query('Person').where({ authored: { chapters: { pages: { verbage: 'the end.' } } } }).exec()).toMatchObject([{ id: christie.id, name: 'Christie' }]);
        expect(await dataLoader.query('Person').where({ authored: { chapters: { pages: { verbage: '*intro*' } } } }).exec()).toMatchObject([{ id: christie.id, name: 'Christie' }]);
        expect(await dataLoader.query('Person').where({ authored: { chapters: { name: 'citizen', pages: { verbage: '*intro*' } } } }).exec()).toMatchObject([]);
        expect(await dataLoader.query('Person').where({ authored: { chapters: { name: 'chapter*', pages: { verbage: '*intro*' } } } }).exec()).toMatchObject([{ id: christie.id, name: 'Christie' }]);
        expect(await dataLoader.query('Person').where({ authored: { chapters: { name: '{citizen,chap*}', pages: { verbage: '*intro*' } } } }).exec()).toMatchObject([{ id: christie.id, name: 'Christie' }]);
        expect(await dataLoader.query('Person').where({ authored: { chapters: { name: '{citizen,chap*}', pages: { verbage: '*intro*' } } } }).exec()).toMatchObject([{ id: christie.id, name: 'Christie' }]);
      });

      test('Book', async () => {
        expect(await dataLoader.query('Book').where({ author: { name: 'Richard' } }).exec()).toMatchObject([{ id: mobyDick.id }]);
        expect(await dataLoader.query('Book').where({ author: { authored: { name: 'Moby*' } } }).exec()).toMatchObject([{ id: mobyDick.id }]);
        expect(await dataLoader.query('Book').where({ author: { authored: { name: 'Health*' } } }).exec()).toMatchObject([{ id: healthBook.id }]);
        expect((await dataLoader.query('Book').where({ author: { authored: { name: '*' } } }).exec()).sort(sorter)).toMatchObject([{ id: healthBook.id }, { id: mobyDick.id }].sort(sorter));
        expect(await dataLoader.query('Book').where({ chapters: { name: 'Chapter1' } }).exec()).toMatchObject([{ id: healthBook.id }]);
        expect(await dataLoader.query('Book').where({ chapters: { name: ['chapter1', 'chapter2'] } }).exec()).toMatchObject([{ id: healthBook.id }]);
        expect(await dataLoader.query('Book').where({ chapters: { name: ['chapter1', 'no-chapter'] } }).exec()).toMatchObject([{ id: healthBook.id }]);
        expect(await dataLoader.query('Book').where({ chapters: { name: '*' } }).exec()).toMatchObject([{ id: healthBook.id }]);
        expect(await dataLoader.query('Book').where({ chapters: { pages: { number: 1 } } }).exec()).toMatchObject([{ id: healthBook.id }]);
        expect(await dataLoader.query('Book').where({ chapters: [{ name: 'HongKong' }, chapter1.id] }).exec()).toMatchObject([{ id: healthBook.id }]);
      });
    });


    describe('Query (counts)', () => {
      test('Person', async () => {
        expect(await dataLoader.query('Person').where({ countAuthored: '2' }).exec()).toMatchObject([]);
        expect((await dataLoader.query('Person').where({ countAuthored: '1' }).exec()).length).toBe(2);
      });
    });
  });
};
