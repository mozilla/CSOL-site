function ServerError(stat, msg) {
  this.statusCode = stat;
  this.message = msg;
}

ServerError.prototype = new Error();
ServerError.prototype.constructor = ServerError;

module.exports = ServerError;
