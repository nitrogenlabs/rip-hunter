"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ApiError = void 0;

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } _setPrototypeOf(subClass.prototype, superClass && superClass.prototype); if (superClass) _setPrototypeOf(subClass, superClass); }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _wrapNativeSuper(Class) { var _cache = typeof Map === "function" ? new Map() : undefined; _wrapNativeSuper = function _wrapNativeSuper(Class) { if (typeof Class !== "function") { throw new TypeError("Super expression must either be null or a function"); } if (typeof _cache !== "undefined") { if (_cache.has(Class)) return _cache.get(Class); _cache.set(Class, Wrapper); } function Wrapper() {} Wrapper.prototype = Object.create(Class.prototype, { constructor: { value: Wrapper, enumerable: false, writable: true, configurable: true } }); return _setPrototypeOf(Wrapper, _setPrototypeOf(function Super() { return _construct(Class, arguments, _getPrototypeOf(this).constructor); }, Class)); }; return _wrapNativeSuper(Class); }

function _construct(Parent, args, Class) { if (typeof Reflect !== "undefined" && Reflect.construct) { _construct = Reflect.construct; } else { _construct = function _construct(Parent, args, Class) { var a = [null]; a.push.apply(a, args); var Constructor = Parent.bind.apply(Parent, a); var instance = new Constructor(); if (Class) _setPrototypeOf(instance, Class.prototype); return instance; }; } return _construct.apply(null, arguments); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _getPrototypeOf(o) { _getPrototypeOf = Object.getPrototypeOf || function _getPrototypeOf(o) { return o.__proto__; }; return _getPrototypeOf(o); }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var ApiError =
/*#__PURE__*/
function (_Error) {
  function ApiError(list, error) {
    var _this;

    _classCallCheck(this, ApiError);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(ApiError).call(this, 'API Error'));

    _defineProperty(_assertThisInitialized(_assertThisInitialized(_this)), "source", void 0);

    _defineProperty(_assertThisInitialized(_assertThisInitialized(_this)), "errors", void 0);

    _this.source = error;
    _this.errors = list ? list.map(function (errorItem) {
      return errorItem.message;
    }) : [];
    return _this;
  }

  _inherits(ApiError, _Error);

  return ApiError;
}(_wrapNativeSuper(Error));

exports.ApiError = ApiError;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9lcnJvcnMvQXBpRXJyb3IudHMiXSwibmFtZXMiOlsiQXBpRXJyb3IiLCJsaXN0IiwiZXJyb3IiLCJzb3VyY2UiLCJlcnJvcnMiLCJtYXAiLCJlcnJvckl0ZW0iLCJtZXNzYWdlIiwiRXJyb3IiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztJQUFhQSxROzs7QUFJWCxvQkFBWUMsSUFBWixFQUFrQkMsS0FBbEIsRUFBeUI7QUFBQTs7QUFBQTs7QUFDdkIsa0ZBQU0sV0FBTjs7QUFEdUI7O0FBQUE7O0FBRXZCLFVBQUtDLE1BQUwsR0FBY0QsS0FBZDtBQUNBLFVBQUtFLE1BQUwsR0FBY0gsT0FBT0EsS0FBS0ksR0FBTCxDQUFTLFVBQUNDLFNBQUQ7QUFBQSxhQUFzQkEsVUFBVUMsT0FBaEM7QUFBQSxLQUFULENBQVAsR0FBMkQsRUFBekU7QUFIdUI7QUFJeEI7Ozs7O21CQVIyQkMsSyIsInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBjbGFzcyBBcGlFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgc291cmNlOiBFcnJvcjtcbiAgZXJyb3JzOiBzdHJpbmdbXTtcbiAgXG4gIGNvbnN0cnVjdG9yKGxpc3QsIGVycm9yKSB7XG4gICAgc3VwZXIoJ0FQSSBFcnJvcicpO1xuICAgIHRoaXMuc291cmNlID0gZXJyb3I7XG4gICAgdGhpcy5lcnJvcnMgPSBsaXN0ID8gbGlzdC5tYXAoKGVycm9ySXRlbTogRXJyb3IpID0+IGVycm9ySXRlbS5tZXNzYWdlKSA6IFtdO1xuICB9XG59XG4iXX0=