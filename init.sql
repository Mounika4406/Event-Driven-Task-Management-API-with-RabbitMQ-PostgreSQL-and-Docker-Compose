-- Database Initialization Script for Task Management System

-- Drop tables if they exist to allow clean re-initialization
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS users;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create tasks table with foreign key referential integrity
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed')),
    assigned_to_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Performance indices
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Seed initial users (at least 3 valid user records)
INSERT INTO users (username, email) VALUES
    ('alice_dev', 'alice@example.com'),
    ('bob_architect', 'bob@example.com'),
    ('charlie_qa', 'charlie@example.com'),
    ('diana_pm', 'diana@example.com');

-- Seed initial tasks (at least 5 valid task records referencing existing users)
INSERT INTO tasks (title, description, status, assigned_to_user_id) VALUES
    ('Configure Docker Compose', 'Define multi-container orchestration for API, worker, DB, and MQ', 'completed', 1),
    ('Implement TaskRepository', 'Create repository layer abstracting database operations', 'in-progress', 1),
    ('Define Event Schemas', 'Create TaskCreatedEvent and TaskUpdatedEvent schema contracts', 'completed', 2),
    ('Build RabbitMQ Consumer', 'Implement asynchronous event consumer in worker service', 'in-progress', 2),
    ('Write Automated Tests', 'Implement unit tests and integration tests for services and endpoints', 'pending', 3),
    ('Perform Load Testing', 'Simulate concurrent task creation requests and queue throughput', 'pending', 4);
