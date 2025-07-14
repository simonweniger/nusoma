export class ForbiddenError extends Error {
  constructor(message = 'Forbidden.') {
    super(message)
    this.name = 'ForbiddenError'
    Object.setPrototypeOf(this, ForbiddenError.prototype)
  }
}

export class ValidationError extends Error {
  constructor(message = 'Input contains invalid data.') {
    super(message)
    this.name = 'ValidationError'
    Object.setPrototypeOf(this, ValidationError.prototype)
  }
}

export class PreConditionError extends Error {
  constructor(message = 'Pre-condition failed.') {
    super(message)
    this.name = 'PreConditionError'
    Object.setPrototypeOf(this, PreConditionError.prototype)
  }
}

export class NotFoundError extends Error {
  constructor(message = 'Not Found.') {
    super(message)
    this.name = 'NotFoundError'
    Object.setPrototypeOf(this, NotFoundError.prototype)
  }
}
