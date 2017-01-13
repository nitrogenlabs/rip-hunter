Object.defineProperty(exports,'__esModule',{value:!0});var _immutable=require('immutable');function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor))throw new TypeError('Cannot call a class as a function')}function _possibleConstructorReturn(self,call){if(!self)throw new ReferenceError('this hasn\'t been initialised - super() hasn\'t been called');return call&&('object'==typeof call||'function'==typeof call)?call:self}function _inherits(subClass,superClass){if('function'!=typeof superClass&&null!==superClass)throw new TypeError('Super expression must either be null or a function, not '+typeof superClass);subClass.prototype=Object.create(superClass&&superClass.prototype,{constructor:{value:subClass,enumerable:!1,writable:!0,configurable:!0}}),superClass&&(Object.setPrototypeOf?Object.setPrototypeOf(subClass,superClass):subClass.__proto__=superClass)}var

APIError=function(_Error){
function APIError(a,b){_classCallCheck(this,APIError);var _this=_possibleConstructorReturn(this,(APIError.__proto__||Object.getPrototypeOf(APIError)).call(this,
'API Error'));return(

_this.errors=a?a.map(function(c){return c.get('message')}):(0,_immutable.List)(),_this.source=b,_this.errors=a?a.map(function(c){return c.get('message')}):(0,_immutable.List)(),_this);
}return _inherits(APIError,_Error),APIError}(Error);exports.default=APIError;