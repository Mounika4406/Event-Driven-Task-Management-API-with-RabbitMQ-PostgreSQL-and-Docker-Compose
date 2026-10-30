class Task {
  constructor({ id, title, description, status, assigned_to_user_id, created_at, updated_at }) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.status = status;
    this.assigned_to_user_id = assigned_to_user_id;
    this.created_at = created_at;
    this.updated_at = updated_at;
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      status: this.status,
      assigned_to_user_id: this.assigned_to_user_id,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = Task;
