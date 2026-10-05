const fs = require('fs/promises');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../../data');
const DATA_FILE = path.join(DATA_DIR, 'users.json');

// Serializes writes so concurrent register/login calls can't interleave
// and corrupt the file.
let writeQueue = Promise.resolve();

async function ensureStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify({ users: [] }, null, 2));
  }
}

async function readData() {
  await ensureStore();
  const raw = await fs.readFile(DATA_FILE, 'utf-8');
  return JSON.parse(raw);
}

async function writeData(data) {
  writeQueue = writeQueue.then(() =>
    fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2))
  );
  return writeQueue;
}

/**
 * Same method shape you'd want from a Mongoose model, so auth.service.js
 * doesn't need to change when this is swapped for real Mongo later —
 * only this file does.
 */
module.exports = {
  async findUserByEmail(email) {
    const { users } = await readData();
    return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  async findUserById(id) {
    const { users } = await readData();
    return users.find((u) => u.id === id) || null;
  },

  async createUser(user) {
    const data = await readData();
    data.users.push(user);
    await writeData(data);
    return user;
  },
};