const { ValidationError } = require('./errors');
const { VALID_TASK_STATUSES, TASK_STATUS } = require('../../../common/models/constants');

// Standard email regex compliant with RFC 5322
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

function validateUserCreate(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new ValidationError('Request body must be a valid JSON object');
  }

  const { username, email } = payload;

  if (username === undefined || username === null) {
    throw new ValidationError("The field 'username' is required.");
  }
  if (typeof username !== 'string') {
    throw new ValidationError("The field 'username' must be a string.");
  }
  const trimmedUsername = username.trim();
  if (trimmedUsername.length < 3 || trimmedUsername.length > 50) {
    throw new ValidationError("The field 'username' must be between 3 and 50 characters.");
  }

  if (email === undefined || email === null) {
    throw new ValidationError("The field 'email' is required.");
  }
  if (typeof email !== 'string') {
    throw new ValidationError("The field 'email' must be a valid email address.");
  }
  const trimmedEmail = email.trim();
  if (!EMAIL_REGEX.test(trimmedEmail)) {
    throw new ValidationError("The field 'email' must be a valid email address.");
  }

  return {
    username: trimmedUsername,
    email: trimmedEmail.toLowerCase()
  };
}

function validateTaskCreate(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new ValidationError('Request body must be a valid JSON object');
  }

  const { title, description, status, assigned_to, assigned_to_user_id } = payload;

  if (title === undefined || title === null) {
    throw new ValidationError("The field 'title' is required.");
  }
  if (typeof title !== 'string') {
    throw new ValidationError("The field 'title' must be a string.");
  }
  const trimmedTitle = title.trim();
  if (trimmedTitle.length < 5 || trimmedTitle.length > 100) {
    throw new ValidationError("The field 'title' must be between 5 and 100 characters.");
  }

  let sanitizedDesc = null;
  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') {
      throw new ValidationError("The field 'description' must be a string.");
    }
    if (description.length > 500) {
      throw new ValidationError("The field 'description' cannot exceed 500 characters.");
    }
    sanitizedDesc = description.trim();
  }

  let taskStatus = TASK_STATUS.PENDING;
  if (status !== undefined && status !== null) {
    if (typeof status !== 'string' || !VALID_TASK_STATUSES.includes(status.trim().toLowerCase())) {
      throw new ValidationError(`The field 'status' must be one of: ${VALID_TASK_STATUSES.join(', ')}.`);
    }
    taskStatus = status.trim().toLowerCase();
  }

  const rawAssignedTo = assigned_to !== undefined ? assigned_to : assigned_to_user_id;
  if (rawAssignedTo === undefined || rawAssignedTo === null || rawAssignedTo === '') {
    throw new ValidationError("The field 'assigned_to' is required.");
  }

  const assignedToNum = Number(rawAssignedTo);
  if (!Number.isInteger(assignedToNum) || assignedToNum <= 0) {
    throw new ValidationError("The field 'assigned_to' must be a valid user ID (positive integer).");
  }

  return {
    title: trimmedTitle,
    description: sanitizedDesc,
    status: taskStatus,
    assigned_to_user_id: assignedToNum
  };
}

function validateTaskUpdate(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new ValidationError('Request body must be a valid JSON object');
  }

  const allowedFields = ['title', 'description', 'status', 'assigned_to', 'assigned_to_user_id'];
  const providedFields = Object.keys(payload).filter((key) => allowedFields.includes(key));

  if (providedFields.length === 0) {
    throw new ValidationError('At least one field (title, description, status, assigned_to) must be provided to update.');
  }

  const updateData = {};

  if (payload.title !== undefined) {
    if (typeof payload.title !== 'string') {
      throw new ValidationError("The field 'title' must be a string.");
    }
    const trimmedTitle = payload.title.trim();
    if (trimmedTitle.length < 5 || trimmedTitle.length > 100) {
      throw new ValidationError("The field 'title' must be between 5 and 100 characters.");
    }
    updateData.title = trimmedTitle;
  }

  if (payload.description !== undefined) {
    if (payload.description === null) {
      updateData.description = null;
    } else if (typeof payload.description !== 'string') {
      throw new ValidationError("The field 'description' must be a string.");
    } else {
      if (payload.description.length > 500) {
        throw new ValidationError("The field 'description' cannot exceed 500 characters.");
      }
      updateData.description = payload.description.trim();
    }
  }

  if (payload.status !== undefined) {
    if (typeof payload.status !== 'string' || !VALID_TASK_STATUSES.includes(payload.status.trim().toLowerCase())) {
      throw new ValidationError(`The field 'status' must be one of: ${VALID_TASK_STATUSES.join(', ')}.`);
    }
    updateData.status = payload.status.trim().toLowerCase();
  }

  const rawAssignedTo = payload.assigned_to !== undefined ? payload.assigned_to : payload.assigned_to_user_id;
  if (rawAssignedTo !== undefined) {
    const assignedToNum = Number(rawAssignedTo);
    if (!Number.isInteger(assignedToNum) || assignedToNum <= 0) {
      throw new ValidationError("The field 'assigned_to' must be a valid user ID (positive integer).");
    }
    updateData.assigned_to_user_id = assignedToNum;
  }

  return updateData;
}

function parsePaginationParams(query) {
  let page = 1;
  let limit = 10;

  if (query.page !== undefined) {
    const parsedPage = Number(query.page);
    if (!Number.isInteger(parsedPage) || parsedPage < 1) {
      throw new ValidationError("Query parameter 'page' must be a positive integer greater than or equal to 1.");
    }
    page = parsedPage;
  }

  if (query.limit !== undefined) {
    const parsedLimit = Number(query.limit);
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      throw new ValidationError("Query parameter 'limit' must be an integer between 1 and 100.");
    }
    limit = parsedLimit;
  }

  return { page, limit, offset: (page - 1) * limit };
}

module.exports = {
  validateUserCreate,
  validateTaskCreate,
  validateTaskUpdate,
  parsePaginationParams
};
