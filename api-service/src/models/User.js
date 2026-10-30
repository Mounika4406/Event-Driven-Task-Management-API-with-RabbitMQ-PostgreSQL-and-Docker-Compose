class User {
  constructor({ id, username, email, created_at }) {
    this.id = id;
    this.username = username;
    this.email = email;
    this.created_at = created_at;
  }

  toJSON() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      created_at: this.created_at
    };
  }
}

module.exports = User;
