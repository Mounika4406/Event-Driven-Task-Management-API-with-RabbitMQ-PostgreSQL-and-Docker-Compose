const db = require('../config/db');
const Task = require('../models/Task');
const { ValidationError, NotFoundError } = require('../utils/errors');

class TaskRepository {
  constructor(databaseClient = db) {
    this.db = databaseClient;
  }

  async findById(taskId) {
    const sql = `
      SELECT id, title, description, status, assigned_to_user_id, created_at, updated_at
      FROM tasks
      WHERE id = $1;
    `;
    const result = await this.db.query(sql, [taskId]);
    if (result.rows.length === 0) {
      return null;
    }
    return new Task(result.rows[0]);
  }

  async create({ title, description, status, assigned_to_user_id }) {
    const sql = `
      INSERT INTO tasks (title, description, status, assigned_to_user_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id, title, description, status, assigned_to_user_id, created_at, updated_at;
    `;
    try {
      const result = await this.db.query(sql, [
        title,
        description || null,
        status || 'pending',
        assigned_to_user_id
      ]);
      return new Task(result.rows[0]);
    } catch (err) {
      // Postgres error code 23503 = foreign_key_violation
      if (err.code === '23503') {
        throw new ValidationError(`Assigned user with ID ${assigned_to_user_id} does not exist.`);
      }
      throw err;
    }
  }

  async update(taskId, updateData) {
    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    if (updateData.title !== undefined) {
      setClauses.push(`title = $${paramIndex++}`);
      values.push(updateData.title);
    }
    if (updateData.description !== undefined) {
      setClauses.push(`description = $${paramIndex++}`);
      values.push(updateData.description);
    }
    if (updateData.status !== undefined) {
      setClauses.push(`status = $${paramIndex++}`);
      values.push(updateData.status);
    }
    if (updateData.assigned_to_user_id !== undefined) {
      setClauses.push(`assigned_to_user_id = $${paramIndex++}`);
      values.push(updateData.assigned_to_user_id);
    }

    // Always update updated_at timestamp
    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);

    values.push(taskId);
    const sql = `
      UPDATE tasks
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, title, description, status, assigned_to_user_id, created_at, updated_at;
    `;

    try {
      const result = await this.db.query(sql, values);
      if (result.rows.length === 0) {
        return null;
      }
      return new Task(result.rows[0]);
    } catch (err) {
      if (err.code === '23503') {
        throw new ValidationError(`Assigned user with ID ${updateData.assigned_to_user_id} does not exist.`);
      }
      throw err;
    }
  }

  async delete(taskId) {
    const sql = `
      DELETE FROM tasks
      WHERE id = $1
      RETURNING id;
    `;
    const result = await this.db.query(sql, [taskId]);
    return result.rows.length > 0;
  }

  async findAll({ status, assigned_to, limit = 10, offset = 0 } = {}) {
    const whereConditions = [];
    const values = [];
    let paramIndex = 1;

    if (status) {
      whereConditions.push(`status = $${paramIndex++}`);
      values.push(status);
    }

    if (assigned_to !== undefined && assigned_to !== null) {
      whereConditions.push(`assigned_to_user_id = $${paramIndex++}`);
      values.push(Number(assigned_to));
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*)::int AS total FROM tasks ${whereClause};`;
    const countResult = await this.db.query(countSql, values);
    const total = countResult.rows[0].total;

    const listSql = `
      SELECT id, title, description, status, assigned_to_user_id, created_at, updated_at
      FROM tasks
      ${whereClause}
      ORDER BY id ASC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++};
    `;

    const listResult = await this.db.query(listSql, [...values, limit, offset]);
    const tasks = listResult.rows.map((row) => new Task(row));

    return { tasks, total };
  }
}

module.exports = TaskRepository;
