// Mock for CSS Modules
module.exports = new Proxy(
  {},
  {
    get: function (target, className) {
      // Return the class name as is for testing purposes
      return className;
    },
  }
);
