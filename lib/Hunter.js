Object.defineProperty(exports,'__esModule',{value:!0});var _createClass=function(){function defineProperties(target,props){for(var descriptor,i=0;i<props.length;i++)descriptor=props[i],descriptor.enumerable=descriptor.enumerable||!1,descriptor.configurable=!0,'value'in descriptor&&(descriptor.writable=!0),Object.defineProperty(target,descriptor.key,descriptor)}return function(Constructor,protoProps,staticProps){return protoProps&&defineProperties(Constructor.prototype,protoProps),staticProps&&defineProperties(Constructor,staticProps),Constructor}}();var _events=require('events'),_events2=_interopRequireDefault(_events),_immutable=require('immutable'),_immutable2=_interopRequireDefault(_immutable),_lodash=require('lodash'),_lodash2=_interopRequireDefault(_lodash),_APIError=require('./errors/APIError'),_APIError2=_interopRequireDefault(_APIError);



require('whatwg-fetch');function _interopRequireDefault(obj){return obj&&obj.__esModule?obj:{default:obj}}function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor))throw new TypeError('Cannot call a class as a function')}function _possibleConstructorReturn(self,call){if(!self)throw new ReferenceError('this hasn\'t been initialised - super() hasn\'t been called');return call&&('object'==typeof call||'function'==typeof call)?call:self}function _inherits(subClass,superClass){if('function'!=typeof superClass&&null!==superClass)throw new TypeError('Super expression must either be null or a function, not '+typeof superClass);subClass.prototype=Object.create(superClass&&superClass.prototype,{constructor:{value:subClass,enumerable:!1,writable:!0,configurable:!0}}),superClass&&(Object.setPrototypeOf?Object.setPrototypeOf(subClass,superClass):subClass.__proto__=superClass)}var






Hunter=function(_EventEmitter){






function Hunter(){return _classCallCheck(this,Hunter),_possibleConstructorReturn(this,(Hunter.__proto__||Object.getPrototypeOf(Hunter)).call(this));

}return _inherits(Hunter,_EventEmitter),_createClass(Hunter,[{key:'off',value:function off(

a,b){
this.removeListener(a,b);
}},{key:'get',value:function get(


a,b,c,d){
return this.ajax(a,'GET',b,c,d);
}},{key:'post',value:function post(

a,b,c,d){
return this.ajax(a,'POST',b,c,d);
}},{key:'put',value:function put(

a,b,c,d){
return this.ajax(a,'PUT',b,c,d);
}},{key:'del',value:function del(

a,b,c,d){
return this.ajax(a,'DELETE',b,c,d);
}},{key:'ajax',value:function ajax(

a,b,c,d,e){var _this2=this;
a=(a||'').trim(),
d=(d||'').trim(),


b=(b||'GET').toUpperCase(),


c&&'GET'===b?(
a=a+'?'+this.queryString(c),
c=null):
c&&(
c=JSON.stringify(c)),



''!==d&&(
e=e||{},
e.Authorization='Bearer '+d);





return fetch(a,{
method:b,
headers:e,
body:c}).

then(function(g){
var h=/application\/json/i,
i=h.test(g.headers.get('Content-Type')||'');return(

i?
g.json():

g.text());

}).
then(function(g){



return g;

}).
catch(function(g){







throw'only absolute urls are supported'===(g||{}).message&&(g=new _APIError2.default(_immutable2.default.fromJS([{message:'invalid_url'}]),g)),g=new _APIError2.default(_immutable2.default.fromJS([{message:'network_error'}]),g),_this2.emit('rip_hunter_error',g),g;
});
}},{key:'queryString',value:function queryString(

a){
return Object.keys(a).map(function(b){return encodeURIComponent(b)+'='+encodeURIComponent(a[b])}).join('&');
}},{key:'toGQL',value:function toGQL(


a){var _this3=this;
if(_immutable2.default.Iterable.isIterable(a))
return this.toGQL(a.toJS());

if(_lodash2.default.isString(a)||Array.isArray(a))
return JSON.stringify(a);

if(_lodash2.default.isObject(a)){
a=(0,_lodash2.default)(a).omit(_lodash2.default.isUndefined).omit(_lodash2.default.isNull).value();
var b=Object.keys(a),
c=[];

b.map(function(e){
var f=a[e];

if(_lodash2.default.isPlainObject(f))
c.push(_this3.toGQL(f));else

if(_lodash2.default.isArray(f)){
var g=f.map(function(h){
return _this3.toGQL(h);
});

c.push(e+': ['+g.join(', ')+']');
}else{
var _g=JSON.stringify(f);

_g&&
c.push(e+': '+_g);

}
});

var d=c.join(', ');return(

''===d?
'""':'{'+

c.join(', ')+'}');

}
return a;

}},{key:'query',value:function query(

a,b){var c=2<arguments.length&&void 0!==arguments[2]?arguments[2]:'',d=arguments[3];

return b='query '+b,this._getGraph(a,b,c,d);
}},{key:'mutation',value:function mutation(

a,b){var c=2<arguments.length&&void 0!==arguments[2]?arguments[2]:'',d=arguments[3];

return b='mutation '+b,this._getGraph(a,b,c,d);
}},{key:'_getGraph',value:function _getGraph(

a,b){var _this4=this,c=2<arguments.length&&void 0!==arguments[2]?arguments[2]:'',d=arguments[3];
















return a=a?a.trim():'',c=c||'',d=d?{}:{'Content-Type':'application/graphql','Cache-Control':'no-cache'},''!==c&&(d.Authorization='Bearer '+c),fetch(a,{
method:'post',
headers:d,
body:b}).

then(function(e){
var f=/application\/json/i,
g=f.test(e.headers.get('Content-Type')||'');return(

g?
e.json():

{data:{}});

}).
catch(function(e){
if('only absolute urls are supported'===(e||{}).message)
throw new _APIError2.default(_immutable2.default.fromJS([{message:'invalid_url'}]),e);


throw new _APIError2.default(_immutable2.default.fromJS([{message:'network_error'}]),e);
}).
then(function(e){
if(!e||e.errors){
if(!e)
e={errors:[{message:'api_error'}]};else

if((e.errors||[]).some(function(f){return'Must provide query string.'===f.message}))
throw new _APIError2.default(_immutable2.default.fromJS([{message:'required_query'}]),new Error());


throw new _APIError2.default(_immutable2.default.fromJS(e.errors),new Error());
}else
return _immutable2.default.fromJS(e.data||{});

}).
catch(function(e){





throw e.source||(e=new _APIError2.default(_immutable2.default.fromJS([{message:'network_error'}]),e)),_this4.emit('rip_hunter_error',e),e;
});
}}]),Hunter}(_events2.default);


var hunter=new Hunter;exports.default=
hunter;