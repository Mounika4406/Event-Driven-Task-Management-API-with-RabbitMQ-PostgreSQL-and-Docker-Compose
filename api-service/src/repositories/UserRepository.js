const db = require('../config/db');
const User = require('../models/User');
const { ConflictError, NotFoundError } = require('../utils/errors');

class UserRepository {
  constructor(databaseClient = db) {
    this.db = databaseClient;
  }

  async create({ username, email }) {
    const sql = `
      INSERT INTO users (username, email)
      VALUES ($1, $2)
      RETURNING id, username, email, created_at;
    `;
    try {
      const result = await this.db.query(sql, [username, email]);
      const row = result.rows[0];
      return new User(row);
    } catch (err) {
      // Postgres error code 23505 = unique_violation
      if (err.code === '23505') {
        const detail = err.detail || '';
        if (detail.includes('email')) {
          throw new ConflictError("A user with this email already exists.");
        } else if (detail.includes('username')) {
          throw new ConflictError("A user with this username already exists.");
        }
        throw new ConflictError("A user with the specified username or email already exists.");
      }
      throw err;
    }
  }

  async findById(id) {
    const sql = `
      SELECT id, username, email, created_at
      FROM users
      WHERE id = $1;
    `;
    const result = await this.db.query(sql, [id]);
    if (result.rows.length === 0) {
      return null;
    }
    return new User(result.rows[0]);
  }

  async findByUsername(username) {
    const sql = `
      SELECT id, username, email, created_at
      FROM users
      WHERE username = $1;
    `;
    const result = await this.db.query(sql, [username]);
    if (result.rows.length === 0) {
      return null;
    }
    return new User(result.rows[0]);
  }

  async findByEmail(email) {
    const sql = `
      SELECT id, username, email, created_at
      FROM users
      WHERE email = $1;
    `;
    const result = await this.db.query(sql, [email]);
    if (result.rows.length === 0) {
      return null;
    }
    return new User(result.rows[0]);
  }

  async findAll({ limit = 10, offset = 0 } = {}) {
    const countSql = `SELECT COUNT(*)::int AS total FROM users;`;
    const listSql = `
      SELECT id, username, email, created_at
      FROM users
      ORDER BY id ASC
      LIMIT $1 OFFSET $2;
    `;

    const countResult = await this.db.query(countSql);
    const total = countResult.rows[0].total;

    const listResult = await this.db.query(listSql, [limit, offset]);
    const users = listResult.rows.map((row) => new User(row));

    return { users, total };
  }
}

module.exports = UserRepository;
