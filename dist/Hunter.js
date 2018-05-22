"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Hunter = void 0;

var Immutable = _interopRequireWildcard(require("immutable"));

var _chain = _interopRequireDefault(require("lodash/chain"));

var _isArray = _interopRequireDefault(require("lodash/isArray"));

var _isNull = _interopRequireDefault(require("lodash/isNull"));

var _isPlainObject = _interopRequireDefault(require("lodash/isPlainObject"));

var _isString = _interopRequireDefault(require("lodash/isString"));

var _isUndefined = _interopRequireDefault(require("lodash/isUndefined"));

var _ApiError = require("./errors/ApiError");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * Hunter: JS utilities for GraphQL
 */
var Hunter =
/*#__PURE__*/
function () {
  function Hunter() {
    _classCallCheck(this, Hunter);
  }

  _createClass(Hunter, null, [{
    key: "get",
    // AJAX
    value: function get(url, params, options) {
      return Hunter.ajax(url, 'GET', params, options);
    }
  }, {
    key: "post",
    value: function post(url, params, options) {
      return Hunter.ajax(url, 'POST', params, options);
    }
  }, {
    key: "put",
    value: function put(url, params, options) {
      return Hunter.ajax(url, 'PUT', params, options);
    }
  }, {
    key: "del",
    value: function del(url, params, options) {
      return Hunter.ajax(url, 'DELETE', params, options);
    }
  }, {
    key: "ajax",
    value: function ajax(url, method, params) {
      var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
      var headers = options.headers,
          token = options.token;
      var isImmutable = options.isImmutable;
      url = (url || '').trim();
      var formatToken = (token || '').trim();
      var formatHeaders = headers || new Headers(); // Method

      method = (method || 'GET').toUpperCase(); // Parameters

      if (params && method === 'GET') {
        url = "".concat(url, "?").concat(Hunter.queryString(params));
        params = null;
      } else if (params) {
        params = JSON.stringify(params);
      } // Authentication token


      if (formatToken !== '') {
        formatHeaders.set('Authorization', "Bearer ".concat(formatToken));
      }

      var isJSON;
      return fetch(url, {
        body: params,
        headers: formatHeaders,
        method: method
      }).then(function (response) {
        var regex = /application\/json/i; // Check if response is json

        isJSON = regex.test(response.headers.get('Content-Type') || '');

        if (isJSON) {
          return response.json();
        } else {
          return response.text();
        }
      }).then(function (results) {
        if (isJSON) {
          return isImmutable ? Immutable.fromJS(results) : results;
        } else {
          return results;
        }
      }).catch(function (error) {
        if ((error || {}).message === 'only absolute urls are supported') {
          error = new _ApiError.ApiError([{
            message: 'invalid_url'
          }], error);
        }

        throw new _ApiError.ApiError([{
          message: 'network_error'
        }], error);
      });
    }
  }, {
    key: "queryString",
    value: function queryString(json) {
      return Object.keys(json).map(function (key) {
        return "".concat(encodeURIComponent(key), "=").concat(encodeURIComponent(json[key]));
      }).join('&');
    } // GraphQL

  }, {
    key: "toGQL",
    value: function toGQL(obj) {
      if (Immutable.Iterable.isIterable(obj)) {
        return Hunter.toGQL(obj.toJS());
      } else if ((0, _isString.default)(obj)) {
        return JSON.stringify(obj);
      } else if ((0, _isPlainObject.default)(obj)) {
        obj = (0, _chain.default)(obj).omit(_isUndefined.default).omit(_isNull.default).value();
        var props = [];
        Object.keys(obj).map(function (key) {
          var item = obj[key];

          if ((0, _isPlainObject.default)(item)) {
            props.push(Hunter.toGQL(item));
          } else if ((0, _isArray.default)(item)) {
            var list = item.map(function (o) {
              return Hunter.toGQL(o);
            });
            props.push("".concat(key, ": [").concat(list.join(', '), "]"));
          } else {
            var val = JSON.stringify(item);

            if (val) {
              props.push("".concat(key, ": ").concat(val));
            }
          }
        });
        var values = props.join(', ');

        if (values === '') {
          return '""';
        } else {
          return "{".concat(props.join(', '), "}");
        }
      } else if ((0, _isArray.default)(obj)) {
        return "[".concat(obj.map(function (o) {
          return Hunter.toGQL(o);
        }).toString(), "]");
      } else {
        return obj;
      }
    }
  }, {
    key: "query",
    value: function query(url, body, options) {
      body = "query ".concat(body);
      return Hunter.getGraph(url, body, options);
    }
  }, {
    key: "mutation",
    value: function mutation(url, body, options) {
      body = "mutation ".concat(body);
      return Hunter.getGraph(url, body, options);
    }
  }, {
    key: "getGraph",
    value: function getGraph(url, body) {
      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
      var isImmutable = options.isImmutable;
      var headers = options.headers,
          token = options.token;
      url = url ? url.trim() : '';
      var formatToken = (token || '').trim();
      var formatHeaders = headers || new Headers({
        'Content-Type': 'application/graphql'
      });

      if (formatToken !== '') {
        formatHeaders.set('Authorization', "Bearer ".concat(formatToken));
      }

      return fetch(url, {
        body: body,
        headers: formatHeaders,
        method: 'post'
      }).then(function (response) {
        var regex = /application\/json/i;
        var isJSON = regex.test(response.headers.get('Content-Type') || '');

        if (isJSON) {
          return response.json();
        } else {
          return {
            data: {}
          };
        }
      }).catch(function (error) {
        if ((error || {}).message === 'only absolute urls are supported') {
          return Promise.reject(new _ApiError.ApiError([{
            message: 'invalid_url'
          }], error));
        }

        return Promise.reject(new _ApiError.ApiError([{
          message: 'network_error'
        }], error));
      }).then(function (json) {
        if (!json || json.errors) {
          if (!json) {
            json = {
              errors: [{
                message: 'api_error'
              }]
            };
          } else if ((json.errors || []).some(function (o) {
            return o.message === 'Must provide query string.';
          })) {
            return Promise.reject(new _ApiError.ApiError([{
              message: 'required_query'
            }], new Error()));
          }

          return Promise.reject(new _ApiError.ApiError(json.errors, new Error()));
        } else {
          var results = json.data || {};
          return isImmutable ? Immutable.fromJS(results) : results;
        }
      }).catch(function (error) {
        if (!error.source) {
          error = new _ApiError.ApiError([{
            message: 'network_error'
          }], error);
        }

        return Promise.reject(error);
      });
    }
  }, {
    key: "removeSpaces",
    value: function removeSpaces(str) {
      return str.replace(/\s+(?=(?:[^'"]*['"][^'"]*['"])*[^'"]*$)/gm, '');
    }
  }]);

  return Hunter;
}();

exports.Hunter = Hunter;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9IdW50ZXIudHMiXSwibmFtZXMiOlsiSHVudGVyIiwidXJsIiwicGFyYW1zIiwib3B0aW9ucyIsImFqYXgiLCJtZXRob2QiLCJoZWFkZXJzIiwidG9rZW4iLCJpc0ltbXV0YWJsZSIsInRyaW0iLCJmb3JtYXRUb2tlbiIsImZvcm1hdEhlYWRlcnMiLCJIZWFkZXJzIiwidG9VcHBlckNhc2UiLCJxdWVyeVN0cmluZyIsIkpTT04iLCJzdHJpbmdpZnkiLCJzZXQiLCJpc0pTT04iLCJmZXRjaCIsImJvZHkiLCJ0aGVuIiwicmVzcG9uc2UiLCJyZWdleCIsInRlc3QiLCJnZXQiLCJqc29uIiwidGV4dCIsInJlc3VsdHMiLCJJbW11dGFibGUiLCJmcm9tSlMiLCJjYXRjaCIsImVycm9yIiwibWVzc2FnZSIsIkFwaUVycm9yIiwiT2JqZWN0Iiwia2V5cyIsIm1hcCIsImtleSIsImVuY29kZVVSSUNvbXBvbmVudCIsImpvaW4iLCJvYmoiLCJJdGVyYWJsZSIsImlzSXRlcmFibGUiLCJ0b0dRTCIsInRvSlMiLCJvbWl0IiwiaXNVbmRlZmluZWQiLCJpc051bGwiLCJ2YWx1ZSIsInByb3BzIiwiaXRlbSIsInB1c2giLCJsaXN0IiwibyIsInZhbCIsInZhbHVlcyIsInRvU3RyaW5nIiwiZ2V0R3JhcGgiLCJkYXRhIiwiUHJvbWlzZSIsInJlamVjdCIsImVycm9ycyIsInNvbWUiLCJFcnJvciIsInNvdXJjZSIsInN0ciIsInJlcGxhY2UiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFBQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFFQTs7Ozs7Ozs7Ozs7O0FBaUJBOzs7SUFHYUEsTTs7Ozs7Ozs7O0FBQ1g7d0JBQ1dDLEcsRUFBYUMsTSxFQUFTQyxPLEVBQTJDO0FBQzFFLGFBQU9ILE9BQU9JLElBQVAsQ0FBWUgsR0FBWixFQUFpQixLQUFqQixFQUF3QkMsTUFBeEIsRUFBZ0NDLE9BQWhDLENBQVA7QUFDRDs7O3lCQUVXRixHLEVBQWFD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QUFDO0FBQUNELHFCQUFTO0FBQVYsV0FBRCxDQUFiLEVBQTJDRCxLQUEzQyxDQUFSO0FBQ0Q7O0FBRUQsZUFBTzRCLFFBQVFDLE1BQVIsQ0FBZTdCLEtBQWYsQ0FBUDtBQUNELE9BdENJLENBQVA7QUF1Q0Q7OztpQ0FFbUJrQyxHLEVBQXFCO0FBQ3ZDLGFBQU9BLElBQUlDLE9BQUosQ0FBWSwyQ0FBWixFQUF5RCxFQUF6RCxDQUFQO0FBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBJbW11dGFibGUgZnJvbSAnaW1tdXRhYmxlJztcbmltcG9ydCBjaGFpbiBmcm9tICdsb2Rhc2gvY2hhaW4nO1xuaW1wb3J0IGlzQXJyYXkgZnJvbSAnbG9kYXNoL2lzQXJyYXknO1xuaW1wb3J0IGlzTnVsbCBmcm9tICdsb2Rhc2gvaXNOdWxsJztcbmltcG9ydCBpc1BsYWluT2JqZWN0IGZyb20gJ2xvZGFzaC9pc1BsYWluT2JqZWN0JztcbmltcG9ydCBpc1N0cmluZyBmcm9tICdsb2Rhc2gvaXNTdHJpbmcnO1xuaW1wb3J0IGlzVW5kZWZpbmVkIGZyb20gJ2xvZGFzaC9pc1VuZGVmaW5lZCc7XG5cbmltcG9ydCB7QXBpRXJyb3J9IGZyb20gJy4vZXJyb3JzL0FwaUVycm9yJztcblxuLy8gSWYgKHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnKSB7XG4vLyAgIFJlcXVpcmUoJ2VzNi1wcm9taXNlL2F1dG8nKTtcbi8vICAgUmVxdWlyZSgnZmV0Y2gtZXZlcnl3aGVyZScpO1xuLy8gfVxuLyoqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTctUHJlc2VudCwgTml0cm9nZW4gTGFicywgSW5jLlxuICogQ29weXJpZ2h0cyBsaWNlbnNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuIFNlZSB0aGUgYWNjb21wYW55aW5nIExJQ0VOU0UgZmlsZSBmb3IgdGVybXMuXG4gKi9cblxuZXhwb3J0IGludGVyZmFjZSBIdW50ZXJPcHRpb25zVHlwZSB7XG4gIHJlYWRvbmx5IGhlYWRlcnM/OiBIZWFkZXJzO1xuICByZWFkb25seSBpc0ltbXV0YWJsZT86IGJvb2xlYW47XG4gIHJlYWRvbmx5IHRva2VuPzogc3RyaW5nO1xufVxuXG4vKipcbiAqIEh1bnRlcjogSlMgdXRpbGl0aWVzIGZvciBHcmFwaFFMXG4gKi9cbmV4cG9ydCBjbGFzcyBIdW50ZXIge1xuICAvLyBBSkFYXG4gIHN0YXRpYyBnZXQodXJsOiBzdHJpbmcsIHBhcmFtcz8sIG9wdGlvbnM/OiBIdW50ZXJPcHRpb25zVHlwZSk6IFByb21pc2U8YW55PiB7XG4gICAgcmV0dXJuIEh1bnRlci5hamF4KHVybCwgJ0dFVCcsIHBhcmFtcywgb3B0aW9ucyk7XG4gIH1cblxuICBzdGF0aWMgcG9zdCh1cmw6IHN0cmluZywgcGFyYW1zPywgb3B0aW9ucz86IEh1bnRlck9wdGlvbnNUeXBlKTogUHJvbWlzZTxhbnk+IHtcbiAgICByZXR1cm4gSHVudGVyLmFqYXgodXJsLCAnUE9TVCcsIHBhcmFtcywgb3B0aW9ucyk7XG4gIH1cblxuICBzdGF0aWMgcHV0KHVybDogc3RyaW5nLCBwYXJhbXM/LCBvcHRpb25zPzogSHVudGVyT3B0aW9uc1R5cGUpOiBQcm9taXNlPGFueT4ge1xuICAgIHJldHVybiBIdW50ZXIuYWpheCh1cmwsICdQVVQnLCBwYXJhbXMsIG9wdGlvbnMpO1xuICB9XG5cbiAgc3RhdGljIGRlbCh1cmw6IHN0cmluZywgcGFyYW1zPywgb3B0aW9ucz86IEh1bnRlck9wdGlvbnNUeXBlKTogUHJvbWlzZTxhbnk+IHtcbiAgICByZXR1cm4gSHVudGVyLmFqYXgodXJsLCAnREVMRVRFJywgcGFyYW1zLCBvcHRpb25zKTtcbiAgfVxuXG4gIHN0YXRpYyBhamF4KHVybDogc3RyaW5nLCBtZXRob2Q6IHN0cmluZywgcGFyYW1zPywgb3B0aW9uczogSHVudGVyT3B0aW9uc1R5cGUgPSB7fSk6IFByb21pc2U8YW55PiB7XG4gICAgY29uc3Qge2hlYWRlcnMsIHRva2VufSA9IG9wdGlvbnM7XG4gICAgY29uc3Qge2lzSW1tdXRhYmxlfSA9IG9wdGlvbnM7XG5cbiAgICB1cmwgPSAodXJsIHx8ICcnKS50cmltKCk7XG4gICAgY29uc3QgZm9ybWF0VG9rZW46IHN0cmluZyA9ICh0b2tlbiB8fCAnJykudHJpbSgpO1xuICAgIGNvbnN0IGZvcm1hdEhlYWRlcnM6IEhlYWRlcnMgPSBoZWFkZXJzIHx8IG5ldyBIZWFkZXJzKCk7XG5cbiAgICAvLyBNZXRob2RcbiAgICBtZXRob2QgPSAobWV0aG9kIHx8ICdHRVQnKS50b1VwcGVyQ2FzZSgpO1xuXG4gICAgLy8gUGFyYW1ldGVyc1xuICAgIGlmIChwYXJhbXMgJiYgbWV0aG9kID09PSAnR0VUJykge1xuICAgICAgdXJsID0gYCR7dXJsfT8ke0h1bnRlci5xdWVyeVN0cmluZyhwYXJhbXMpfWA7XG4gICAgICBwYXJhbXMgPSBudWxsO1xuICAgIH0gZWxzZSBpZiAocGFyYW1zKSB7XG4gICAgICBwYXJhbXMgPSBKU09OLnN0cmluZ2lmeShwYXJhbXMpO1xuICAgIH1cblxuICAgIC8vIEF1dGhlbnRpY2F0aW9uIHRva2VuXG4gICAgaWYgKGZvcm1hdFRva2VuICE9PSAnJykge1xuICAgICAgZm9ybWF0SGVhZGVycy5zZXQoJ0F1dGhvcml6YXRpb24nLCBgQmVhcmVyICR7Zm9ybWF0VG9rZW59YCk7XG4gICAgfVxuXG4gICAgbGV0IGlzSlNPTjogYm9vbGVhbjtcblxuICAgIHJldHVybiBmZXRjaCh1cmwsIHtib2R5OiBwYXJhbXMsIGhlYWRlcnM6IGZvcm1hdEhlYWRlcnMsIG1ldGhvZH0pXG4gICAgICAudGhlbigocmVzcG9uc2U6IFJlc3BvbnNlKSA9PiB7XG4gICAgICAgIGNvbnN0IHJlZ2V4ID0gL2FwcGxpY2F0aW9uXFwvanNvbi9pO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIHJlc3BvbnNlIGlzIGpzb25cbiAgICAgICAgaXNKU09OID0gcmVnZXgudGVzdChyZXNwb25zZS5oZWFkZXJzLmdldCgnQ29udGVudC1UeXBlJykgfHwgJycpO1xuXG4gICAgICAgIGlmIChpc0pTT04pIHtcbiAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuanNvbigpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiByZXNwb25zZS50ZXh0KCk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAudGhlbigocmVzdWx0cykgPT4ge1xuICAgICAgICBpZiAoaXNKU09OKSB7XG4gICAgICAgICAgcmV0dXJuIGlzSW1tdXRhYmxlID8gSW1tdXRhYmxlLmZyb21KUyhyZXN1bHRzKSA6IHJlc3VsdHM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAuY2F0Y2goKGVycm9yKSA9PiB7XG4gICAgICAgIGlmICgoZXJyb3IgfHwge30pLm1lc3NhZ2UgPT09ICdvbmx5IGFic29sdXRlIHVybHMgYXJlIHN1cHBvcnRlZCcpIHtcbiAgICAgICAgICBlcnJvciA9IG5ldyBBcGlFcnJvcihbe21lc3NhZ2U6ICdpbnZhbGlkX3VybCd9XSwgZXJyb3IpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhyb3cgbmV3IEFwaUVycm9yKFt7bWVzc2FnZTogJ25ldHdvcmtfZXJyb3InfV0sIGVycm9yKTtcbiAgICAgIH0pO1xuICB9XG5cbiAgc3RhdGljIHF1ZXJ5U3RyaW5nKGpzb246IG9iamVjdCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIE9iamVjdFxuICAgICAgLmtleXMoanNvbilcbiAgICAgIC5tYXAoKGtleTogc3RyaW5nKSA9PiBgJHtlbmNvZGVVUklDb21wb25lbnQoa2V5KX09JHtlbmNvZGVVUklDb21wb25lbnQoanNvbltrZXldKX1gKS5qb2luKCcmJyk7XG4gIH1cblxuICAvLyBHcmFwaFFMXG4gIHN0YXRpYyB0b0dRTChvYmopOiBzdHJpbmcge1xuICAgIGlmIChJbW11dGFibGUuSXRlcmFibGUuaXNJdGVyYWJsZShvYmopKSB7XG4gICAgICByZXR1cm4gSHVudGVyLnRvR1FMKG9iai50b0pTKCkpO1xuICAgIH0gZWxzZSBpZiAoaXNTdHJpbmcob2JqKSkge1xuICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KG9iaik7XG4gICAgfSBlbHNlIGlmIChpc1BsYWluT2JqZWN0KG9iaikpIHtcbiAgICAgIG9iaiA9IGNoYWluKG9iaikub21pdChpc1VuZGVmaW5lZCkub21pdChpc051bGwpLnZhbHVlKCk7XG4gICAgICBjb25zdCBwcm9wcyA9IFtdO1xuXG4gICAgICBPYmplY3Qua2V5cyhvYmopLm1hcCgoa2V5OiBzdHJpbmcpID0+IHtcbiAgICAgICAgY29uc3QgaXRlbSA9IG9ialtrZXldO1xuXG4gICAgICAgIGlmIChpc1BsYWluT2JqZWN0KGl0ZW0pKSB7XG4gICAgICAgICAgcHJvcHMucHVzaChIdW50ZXIudG9HUUwoaXRlbSkpO1xuICAgICAgICB9IGVsc2UgaWYgKGlzQXJyYXkoaXRlbSkpIHtcbiAgICAgICAgICBjb25zdCBsaXN0ID0gaXRlbS5tYXAoKG8pID0+IEh1bnRlci50b0dRTChvKSk7XG4gICAgICAgICAgcHJvcHMucHVzaChgJHtrZXl9OiBbJHtsaXN0LmpvaW4oJywgJyl9XWApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IHZhbCA9IEpTT04uc3RyaW5naWZ5KGl0ZW0pO1xuXG4gICAgICAgICAgaWYgKHZhbCkge1xuICAgICAgICAgICAgcHJvcHMucHVzaChgJHtrZXl9OiAke3ZhbH1gKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCB2YWx1ZXMgPSBwcm9wcy5qb2luKCcsICcpO1xuXG4gICAgICBpZiAodmFsdWVzID09PSAnJykge1xuICAgICAgICByZXR1cm4gJ1wiXCInO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGB7JHtwcm9wcy5qb2luKCcsICcpfX1gO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaXNBcnJheShvYmopKSB7XG4gICAgICByZXR1cm4gYFske29iai5tYXAoKG8pID0+IEh1bnRlci50b0dRTChvKSkudG9TdHJpbmcoKX1dYDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG9iajtcbiAgICB9XG4gIH1cblxuICBzdGF0aWMgcXVlcnkodXJsOiBzdHJpbmcsIGJvZHk/LCBvcHRpb25zPzogSHVudGVyT3B0aW9uc1R5cGUpOiBQcm9taXNlPGFueT4ge1xuICAgIGJvZHkgPSBgcXVlcnkgJHtib2R5fWA7XG4gICAgcmV0dXJuIEh1bnRlci5nZXRHcmFwaCh1cmwsIGJvZHksIG9wdGlvbnMpO1xuICB9XG5cbiAgc3RhdGljIG11dGF0aW9uKHVybDogc3RyaW5nLCBib2R5Pywgb3B0aW9ucz86IEh1bnRlck9wdGlvbnNUeXBlKTogUHJvbWlzZTxhbnk+IHtcbiAgICBib2R5ID0gYG11dGF0aW9uICR7Ym9keX1gO1xuICAgIHJldHVybiBIdW50ZXIuZ2V0R3JhcGgodXJsLCBib2R5LCBvcHRpb25zKTtcbiAgfVxuXG4gIHN0YXRpYyBnZXRHcmFwaCh1cmw6IHN0cmluZywgYm9keT8sIG9wdGlvbnM6IEh1bnRlck9wdGlvbnNUeXBlID0ge30pOiBQcm9taXNlPGFueT4ge1xuICAgIGNvbnN0IHtpc0ltbXV0YWJsZX0gPSBvcHRpb25zO1xuICAgIGNvbnN0IHtoZWFkZXJzLCB0b2tlbn0gPSBvcHRpb25zO1xuICAgIHVybCA9IHVybCA/IHVybC50cmltKCkgOiAnJztcbiAgICBjb25zdCBmb3JtYXRUb2tlbjogc3RyaW5nID0gKHRva2VuIHx8ICcnKS50cmltKCk7XG4gICAgY29uc3QgZm9ybWF0SGVhZGVyczogSGVhZGVycyA9IGhlYWRlcnMgfHwgbmV3IEhlYWRlcnMoeydDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vZ3JhcGhxbCd9KTtcblxuICAgIGlmIChmb3JtYXRUb2tlbiAhPT0gJycpIHtcbiAgICAgIGZvcm1hdEhlYWRlcnMuc2V0KCdBdXRob3JpemF0aW9uJywgYEJlYXJlciAke2Zvcm1hdFRva2VufWApO1xuICAgIH1cblxuICAgIHJldHVybiBmZXRjaCh1cmwsIHtib2R5LCBoZWFkZXJzOiBmb3JtYXRIZWFkZXJzLCBtZXRob2Q6ICdwb3N0J30pXG4gICAgICAudGhlbigocmVzcG9uc2U6IFJlc3BvbnNlKSA9PiB7XG4gICAgICAgIGNvbnN0IHJlZ2V4OiBSZWdFeHAgPSAvYXBwbGljYXRpb25cXC9qc29uL2k7XG4gICAgICAgIGNvbnN0IGlzSlNPTjogYm9vbGVhbiA9IHJlZ2V4LnRlc3QocmVzcG9uc2UuaGVhZGVycy5nZXQoJ0NvbnRlbnQtVHlwZScpIHx8ICcnKTtcblxuICAgICAgICBpZiAoaXNKU09OKSB7XG4gICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4ge2RhdGE6IHt9fTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgICAgaWYgKChlcnJvciB8fCB7fSkubWVzc2FnZSA9PT0gJ29ubHkgYWJzb2x1dGUgdXJscyBhcmUgc3VwcG9ydGVkJykge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgQXBpRXJyb3IoW3ttZXNzYWdlOiAnaW52YWxpZF91cmwnfV0sIGVycm9yKSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEFwaUVycm9yKFt7bWVzc2FnZTogJ25ldHdvcmtfZXJyb3InfV0sIGVycm9yKSk7XG4gICAgICB9KVxuICAgICAgLnRoZW4oKGpzb24pID0+IHtcbiAgICAgICAgaWYgKCFqc29uIHx8IGpzb24uZXJyb3JzKSB7XG4gICAgICAgICAgaWYgKCFqc29uKSB7XG4gICAgICAgICAgICBqc29uID0ge2Vycm9yczogW3ttZXNzYWdlOiAnYXBpX2Vycm9yJ31dfTtcbiAgICAgICAgICB9IGVsc2UgaWYgKChqc29uLmVycm9ycyB8fCBbXSkuc29tZSgobykgPT4gby5tZXNzYWdlID09PSAnTXVzdCBwcm92aWRlIHF1ZXJ5IHN0cmluZy4nKSkge1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBBcGlFcnJvcihbe21lc3NhZ2U6ICdyZXF1aXJlZF9xdWVyeSd9XSwgbmV3IEVycm9yKCkpKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEFwaUVycm9yKGpzb24uZXJyb3JzLCBuZXcgRXJyb3IoKSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IHJlc3VsdHMgPSBqc29uLmRhdGEgfHwge307XG4gICAgICAgICAgcmV0dXJuIGlzSW1tdXRhYmxlID8gSW1tdXRhYmxlLmZyb21KUyhyZXN1bHRzKSA6IHJlc3VsdHM7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAuY2F0Y2goKGVycm9yOiBBcGlFcnJvcikgPT4ge1xuICAgICAgICBpZiAoIWVycm9yLnNvdXJjZSkge1xuICAgICAgICAgIGVycm9yID0gbmV3IEFwaUVycm9yKFt7bWVzc2FnZTogJ25ldHdvcmtfZXJyb3InfV0sIGVycm9yKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChlcnJvcik7XG4gICAgICB9KTtcbiAgfVxuXG4gIHN0YXRpYyByZW1vdmVTcGFjZXMoc3RyOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBzdHIucmVwbGFjZSgvXFxzKyg/PSg/OlteJ1wiXSpbJ1wiXVteJ1wiXSpbJ1wiXSkqW14nXCJdKiQpL2dtLCAnJyk7XG4gIH1cbn1cbiJdfQ==