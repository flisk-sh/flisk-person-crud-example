import amqp from 'amqplib';
import express from 'express';
import { Redis } from 'ioredis';
import { MongoClient, ObjectId } from 'mongodb';
import { type Person, parsePerson } from './person';

// The data services are bring-your-own containers on Flisk's backend network,
// so they are reached by their resource name and the port in their service.json.
const MONGO_URL = process.env.MONGO_URL ?? 'mongodb://mongo:4600';
const REDIS_URL = process.env.REDIS_URL ?? 'redis://redis:4610';
const RABBITMQ_URL = process.env.RABBITMQ_URL ?? 'amqp://people:people@rabbitmq:4620';
const EVENTS_QUEUE = 'person-events';
const LIST_CACHE_KEY = 'persons:all';
const LIST_CACHE_SECONDS = 30;


const mongo = new MongoClient(MONGO_URL);
const persons = mongo.db('people').collection<Person>('persons');
// ioredis reconnects on its own; maxRetriesPerRequest keeps a request from hanging while Redis is down.
const redis = new Redis(REDIS_URL, { maxRetriesPerRequest: 1 });
redis.on('ready', () => console.log('[person-api] connected to redis'));
redis.on('error', (error) => console.warn(`[person-api] redis: ${error.message}`));
let channel: amqp.Channel | undefined;

// Start-up order is not guaranteed, so keep retrying until each service answers.
async function connectWithRetry(name: string, connect: () => Promise<void>): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      await connect();
      console.log(`[person-api] connected to ${name}`);
      return;
    } catch (error) {
      console.warn(`[person-api] ${name} not ready (attempt ${attempt}): ${(error as Error).message}`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

async function connectRabbit(): Promise<void> {
  const connection = await amqp.connect(RABBITMQ_URL);
  const ch = await connection.createChannel();
  await ch.assertQueue(EVENTS_QUEUE, { durable: true });
  connection.on('close', () => {
    channel = undefined;
    void connectWithRetry('rabbitmq', connectRabbit);
  });
  channel = ch;
}

function publish(type: string, person: unknown): void {
  const event = { type, person, at: new Date().toISOString() };
  if (!channel) {
    console.warn(`[person-api] rabbitmq not connected, dropped ${type}`);
    return;
  }
  channel.sendToQueue(EVENTS_QUEUE, Buffer.from(JSON.stringify(event)), { persistent: true });
}

function parseId(id: string): ObjectId | undefined {
  return ObjectId.isValid(id) ? new ObjectId(id) : undefined;
}


const app = express();
app.use(express.json());

// The frontend is served from a different host than the API, so allow it to call us.
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

// Health check endpoint (required by TILT_RESOURCE_DEFAULTS.star)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'person-api' });
});

app.get('/health/live', (_req, res) => {
  res.json({ status: 'alive', timestamp: Date.now() });
});

app.get('/health/ready', async (_req, res) => {
  const dependencies: Record<string, string> = {};
  const check = async (name: string, probe: () => Promise<unknown>) => {
    try {
      await probe();
      dependencies[name] = 'ok';
    } catch {
      dependencies[name] = 'down';
    }
  };
  await check('mongo', () => mongo.db('admin').command({ ping: 1 }));
  await check('redis', () => redis.ping());
  dependencies.rabbitmq = channel ? 'ok' : 'down';

  const allReady = Object.values(dependencies).every((status) => status === 'ok');
  res.status(allReady ? 200 : 503).json({ status: allReady ? 'ready' : 'not_ready', dependencies });
});

app.get('/', (_req, res) => {
  res.json({
    service: 'person-api',
    version: '1.0.0',
    endpoints: ['/health', '/health/ready', '/persons', '/persons/:id'],
  });
});

app.get('/persons', async (_req, res) => {
  const cached = await redis.get(LIST_CACHE_KEY).catch(() => null);
  if (cached) {
    res.set('X-Cache', 'HIT').json(JSON.parse(cached));
    return;
  }
  const list = await persons.find().sort({ name: 1 }).toArray();
  await redis.set(LIST_CACHE_KEY, JSON.stringify(list), 'EX', LIST_CACHE_SECONDS).catch(() => undefined);
  res.set('X-Cache', 'MISS').json(list);
});

app.get('/persons/:id', async (req, res) => {
  const _id = parseId(req.params.id);
  const person = _id && (await persons.findOne({ _id }));
  if (!person) {
    res.status(404).json({ error: 'person not found' });
    return;
  }
  res.json(person);
});

app.post('/persons', async (req, res) => {
  const person = parsePerson(req.body);
  if (typeof person === 'string') {
    res.status(400).json({ error: person });
    return;
  }
  const { insertedId } = await persons.insertOne(person);
  const created = { _id: insertedId, ...person };
  await redis.del(LIST_CACHE_KEY).catch(() => undefined);
  publish('person.created', created);
  res.status(201).json(created);
});

app.put('/persons/:id', async (req, res) => {
  const _id = parseId(req.params.id);
  const person = parsePerson(req.body);
  if (typeof person === 'string') {
    res.status(400).json({ error: person });
    return;
  }
  const updated = _id && (await persons.findOneAndReplace({ _id }, person, { returnDocument: 'after' }));
  if (!updated) {
    res.status(404).json({ error: 'person not found' });
    return;
  }
  await redis.del(LIST_CACHE_KEY).catch(() => undefined);
  publish('person.updated', updated);
  res.json(updated);
});

app.delete('/persons/:id', async (req, res) => {
  const _id = parseId(req.params.id);
  const deleted = _id && (await persons.findOneAndDelete({ _id }));
  if (!deleted) {
    res.status(404).json({ error: 'person not found' });
    return;
  }
  await redis.del(LIST_CACHE_KEY).catch(() => undefined);
  publish('person.deleted', deleted);
  res.status(204).end();
});

const port = Number(process.env.PORT || 3000);

// Bind beyond loopback: Traefik reaches the container over the Docker network.
app.listen(port, '0.0.0.0', () => {
  console.log('\n🚀 person-api running on http://localhost:' + port);
  console.log('📊 Health check: http://localhost:' + port + '/health\n');
});

void connectWithRetry('mongo', () => mongo.connect().then(() => undefined));
void connectWithRetry('rabbitmq', connectRabbit);
